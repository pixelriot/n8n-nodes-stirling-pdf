# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

An n8n **community node** that wraps the Stirling PDF "Processing" REST API (self-hostable PDF tools: convert, merge/split, compress, OCR, redact, sign, watermark, form-fill, etc.). Package name: `n8n-nodes-stirling-pdf`.

Status: **scaffolded (declarative style), lint + build + cloud-support green.** Built from the `declarative/github-issues` CLI template, then adapted. Invoke the `n8n-node-builder:building-n8n-nodes` skill before writing node code — it is the source of truth for the toolchain, lint rules, and validation gates. The scaffold also shipped `AGENTS.md` and `.agents/*.md` (n8n's own declarative/credentials/versioning reference docs) — consult `.agents/nodes-declarative.md` for routing/preSend/postReceive specifics.

### Implemented so far
- **Credential** `StirlingPdfApi` — Base URL + API key (`X-API-KEY` header). Test hits the public `GET /api/v1/info/status`.
- **Resources/operations:** Convert (File, HTML, Markdown, Image, eBook, EML → PDF), Analysis (Get Basic Info), Misc (Compress). Each new op = a file under `nodes/StirlingPdf/resources/<resource>/` spread into the node's `properties`.
  - Curl-verified against the live instance: File, HTML, Markdown, Image, EML → valid PDF. eBook accepts the request (needs a real EPUB to fully confirm). **URL→PDF was deliberately dropped** — the instance 500s with "No current ServletRequestAttributes" for every URL (a Stirling async-job bug); re-add once confirmed working somewhere. The no-file `sendFieldsAsMultipart` helper remains in `shared/binary.ts` for when it (or other no-file endpoints) is wired.
  - **Not yet run inside n8n (Gate 4):** the `preSend`/`postReceive` code path is unproven at runtime — curl validates the API, not the node's TS execution.
- **Shared binary pattern** (`nodes/StirlingPdf/shared/binary.ts`) — every op reuses `sendPdfAsMultipart` (preSend: builds a `FormData`, attaches the item's binary as `fileInput`, moves `routing.send` body params to form fields) and, for binary responses, `returnBinary` (postReceive) paired with `routing.request.encoding: 'arraybuffer'`. This is the template for the remaining ~110 endpoints.

### Verified runtime facts (tested against the plat4mation demo instance)
- `fileInput` is the multipart field; `File→PDF` and `HTML→PDF` (with `zoom`) return valid `%PDF` bytes.
- The demo host sits behind a WAF that **403s any User-Agent containing `curl`** (this also blocks `curl` downloads of the spec — use `-A "Mozilla/5.0"`). n8n/axios UA passes fine, so the node needs **no** custom User-Agent.
- The API validates the key (401 on bad key) on protected endpoints, but every protected GET either needs path params or is "disabled" (403) — hence the credential test uses the public `/info/status` for reachability only.
- In declarative `preSend`/`postReceive` the context is `IExecuteSingleFunctions`: binary helpers are **single-arg** (`assertBinaryData(field)`, `getBinaryDataBuffer(field)`) — no itemIndex. `usableAsTool` must be `true`/object/omitted (the type rejects `false`).

## The API spec (docs/stirling-pdf-api.json)

This file *is* the contract for the whole node — every Resource/Operation/parameter should be derived from it, not guessed.

- **OpenAPI 3.0.3**, "Stirling PDF - Processing API", v2.14.2, **115 endpoints**.
- **Auth:** API key in the `X-API-KEY` header (`components.securitySchemes.apiKey`). Global security requirement.
- **Every endpoint is `POST` with `multipart/form-data`.** Request schemas are `$ref`s into `components.schemas` — resolve the ref to see the fields.
- **Primary file field is `fileInput`** (78 endpoints) or `file` (8, mostly analysis/extract). Secondary file fields exist for specific ops: `certFile`, `p12File`, `jksFile`, `privateKeyFile`, `watermarkImage`, `stampImage`, `imageFile`, `attachments`, `overlayFiles`.
- **Responses are mostly binary:** `application/pdf` (50), `application/zip` (12, split/multi-file ops), `image/png`/`image/jpeg` (22, render ops), plus `application/json` (9, analysis/info ops) and a little `text/csv|markdown|plain`. Many are declared `*/*` — inspect per-endpoint.
- The server is **instance-hosted** (`servers: [{ url: "/" }]`). The base URL is the user's own Stirling PDF instance (the plat4mation demo host is just one). The n8n credential must therefore capture **both base URL and API key**.

Categories (the `tags`) map naturally onto n8n **Resources**:

| Resource (tag) | # | Notes |
|---|---|---|
| Convert | 32 | `pdf/*` and `*/pdf`; some are multi-step (`text-editor`) with `{jobId}` path params |
| Misc | 24 | compress, ocr, flatten, stamp, page-numbers, attachments, metadata |
| General | 19 | merge, split, rotate, crop, rearrange, layout |
| Security | 16 | password, watermark, redact, cert-sign, sanitize, verify |
| Analysis | 8 | JSON responses (basic-info, page-count, form-fields, …) |
| Forms | 7 | fill, extract, modify fields |
| Filter | 6 | pass/reject a PDF by size/text/rotation |
| AI Tools | 2 | math-auditor, pdf-comment agents |
| Pipeline | 1 | `handleData` |

**Refreshing the spec:** the host 403s without a browser User-Agent. Re-download with:
```bash
curl -sSL "https://pdftools.plat4mation.com/v1/api-docs/file-processing" \
  -H "User-Agent: Mozilla/5.0" -H "Accept: application/json" -o docs/stirling-pdf-api.json
```

## Toolchain & commands

n8n-node CLI, TypeScript. **There is no unit-test runner** — CI is exactly lint + build; behavior is proven by running a local n8n (Gate 4). Do not add a jest/vitest harness.

```bash
# scaffold (once): declarative REST template
npm create @n8n/node@latest n8n-nodes-stirling-pdf -- --template declarative/custom

npm run lint          # @n8n/eslint-plugin-community-nodes (strict); never edit eslint.config.mjs
npm run lint:fix
npm run build         # strict tsc + asset copy → dist/
npx n8n-node cloud-support   # must print "Cloud support is ENABLED"
npm run dev           # local n8n at http://localhost:5678 — smoke-test the node end to end
npm run release       # release-it: gates + tag; publish happens in GitHub Actions (npm provenance), not locally
```

Validate in order and don't proceed past a failure: **lint → build → cloud-support → runtime**. Full pass criteria live in the skill's `references/validation.md`.

## Architecture notes specific to this integration

- **Declarative vs programmatic is the key upfront decision.** The API is a REST wrapper, which normally means declarative. But *nearly every operation takes binary in and returns binary out*, and there are 115 of them. Declarative can do this (`preSend` builds `FormData`, `postReceive` handles the binary response), but for this volume a **programmatic node with a shared `GenericFunctions.ts`** request helper is often cleaner. Resolve this by brainstorming before scaffolding rather than defaulting.
- **Binary in/out is the core data-flow concern.** Read the input PDF from an n8n binary property, send it as the `fileInput`/`file` multipart part, and write the (usually binary) response back to an n8n binary property. Follow the verification naming convention: **"Input Data Field Name" / "Output Data Field Name"** (never "binary property"). Analysis endpoints are the exception — they return JSON.
- **Credential shape:** base URL + API key. Inject the key via `authenticate` (header `X-API-KEY: ={{$credentials.apiKey}}`), and use the base URL in `requestDefaults.baseURL`. A lightweight endpoint (e.g. an Analysis `GET`-free info call, or just reaching the instance) can back the credential `test`.
- **Cloud-eligibility constrains dependencies:** no runtime HTTP libraries (no axios/form-data). Use `this.helpers.httpRequestWithAuthentication` and the global `FormData`. The lint allowlist is narrow (`n8n-workflow`, `lodash`, `luxon`, `zod`, `crypto`, …).
- **Don't try to expose all 115 endpoints at once.** Model one Resource (tag) at a time, mapping each endpoint to an Operation and each resolved multipart field to a parameter. Use the `returnAll`/`limit` pattern only where a response is a list; most ops here are single-file transforms.

## Conventions to hold to (enforced by lint / verification)

- Resource → Operation UI pattern; `noDataExpression: true` on both selectors; an `action` string on every operation.
- Name list ops **"Get Many"** (value `getAll`), not "Get All".
- `NodeConnectionTypes.Main` (plural const, value import) — never the string `'main'`.
- Declare `usableAsTool` on the node (these PDF tools make good AI-agent tools — default `true`).
- Every placeholder starts with `e.g. `; error messages say what happened and how to fix it and never contain the words "error/problem/failure/mistake".
