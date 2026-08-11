import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { returnBinary, sendPdfAsMultipart } from './binary';

type PreSend = (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) => Promise<IHttpRequestOptions>;

/**
 * Routing for "upload a file, get a binary file back" operations: sends
 * multipart/form-data and reads the raw bytes of the response into an n8n
 * binary property (with a proper fileName).
 */
export const binaryRouting = (url: string, preSend: PreSend = sendPdfAsMultipart) => ({
	request: {
		method: 'POST' as const,
		url,
		encoding: 'arraybuffer' as const,
	},
	send: {
		preSend: [preSend],
	},
	output: {
		postReceive: [returnBinary],
	},
});

/**
 * Routing for "upload a file, get JSON back" operations (analysis / info /
 * form-field inspection). No `encoding` or `postReceive`, so n8n parses the
 * JSON response into the item's `json`.
 */
export const jsonRouting = (url: string, preSend: PreSend = sendPdfAsMultipart) => ({
	request: {
		method: 'POST' as const,
		url,
	},
	send: {
		preSend: [preSend],
	},
});
