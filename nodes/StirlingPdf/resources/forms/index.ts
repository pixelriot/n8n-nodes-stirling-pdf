import type { INodeProperties } from 'n8n-workflow';
import { inputDataField, outputDataField } from '../../shared/descriptions';
import { sendFormFileAsMultipart } from '../../shared/binary';
import { binaryRouting, jsonRouting } from '../../shared/routing';

const forForms = { resource: ['forms'] };

// Forms endpoints upload the PDF under the `file` field, and the inspection
// operations return JSON rather than a binary file.
const jsonOps = ['getFields', 'getFieldsWithCoordinates'];

export const formsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forForms },
		options: [
			{
				name: 'Fill',
				value: 'fill',
				action: 'Fill a PDF form',
				description: 'Fill form fields from a set of field/value pairs',
				routing: binaryRouting('/api/v1/form/fill', sendFormFileAsMultipart),
			},
			{
				name: 'Get Fields',
				value: 'getFields',
				action: 'Get form fields from a PDF',
				description: 'Inspect the form fields present in a PDF',
				routing: jsonRouting('/api/v1/form/fields', sendFormFileAsMultipart),
			},
			{
				name: 'Get Fields With Coordinates',
				value: 'getFieldsWithCoordinates',
				action: 'Get form fields with coordinates',
				description: 'Inspect form fields including their widget coordinates',
				routing: jsonRouting('/api/v1/form/fields-with-coordinates', sendFormFileAsMultipart),
			},
		],
		default: 'getFields',
	},

	{
		...inputDataField,
		displayOptions: { show: forForms },
	},
	{
		...outputDataField,
		displayOptions: { show: forForms, hide: { operation: jsonOps } },
	},

	// --- Fill ---
	{
		displayName: 'Field Values (JSON)',
		name: 'data',
		type: 'json',
		default: '{}',
		displayOptions: { show: { resource: ['forms'], operation: ['fill'] } },
		placeholder: 'e.g. { "fullName": "Jane Doe", "agree": true }',
		description: 'A JSON object of form field names to the values to fill them with',
		routing: { send: { type: 'body', property: 'data' } },
	},
];
