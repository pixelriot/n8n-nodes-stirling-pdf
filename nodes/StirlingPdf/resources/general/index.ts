import type { INodeProperties } from 'n8n-workflow';
import { inputDataField, outputDataField } from '../../shared/descriptions';
import { sendFilesAsMultipart } from '../../shared/binary';
import { binaryRouting } from '../../shared/routing';

const showOnlyForGeneral = {
	resource: ['general'],
};

const showOnlyForMerge = {
	resource: ['general'],
	operation: ['merge'],
};

const showOnlyForSplitPages = {
	resource: ['general'],
	operation: ['splitPages'],
};

export const generalDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForGeneral },
		options: [
			{
				name: 'Merge',
				value: 'merge',
				action: 'Merge several PDF files into one',
				description: 'Combine several PDFs from the same item into a single PDF',
				routing: binaryRouting('/api/v1/general/merge-pdfs', sendFilesAsMultipart),
			},
			{
				name: 'Split Pages',
				value: 'splitPages',
				action: 'Split a PDF into several',
				description: 'Cut a PDF into separate documents after the given pages',
				routing: binaryRouting('/api/v1/general/split-pages'),
			},
		],
		default: 'merge',
	},

	// --- Merge ---
	// Several files in, so the single-file "Input Data Field Name" does not apply.
	{
		displayName: 'Input Data Field Names',
		name: 'inputDataFieldNames',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g. data, data_1',
		displayOptions: { show: showOnlyForMerge },
		description:
			'Names of the input binary fields that contain the PDFs to merge, separated by commas, in merge order',
	},
	// sortType and removeCertSign are required by the server and have no
	// server-side default, so both are always-sent top-level params.
	{
		displayName: 'Sort Type',
		name: 'sortType',
		type: 'options',
		default: 'orderProvided',
		displayOptions: { show: showOnlyForMerge },
		description: 'How the files are ordered before merging',
		options: [
			{ name: 'By Date Created', value: 'byDateCreated' },
			{ name: 'By Date Modified', value: 'byDateModified' },
			{ name: 'By File Name', value: 'byFileName' },
			{ name: 'By PDF Title', value: 'byPDFTitle' },
			{ name: 'Order Provided', value: 'orderProvided' },
		],
		routing: { send: { type: 'body', property: 'sortType' } },
	},
	{
		displayName: 'Remove Certificate Signatures',
		name: 'removeCertSign',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForMerge },
		description: 'Whether to remove certification signatures from the merged PDF',
		routing: { send: { type: 'body', property: 'removeCertSign' } },
	},
	{
		displayName: 'Generate Table of Contents',
		name: 'generateToc',
		type: 'boolean',
		default: false,
		displayOptions: { show: showOnlyForMerge },
		description:
			'Whether to add a table of contents that uses the input file names as chapter names',
		routing: { send: { type: 'body', property: 'generateToc' } },
	},

	// --- Split Pages ---
	{
		...inputDataField,
		displayOptions: { show: showOnlyForSplitPages },
	},
	{
		displayName: 'Split After Pages',
		name: 'pageNumbers',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 2,5',
		displayOptions: { show: showOnlyForSplitPages },
		description:
			'Pages after which the PDF is cut: "2,5" gives pages 1-2, 3-5 and 6 onwards. Also accepts ranges ("1,3,5-9"), "all" (after every page) and functions such as "2n+1".',
		routing: { send: { type: 'body', property: 'pageNumbers' } },
	},

	{
		...outputDataField,
		displayOptions: { show: showOnlyForGeneral },
	},
];
