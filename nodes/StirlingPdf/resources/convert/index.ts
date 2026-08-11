import type { INodeProperties } from 'n8n-workflow';
import { inputDataField, outputDataField } from '../../shared/descriptions';
import { returnBinary, sendPdfAsMultipart } from '../../shared/binary';

const showOnlyForConvert = {
	resource: ['convert'],
};

/** Routing for the common "upload a file, get a binary file back" convert ops. */
const fileToBinaryRouting = (url: string) => ({
	request: {
		method: 'POST' as const,
		url,
		encoding: 'arraybuffer' as const,
	},
	send: {
		preSend: [sendPdfAsMultipart],
	},
	output: {
		postReceive: [returnBinary],
	},
});

export const convertDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForConvert },
		options: [
			{
				name: 'eBook to PDF',
				value: 'ebookToPdf',
				action: 'Convert an ebook to PDF',
				description: 'Convert an eBook file (EPUB, MOBI, etc.) to PDF',
				routing: fileToBinaryRouting('/api/v1/convert/ebook/pdf'),
			},
			{
				name: 'EML to PDF',
				value: 'emlToPdf',
				action: 'Convert an email to PDF',
				description: 'Convert an EML or MSG email file to PDF',
				routing: fileToBinaryRouting('/api/v1/convert/eml/pdf'),
			},
			{
				name: 'File to PDF',
				value: 'fileToPdf',
				action: 'Convert a file to PDF',
				description: 'Convert a file to PDF using LibreOffice',
				routing: fileToBinaryRouting('/api/v1/convert/file/pdf'),
			},
			{
				name: 'HTML to PDF',
				value: 'htmlToPdf',
				action: 'Convert HTML to PDF',
				description:
					'Take an HTML or ZIP file (containing HTML and CSS) input and convert it to a PDF',
				routing: fileToBinaryRouting('/api/v1/convert/html/pdf'),
			},
			{
				name: 'Image to PDF',
				value: 'imageToPdf',
				action: 'Convert an image to PDF',
				description: 'Convert an image to a PDF file',
				routing: fileToBinaryRouting('/api/v1/convert/img/pdf'),
			},
			{
				name: 'Markdown to PDF',
				value: 'markdownToPdf',
				action: 'Convert markdown to PDF',
				description: 'Convert a Markdown file to PDF',
				routing: fileToBinaryRouting('/api/v1/convert/markdown/pdf'),
			},
		],
		default: 'fileToPdf',
	},

	{
		...inputDataField,
		displayOptions: { show: showOnlyForConvert },
	},
	{
		...outputDataField,
		displayOptions: { show: showOnlyForConvert },
	},

	// --- HTML to PDF ---
	{
		displayName: 'Zoom',
		name: 'zoom',
		type: 'number',
		default: 1,
		displayOptions: { show: { resource: ['convert'], operation: ['htmlToPdf'] } },
		description: 'Zoom level for rendering the website. Defaults to 1.',
		routing: { send: { type: 'body', property: 'zoom' } },
	},

	// --- Image to PDF ---
	{
		displayName: 'Fit Option',
		name: 'fitOption',
		type: 'options',
		default: 'fillPage',
		displayOptions: { show: { resource: ['convert'], operation: ['imageToPdf'] } },
		description: 'How the image should fit onto the page',
		options: [
			{ name: 'Fill Page', value: 'fillPage' },
			{ name: 'Fit Document to Image', value: 'fitDocumentToImage' },
			{ name: 'Maintain Aspect Ratio', value: 'maintainAspectRatio' },
		],
		routing: { send: { type: 'body', property: 'fitOption' } },
	},
	{
		displayName: 'Color Type',
		name: 'colorType',
		type: 'options',
		default: 'color',
		displayOptions: { show: { resource: ['convert'], operation: ['imageToPdf'] } },
		description: 'Color type of the output PDF',
		options: [
			{ name: 'Black and White', value: 'blackwhite' },
			{ name: 'Color', value: 'color' },
			{ name: 'Greyscale', value: 'greyscale' },
		],
		routing: { send: { type: 'body', property: 'colorType' } },
	},
	{
		displayName: 'Auto Rotate',
		name: 'autoRotate',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['convert'], operation: ['imageToPdf'] } },
		description: 'Whether to automatically rotate images to better fit the page. Defaults to false.',
		routing: { send: { type: 'body', property: 'autoRotate' } },
	},

	// --- eBook to PDF ---
	{
		displayName: 'Embed All Fonts',
		name: 'embedAllFonts',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['convert'], operation: ['ebookToPdf'] } },
		description: 'Whether to embed all fonts from the eBook into the PDF. Defaults to false.',
		routing: { send: { type: 'body', property: 'embedAllFonts' } },
	},
	{
		displayName: 'Include Table of Contents',
		name: 'includeTableOfContents',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['convert'], operation: ['ebookToPdf'] } },
		description: 'Whether to add a generated table of contents to the PDF. Defaults to false.',
		routing: { send: { type: 'body', property: 'includeTableOfContents' } },
	},
	{
		displayName: 'Include Page Numbers',
		name: 'includePageNumbers',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['convert'], operation: ['ebookToPdf'] } },
		description: 'Whether to add page numbers to the PDF. Defaults to false.',
		routing: { send: { type: 'body', property: 'includePageNumbers' } },
	},

	// --- EML to PDF (optional fields) ---
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['convert'], operation: ['emlToPdf'] } },
		options: [
			{
				displayName: 'Include All Recipients',
				name: 'includeAllRecipients',
				type: 'boolean',
				default: false,
				description: 'Whether to include CC and BCC recipients in the header. Defaults to false.',
				routing: { send: { type: 'body', property: 'includeAllRecipients' } },
			},
			{
				displayName: 'Include Attachments',
				name: 'includeAttachments',
				type: 'boolean',
				default: false,
				description: 'Whether to include email attachments in the PDF output. Defaults to false.',
				routing: { send: { type: 'body', property: 'includeAttachments' } },
			},
			{
				displayName: 'Max Attachment Size (MB)',
				name: 'maxAttachmentSizeMB',
				type: 'number',
				default: 10,
				description: 'Maximum attachment size in MB to include',
				routing: { send: { type: 'body', property: 'maxAttachmentSizeMB' } },
			},
		],
	},
];
