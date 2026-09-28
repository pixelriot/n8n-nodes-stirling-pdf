import {
	NodeOperationError,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

// --- Internal building blocks -------------------------------------------------
//
// Nearly every Stirling PDF endpoint is `POST multipart/form-data` with one or
// more file parts plus scalar options. Parameters declared with
// `routing.send.type: 'body'` accumulate on `requestOptions.body` as a plain
// object; the preSend functions below move them into a FormData and attach the
// file part(s) read from the item's binary properties.

/** Move accumulated scalar body params onto a FormData. */
function appendScalars(formData: FormData, body: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined || value === null || value === '') continue;
		formData.append(key, typeof value === 'string' ? value : String(value));
	}
}

/** Start a FormData seeded with the request's scalar body params. */
function baseFormData(requestOptions: IHttpRequestOptions): FormData {
	const formData = new FormData();
	appendScalars(formData, (requestOptions.body ?? {}) as Record<string, unknown>);
	return formData;
}

/** Let the HTTP client generate the multipart boundary header itself. */
function stripContentType(requestOptions: IHttpRequestOptions): void {
	if (requestOptions.headers) {
		delete requestOptions.headers['Content-Type'];
		delete requestOptions.headers['content-type'];
	}
}

/** Append the primary input file (from the `inputDataFieldName` binary property). */
async function appendPrimaryFile(
	ctx: IExecuteSingleFunctions,
	formData: FormData,
	formField = 'fileInput',
	fallbackName = 'file.pdf',
	fallbackMime = 'application/pdf',
): Promise<void> {
	const inputField = ctx.getNodeParameter('inputDataFieldName', 'data') as string;
	const binaryData = ctx.helpers.assertBinaryData(inputField);
	const buffer = await ctx.helpers.getBinaryDataBuffer(inputField);
	formData.append(
		formField,
		new Blob([buffer], { type: binaryData.mimeType || fallbackMime }),
		binaryData.fileName || fallbackName,
	);
}

/**
 * The binary property names listed in the comma-separated `inputDataFieldNames`
 * parameter, in the order given (used by operations that take several files).
 */
function inputFieldNames(ctx: IExecuteSingleFunctions): string[] {
	const raw = ctx.getNodeParameter('inputDataFieldNames', '') as string;
	return raw
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name !== '');
}

/**
 * Append an optional secondary file whose source binary property name is held in
 * the node parameter `paramName`. No-op when the parameter is empty.
 */
async function appendFileFromParam(
	ctx: IExecuteSingleFunctions,
	formData: FormData,
	formField: string,
	paramName: string,
): Promise<void> {
	const field = ctx.getNodeParameter(paramName, '') as string;
	if (!field) return;
	const binaryData = ctx.helpers.assertBinaryData(field);
	const buffer = await ctx.helpers.getBinaryDataBuffer(field);
	formData.append(
		formField,
		new Blob([buffer], { type: binaryData.mimeType || 'application/octet-stream' }),
		binaryData.fileName || formField,
	);
}

// --- preSend functions --------------------------------------------------------

/** preSend: upload the primary file as `fileInput` (the common case). */
export async function sendPdfAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const formData = baseFormData(requestOptions);
	await appendPrimaryFile(this, formData, 'fileInput');
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/**
 * preSend: upload every file named in `inputDataFieldNames` as a repeated
 * `fileInput` part, in the order listed (e.g. Merge). The order matters: with
 * the "order provided" sort type it is the page order of the result.
 */
export async function sendFilesAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const names = inputFieldNames(this);
	if (names.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No input data field names given', {
			description: 'Enter the binary fields to send, separated by commas, e.g. "data, data_1"',
		});
	}
	const formData = baseFormData(requestOptions);
	for (const name of names) {
		const binaryData = this.helpers.assertBinaryData(name);
		const buffer = await this.helpers.getBinaryDataBuffer(name);
		formData.append(
			'fileInput',
			new Blob([buffer], { type: binaryData.mimeType || 'application/pdf' }),
			binaryData.fileName || `${name}.pdf`,
		);
	}
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/** preSend: upload the primary file under the `file` field (Forms endpoints). */
export async function sendFormFileAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const formData = baseFormData(requestOptions);
	await appendPrimaryFile(this, formData, 'file');
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/** preSend: `fileInput` + optional `stampImage` (when stamping with an image). */
export async function sendStampAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const formData = baseFormData(requestOptions);
	await appendPrimaryFile(this, formData, 'fileInput');
	await appendFileFromParam(this, formData, 'stampImage', 'stampImageFieldName');
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/** preSend: `fileInput` + optional `watermarkImage` (when watermarking with an image). */
export async function sendWatermarkAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const formData = baseFormData(requestOptions);
	await appendPrimaryFile(this, formData, 'fileInput');
	await appendFileFromParam(this, formData, 'watermarkImage', 'watermarkImageFieldName');
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/** preSend: `fileInput` + optional `certFile` (validate signature against a cert). */
export async function sendValidateSignatureAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const formData = baseFormData(requestOptions);
	await appendPrimaryFile(this, formData, 'fileInput');
	await appendFileFromParam(this, formData, 'certFile', 'certFieldName');
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/** preSend: `fileInput` + whichever certificate/key files were provided (cert-sign). */
export async function sendCertSignAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const formData = baseFormData(requestOptions);
	await appendPrimaryFile(this, formData, 'fileInput');
	await appendFileFromParam(this, formData, 'privateKeyFile', 'privateKeyFieldName');
	await appendFileFromParam(this, formData, 'certFile', 'certFieldName');
	await appendFileFromParam(this, formData, 'p12File', 'p12FieldName');
	await appendFileFromParam(this, formData, 'jksFile', 'jksFieldName');
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/**
 * Shared impl for endpoints whose `fileInput` can come from either an item's
 * binary property or a raw text parameter (e.g. HTML / Markdown → PDF). The
 * operation exposes an `inputMode` selector ('binary' | 'text') and, in text
 * mode, a `textContent` string parameter.
 */
async function sendTextOrBinary(
	ctx: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	fileName: string,
	mimeType: string,
): Promise<IHttpRequestOptions> {
	const formData = baseFormData(requestOptions);
	const mode = ctx.getNodeParameter('inputMode', 'binary') as string;
	if (mode === 'text') {
		const text = ctx.getNodeParameter('textContent', '') as string;
		formData.append('fileInput', new Blob([text], { type: mimeType }), fileName);
	} else {
		await appendPrimaryFile(ctx, formData, 'fileInput', fileName, mimeType);
	}
	requestOptions.body = formData;
	stripContentType(requestOptions);
	return requestOptions;
}

/** preSend for HTML → PDF: accepts an HTML file OR an HTML string. */
export async function sendHtmlOrBinary(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return sendTextOrBinary(this, requestOptions, 'input.html', 'text/html');
}

/** preSend for Markdown → PDF: accepts a Markdown file OR a Markdown string. */
export async function sendMarkdownOrBinary(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return sendTextOrBinary(this, requestOptions, 'input.md', 'text/markdown');
}

/**
 * preSend for endpoints that take only scalar fields (no file upload), e.g.
 * URL → PDF. Sends the accumulated body params as multipart/form-data.
 */
export async function sendFieldsAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = baseFormData(requestOptions);
	stripContentType(requestOptions);
	return requestOptions;
}

// --- postReceive --------------------------------------------------------------

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
	'application/pdf': 'pdf',
	'application/zip': 'zip',
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'text/plain': 'txt',
	'text/csv': 'csv',
	'text/markdown': 'md',
	'text/html': 'html',
	'application/xml': 'xml',
	'application/json': 'json',
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
	...Object.fromEntries(Object.entries(EXTENSION_BY_MIME_TYPE).map(([mime, ext]) => [ext, mime])),
	jpeg: 'image/jpeg',
};

/** Content types that say nothing about the file, e.g. what Stirling sends for ZIPs. */
const GENERIC_MIME_TYPES = new Set(['application/octet-stream', 'binary/octet-stream']);

/** Map a response mime type to a sensible file extension. */
function extensionForMimeType(mimeType: string): string {
	if (EXTENSION_BY_MIME_TYPE[mimeType]) return EXTENSION_BY_MIME_TYPE[mimeType];
	// Fallback: last segment of the subtype, e.g. application/epub+zip -> zip.
	const subtype = mimeType.split('/')[1] ?? 'bin';
	return subtype.split('+').pop()!.split(';')[0] || 'bin';
}

/**
 * The file name from a `Content-Disposition` header, if it has one. Prefers the
 * RFC 5987 form (`filename*=UTF-8''…`), which is how non-ASCII names arrive.
 */
function fileNameFromContentDisposition(header: unknown): string | undefined {
	if (typeof header !== 'string') return undefined;
	const encoded = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(header);
	if (encoded) {
		try {
			return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''));
		} catch {
			// Malformed percent-encoding — fall back to the plain form below.
		}
	}
	const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
	return plain?.[1].trim() || undefined;
}

/** Lower-case extension of a file name without the dot, or undefined. */
function extensionOf(fileName: string | undefined): string | undefined {
	const match = fileName ? /\.([A-Za-z0-9]+)$/.exec(fileName) : null;
	return match ? match[1].toLowerCase() : undefined;
}

/**
 * The type of a file as told by its first bytes, for the formats Stirling
 * returns. Only consulted when neither the content type nor the file name in
 * `Content-Disposition` says what came back.
 */
function mimeTypeFromContent(body: unknown): string | undefined {
	const bytes =
		body instanceof Uint8Array ? body : body instanceof ArrayBuffer ? new Uint8Array(body) : null;
	if (!bytes) return undefined;
	const startsWith = (...signature: number[]) =>
		bytes.length >= signature.length && signature.every((byte, i) => bytes[i] === byte);
	const at = (offset: number, ...signature: number[]) =>
		bytes.length >= offset + signature.length &&
		signature.every((byte, i) => bytes[offset + i] === byte);

	// PK\x03\x04 (local file), PK\x05\x06 (empty archive), PK\x07\x08 (spanned)
	if (startsWith(0x50, 0x4b) && (at(2, 0x03, 0x04) || at(2, 0x05, 0x06) || at(2, 0x07, 0x08)))
		return 'application/zip';
	if (startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf'; // %PDF-
	if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
	if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
	if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'image/gif'; // GIF8
	if (startsWith(0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'; // RIFF….WEBP
	return undefined;
}

/**
 * Content type and extension of a binary response.
 *
 * A concrete content type from the server is kept. A generic one (or none) is
 * resolved from the file name in `Content-Disposition`, then from the file's
 * first bytes; only when both say nothing does the old behaviour remain.
 *
 * A file name wins over the bytes even when its extension is not in the table:
 * DOCX, XLSX and ODT files are ZIP archives inside, and sniffing would rename
 * `report.docx` to `.zip`.
 */
function resolveFileType(
	headers: IN8nHttpFullResponse['headers'],
	body: unknown,
): { mimeType: string; extension: string } {
	const declared = ((headers?.['content-type'] as string) ?? '').split(';')[0].trim().toLowerCase();
	const headerExtension = extensionOf(
		fileNameFromContentDisposition(headers?.['content-disposition']),
	);

	if (declared && !GENERIC_MIME_TYPES.has(declared)) {
		return { mimeType: declared, extension: headerExtension ?? extensionForMimeType(declared) };
	}
	if (headerExtension) {
		return {
			mimeType: MIME_TYPE_BY_EXTENSION[headerExtension] ?? (declared || 'application/octet-stream'),
			extension: headerExtension,
		};
	}
	const sniffed = mimeTypeFromContent(body);
	if (sniffed) {
		return { mimeType: sniffed, extension: extensionForMimeType(sniffed) };
	}
	const fallback = declared || 'application/pdf';
	return { mimeType: fallback, extension: extensionForMimeType(fallback) };
}

/** The binary property of the (first) input file, for naming the output. */
function primaryInputField(ctx: IExecuteSingleFunctions): string {
	const single = ctx.getNodeParameter('inputDataFieldName', '') as string;
	return single || (inputFieldNames(ctx)[0] ?? '');
}

/**
 * postReceive: turn a binary response (PDF / image / ZIP) into an n8n binary
 * property. Pair with `routing.request.encoding: 'arraybuffer'` on the operation
 * so the response body arrives as raw bytes rather than parsed JSON.
 *
 * The output binary is given a fileName (derived from the input file's base name
 * plus the response's extension) so n8n shows it with a Download button and later
 * nodes can reference it.
 *
 * Stirling returns ZIPs as `application/octet-stream`; named after that type they
 * became `.octet-stream` files that the Compression node refuses to unpack. So a
 * generic content type is resolved from the `Content-Disposition` file name, then
 * from the file's first bytes (see `resolveFileType`).
 */
export async function returnBinary(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const outputField = this.getNodeParameter('outputDataFieldName', 'data') as string;
	const { mimeType, extension } = resolveFileType(response.headers, response.body);

	// Base the output name on the input file when there is one (binary mode);
	// fall back to "output" for text-input operations (which have no input binary).
	let baseName = 'output';
	const inputField = primaryInputField(this);
	if (inputField) {
		try {
			const inputBinary = this.helpers.assertBinaryData(inputField);
			if (inputBinary?.fileName) {
				baseName = inputBinary.fileName.replace(/\.[^./\\]+$/, '') || baseName;
			}
		} catch {
			// No input binary (e.g. text-input mode) — keep the default base name.
		}
	}

	const binary = await this.helpers.prepareBinaryData(
		response.body as Buffer,
		`${baseName}.${extension}`,
		mimeType,
	);
	return [{ json: {}, binary: { [outputField]: binary } }];
}
