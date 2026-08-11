import type { INodeProperties } from 'n8n-workflow';
import { inputDataField, outputDataField } from '../../shared/descriptions';
import { returnBinary, sendPdfAsMultipart } from '../../shared/binary';

const showOnlyForMisc = {
	resource: ['misc'],
};

const showOnlyForCompress = {
	resource: ['misc'],
	operation: ['compress'],
};

export const miscDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForMisc },
		options: [
			{
				name: 'Compress',
				value: 'compress',
				action: 'Compress a PDF',
				description: 'Optimize and reduce the file size of a PDF',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/misc/compress-pdf',
						encoding: 'arraybuffer',
					},
					send: {
						preSend: [sendPdfAsMultipart],
					},
					output: {
						postReceive: [returnBinary],
					},
				},
			},
		],
		default: 'compress',
	},
	{
		...inputDataField,
		displayOptions: { show: showOnlyForMisc },
	},
	{
		...outputDataField,
		displayOptions: { show: showOnlyForMisc },
	},
	{
		displayName: 'Optimization Level',
		name: 'optimizeLevel',
		type: 'options',
		default: 5,
		displayOptions: { show: showOnlyForCompress },
		description: 'Higher values compress more aggressively at the cost of quality',
		options: [
			{ name: '1 - Lightest', value: 1 },
			{ name: '2', value: 2 },
			{ name: '3', value: 3 },
			{ name: '4', value: 4 },
			{ name: '5 - Balanced', value: 5 },
			{ name: '6', value: 6 },
			{ name: '7', value: 7 },
			{ name: '8', value: 8 },
			{ name: '9 - Smallest', value: 9 },
		],
		routing: {
			send: { type: 'body', property: 'optimizeLevel' },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForCompress },
		options: [
			{
				displayName: 'Expected Output Size',
				name: 'expectedOutputSize',
				type: 'string',
				default: '',
				placeholder: 'e.g. 25KB',
				description: 'Target output size, e.g. "100MB" or "25KB". Overrides the optimization level.',
				routing: { send: { type: 'body', property: 'expectedOutputSize' } },
			},
			{
				displayName: 'Grayscale',
				name: 'grayscale',
				type: 'boolean',
				default: false,
				description: 'Whether to convert the PDF to grayscale to reduce size. Defaults to false.',
				routing: { send: { type: 'body', property: 'grayscale' } },
			},
			{
				displayName: 'Linearize',
				name: 'linearize',
				type: 'boolean',
				default: false,
				description: 'Whether to linearize the PDF for faster web viewing. Defaults to false.',
				routing: { send: { type: 'body', property: 'linearize' } },
			},
			{
				displayName: 'Normalize',
				name: 'normalize',
				type: 'boolean',
				default: false,
				description: 'Whether to normalize the PDF content for better compatibility. Defaults to false.',
				routing: { send: { type: 'body', property: 'normalize' } },
			},
		],
	},
];
