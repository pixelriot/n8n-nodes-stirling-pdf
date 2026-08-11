import type { INodeProperties } from 'n8n-workflow';

/** The n8n binary property holding the file to upload as `fileInput`. */
export const inputDataField: INodeProperties = {
	displayName: 'Input Data Field Name',
	name: 'inputDataFieldName',
	type: 'string',
	default: 'data',
	required: true,
	description: 'Name of the input binary field that contains the file to send',
};

/** The n8n binary property to write the (binary) response into. */
export const outputDataField: INodeProperties = {
	displayName: 'Output Data Field Name',
	name: 'outputDataFieldName',
	type: 'string',
	default: 'data',
	required: true,
	description: 'Name of the output binary field to store the processed file in',
};
