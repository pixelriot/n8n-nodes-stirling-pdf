import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
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

/** Map a response mime type to a sensible file extension. */
function extensionForMimeType(mimeType: string): string {
	const map: Record<string, string> = {
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
	if (map[mimeType]) return map[mimeType];
	// Fallback: last segment of the subtype, e.g. application/epub+zip -> zip.
	const subtype = mimeType.split('/')[1] ?? 'bin';
	return subtype.split('+').pop()!.split(';')[0] || 'bin';
}

/**
 * postReceive: turn a binary response (PDF / image / ZIP) into an n8n binary
 * property. Pair with `routing.request.encoding: 'arraybuffer'` on the operation
 * so the response body arrives as raw bytes rather than parsed JSON.
 *
 * The output binary is given a fileName (derived from the input file's base name
 * plus the response's extension) so n8n shows it with a Download button and later
 * nodes can reference it.
 */
export async function returnBinary(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const outputField = this.getNodeParameter('outputDataFieldName', 'data') as string;
	const mimeType =
		((response.headers?.['content-type'] as string) ?? '').split(';')[0].trim() ||
		'application/pdf';
	const extension = extensionForMimeType(mimeType);

	// Base the output name on the input file when there is one (binary mode);
	// fall back to "output" for text-input operations (which have no input binary).
	let baseName = 'output';
	const inputField = this.getNodeParameter('inputDataFieldName', '') as string;
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
