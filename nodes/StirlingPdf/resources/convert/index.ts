import type { INodeProperties } from 'n8n-workflow';
import { inputDataField, outputDataField } from '../../shared/descriptions';
import {
	returnBinary,
	sendHtmlOrBinary,
	sendMarkdownOrBinary,
	sendPdfAsMultipart,
} from '../../shared/binary';

const showOnlyForConvert = {
	resource: ['convert'],
};

// Operations that accept their input as either a binary file or a raw text string.
const textOrBinaryOps = ['htmlToPdf', 'markdownToPdf'];

/** Routing for the common "upload a file, get a binary file back" convert ops. */
const fileToBinaryRouting = (url: string, preSend = sendPdfAsMultipart) => ({
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
				routing: fileToBinaryRouting('/api/v1/convert/html/pdf', sendHtmlOrBinary),
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
				routing: fileToBinaryRouting('/api/v1/convert/markdown/pdf', sendMarkdownOrBinary),
			},
			{
				name: 'PDF to CSV',
				value: 'pdfToCsv',
				action: 'Convert a PDF to CSV',
				description: 'Extract tables from a PDF as CSV',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/csv'),
			},
			{
				name: 'PDF to HTML',
				value: 'pdfToHtml',
				action: 'Convert a PDF to HTML',
				description: 'Convert a PDF to an HTML file (returned as a ZIP)',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/html'),
			},
			{
				name: 'PDF to Image',
				value: 'pdfToImage',
				action: 'Convert a PDF to images',
				description: 'Render PDF pages to image files',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/img'),
			},
			{
				name: 'PDF to Markdown',
				value: 'pdfToMarkdown',
				action: 'Convert a PDF to markdown',
				description: 'Convert a PDF to Markdown text',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/markdown'),
			},
			{
				name: 'PDF to PDF/A',
				value: 'pdfToPdfa',
				action: 'Convert a PDF to PDF/A',
				description: 'Convert a PDF to an archival PDF/A or PDF/X format',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/pdfa'),
			},
			{
				name: 'PDF to Text',
				value: 'pdfToText',
				action: 'Convert a PDF to text',
				description: 'Extract the text of a PDF as TXT or RTF',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/text'),
			},
			{
				name: 'PDF to Word',
				value: 'pdfToWord',
				action: 'Convert a PDF to DOCX',
				description: 'Convert a PDF to a Word document',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/word'),
			},
			{
				name: 'PDF to XML',
				value: 'pdfToXml',
				action: 'Convert a PDF to XML',
				description: 'Convert a PDF to XML',
				routing: fileToBinaryRouting('/api/v1/convert/pdf/xml'),
			},
		],
		default: 'fileToPdf',
	},

	// Input mode toggle for the text-capable operations (HTML / Markdown).
	{
		displayName: 'Input Type',
		name: 'inputMode',
		type: 'options',
		default: 'binary',
		noDataExpression: true,
		displayOptions: { show: { resource: ['convert'], operation: textOrBinaryOps } },
		description: 'Whether to read the input from a binary file or from a text string',
		options: [
			{ name: 'Binary File', value: 'binary' },
			{ name: 'Text', value: 'text' },
		],
	},
	{
		displayName: 'Content',
		name: 'textContent',
		type: 'string',
		default: '',
		required: true,
		typeOptions: { rows: 8 },
		placeholder: 'e.g. <h1>Hello</h1>',
		displayOptions: {
			show: { resource: ['convert'], operation: textOrBinaryOps, inputMode: ['text'] },
		},
		description: 'The HTML or Markdown text to convert to PDF',
	},

	// Binary file input — shown for every convert op except when text mode is active.
	{
		...inputDataField,
		displayOptions: {
			show: showOnlyForConvert,
			hide: { inputMode: ['text'] },
		},
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

	// --- Page selection shared by PDF → Image and PDF → CSV ---
	{
		displayName: 'Page Numbers',
		name: 'pageNumbers',
		type: 'string',
		default: 'all',
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToImage', 'pdfToCsv'] } },
		description: 'Pages to convert, e.g. "all", "1,3", or "2-5"',
		routing: { send: { type: 'body', property: 'pageNumbers' } },
	},

	// --- PDF to Image ---
	{
		displayName: 'Image Format',
		name: 'imageFormat',
		type: 'options',
		default: 'png',
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToImage'] } },
		description: 'Format of the rendered images',
		options: [
			{ name: 'GIF', value: 'gif' },
			{ name: 'JPEG', value: 'jpeg' },
			{ name: 'JPG', value: 'jpg' },
			{ name: 'PNG', value: 'png' },
			{ name: 'WebP', value: 'webp' },
		],
		routing: { send: { type: 'body', property: 'imageFormat' } },
	},
	{
		displayName: 'Output',
		name: 'singleOrMultiple',
		type: 'options',
		default: 'multiple',
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToImage'] } },
		description: 'Whether to return one image per page or a single combined image',
		options: [
			{ name: 'One Image Per Page', value: 'multiple' },
			{ name: 'Single Combined Image', value: 'single' },
		],
		routing: { send: { type: 'body', property: 'singleOrMultiple' } },
	},
	{
		displayName: 'Color Type',
		name: 'colorType',
		type: 'options',
		default: 'color',
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToImage'] } },
		description: 'Color type of the rendered images',
		options: [
			{ name: 'Black and White', value: 'blackwhite' },
			{ name: 'Color', value: 'color' },
			{ name: 'Greyscale', value: 'greyscale' },
		],
		routing: { send: { type: 'body', property: 'colorType' } },
	},
	{
		displayName: 'DPI',
		name: 'dpi',
		type: 'number',
		default: 300,
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToImage'] } },
		description: 'Resolution of the rendered images in dots per inch',
		routing: { send: { type: 'body', property: 'dpi' } },
	},
	{
		displayName: 'Include Annotations',
		name: 'includeAnnotations',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToImage'] } },
		description: 'Whether to render annotations such as comments. Defaults to false.',
		routing: { send: { type: 'body', property: 'includeAnnotations' } },
	},

	// --- PDF to Word ---
	{
		displayName: 'Output Format',
		name: 'outputFormat',
		type: 'options',
		default: 'docx',
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToWord'] } },
		description: 'The Word document format to produce',
		options: [
			{ name: 'DOC', value: 'doc' },
			{ name: 'DOCX', value: 'docx' },
			{ name: 'ODT', value: 'odt' },
		],
		routing: { send: { type: 'body', property: 'outputFormat' } },
	},

	// --- PDF to Text ---
	{
		displayName: 'Output Format',
		name: 'outputFormat',
		type: 'options',
		default: 'txt',
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToText'] } },
		description: 'The text format to produce',
		options: [
			{ name: 'RTF', value: 'rtf' },
			{ name: 'TXT', value: 'txt' },
		],
		routing: { send: { type: 'body', property: 'outputFormat' } },
	},

	// --- PDF to PDF/A ---
	{
		displayName: 'Output Format',
		name: 'outputFormat',
		type: 'options',
		default: 'pdfa',
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToPdfa'] } },
		description: 'The archival format to produce',
		options: [
			{ name: 'PDF/A', value: 'pdfa' },
			{ name: 'PDF/A-1', value: 'pdfa-1' },
			{ name: 'PDF/A-2', value: 'pdfa-2' },
			{ name: 'PDF/A-2B', value: 'pdfa-2b' },
			{ name: 'PDF/A-3', value: 'pdfa-3' },
			{ name: 'PDF/A-3B', value: 'pdfa-3b' },
			{ name: 'PDF/X', value: 'pdfx' },
		],
		routing: { send: { type: 'body', property: 'outputFormat' } },
	},
	{
		displayName: 'Strict',
		name: 'strict',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['convert'], operation: ['pdfToPdfa'] } },
		description: 'Whether to fail if the PDF cannot be fully converted. Defaults to false.',
		routing: { send: { type: 'body', property: 'strict' } },
	},
];
