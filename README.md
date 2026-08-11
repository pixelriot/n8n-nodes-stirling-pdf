# n8n-nodes-stirling-pdf

An [n8n](https://n8n.io/) community node for [Stirling PDF](https://www.stirlingpdf.com/) — a powerful, self‑hostable toolkit for manipulating PDFs. This node lets your workflows convert, compress, OCR, watermark, redact, sign, inspect and fill PDFs by calling your own Stirling PDF instance.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Usage](#usage)
- [Supported operations](#supported-operations)
- [Notes & limitations](#notes--limitations)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

### From the n8n UI (self‑hosted)

1. In n8n, go to **Settings → Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-stirling-pdf` and confirm.

See the n8n [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

### Manually

```bash
npm install n8n-nodes-stirling-pdf
```

## Credentials

This node talks to **your** Stirling PDF instance, so you need two things:

| Field | Description |
| --- | --- |
| **Base URL** | The root URL of your Stirling PDF instance, without a trailing slash — e.g. `https://stirling.example.com`. |
| **API Key** | Sent as the `X-API-KEY` header on every request. |

To obtain an API key, enable authentication on your Stirling PDF instance and copy the key from your account settings (**Account settings → API key**). See the [Stirling PDF API documentation](https://docs.stirlingpdf.com/API) for how to enable and manage keys.

The credential test calls the public `GET /api/v1/info/status` endpoint to confirm the Base URL points at a reachable Stirling instance.

## Usage

Every operation reads a file from an **input binary property** and (for most operations) writes the result to an **output binary property**:

- **Input Data Field Name** — the name of the incoming binary property that holds the file to process (default `data`).
- **Output Data Field Name** — the name of the binary property to write the result to (default `data`).

The result is a proper binary item with a filename, so it shows a **Download** button in the editor and can be passed straight to downstream nodes (e.g. *Write Files From Disk*, *Send Email* attachment, *Google Drive*, or another Stirling PDF step). Inspection operations (Analysis, Get Fields, Get Info, Validate Signature) return **JSON** instead of a binary file.

**HTML → PDF** and **Markdown → PDF** additionally accept a raw **text string** instead of a file — switch the *Input Type* to *Text* and paste the markup directly.

## Supported operations

### Convert
- File to PDF (via LibreOffice)
- HTML to PDF *(binary file or text string)*
- Markdown to PDF *(binary file or text string)*
- Image to PDF
- eBook to PDF
- EML to PDF
- PDF to CSV
- PDF to HTML
- PDF to Image
- PDF to Markdown
- PDF to PDF/A
- PDF to Text
- PDF to Word
- PDF to XML

### Security
- Add Password
- Remove Password
- Add Watermark *(text or image)*
- Auto Redact
- Redact
- Sanitize
- Get PDF Info *(JSON)*
- Timestamp
- Sign With Certificate
- Remove Certificate Signature
- Validate Signature *(JSON)*

### Forms
- Fill
- Get Fields *(JSON)*
- Get Fields With Coordinates *(JSON)*

### Analysis *(JSON)*
- Get Basic Info
- Get Form Fields
- Get Security Info

### Misc
- Compress
- Extract Images
- OCR
- Add Stamp *(text or image)*

## Notes & limitations

- **This node targets the Stirling PDF "Processing" API** (`/api/v1/...`). It is built from the OpenAPI spec bundled in [`docs/stirling-pdf-api.json`](docs/stirling-pdf-api.json) (Stirling PDF v2.14.2).
- **Some features are instance‑dependent.** Endpoints such as OCR (needs Tesseract language packs), Timestamp (needs outbound access to a Time Stamp Authority), and certificate signing/validation may be **disabled or unavailable** depending on how your Stirling PDF instance is configured. In that case the API returns an error even though the node is calling it correctly.
- **URL → PDF is not included** because the upstream endpoint is currently unreliable in API mode.

## Compatibility

Requires **n8n 1.60.0** or later.

## Resources

- [Stirling PDF website](https://www.stirlingpdf.com/)
- [Stirling PDF documentation](https://docs.stirlingpdf.com/)
- [Stirling PDF API documentation](https://docs.stirlingpdf.com/API)
- [Stirling PDF on GitHub](https://github.com/Stirling-Tools/Stirling-PDF)
- [Bundled OpenAPI spec](docs/stirling-pdf-api.json)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE)
