import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';

/**
 * preSend: repackage the request as multipart/form-data.
 *
 * Nearly every Stirling PDF endpoint is `POST multipart/form-data` with the PDF
 * in the `fileInput` part plus assorted scalar options. Parameters declared with
 * `routing.send.type: 'body'` land on `requestOptions.body` as a plain object;
 * here we move them into a FormData and attach the binary file from the item.
 */
export async function sendPdfAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const inputField = this.getNodeParameter('inputDataFieldName', 'data') as string;

	const binaryData = this.helpers.assertBinaryData(inputField);
	const buffer = await this.helpers.getBinaryDataBuffer(inputField);

	const formData = new FormData();
	const body = (requestOptions.body ?? {}) as Record<string, unknown>;
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined || value === null || value === '') continue;
		formData.append(key, typeof value === 'string' ? value : String(value));
	}
	formData.append(
		'fileInput',
		new Blob([buffer], { type: binaryData.mimeType || 'application/pdf' }),
		binaryData.fileName || 'file.pdf',
	);

	requestOptions.body = formData;
	// Let the HTTP client generate the multipart boundary header itself.
	if (requestOptions.headers) {
		delete requestOptions.headers['Content-Type'];
		delete requestOptions.headers['content-type'];
	}
	return requestOptions;
}

/**
 * preSend for endpoints that take only scalar fields (no file upload), e.g.
 * URL → PDF. Moves the accumulated `routing.send` body params into a FormData so
 * the request is sent as multipart/form-data like the rest of the API expects.
 */
export async function sendFieldsAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const formData = new FormData();
	const body = (requestOptions.body ?? {}) as Record<string, unknown>;
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined || value === null || value === '') continue;
		formData.append(key, typeof value === 'string' ? value : String(value));
	}

	requestOptions.body = formData;
	if (requestOptions.headers) {
		delete requestOptions.headers['Content-Type'];
		delete requestOptions.headers['content-type'];
	}
	return requestOptions;
}

/**
 * postReceive: turn a binary response (PDF / image / ZIP) into an n8n binary
 * property. Pair with `routing.request.encoding: 'arraybuffer'` on the operation
 * so the response body arrives as raw bytes rather than parsed JSON.
 */
export async function returnBinary(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const outputField = this.getNodeParameter('outputDataFieldName', 'data') as string;
	const mimeType =
		((response.headers?.['content-type'] as string) ?? '').split(';')[0] || 'application/pdf';
	const binary = await this.helpers.prepareBinaryData(
		response.body as Buffer,
		undefined,
		mimeType,
	);
	return [{ json: {}, binary: { [outputField]: binary } }];
}
