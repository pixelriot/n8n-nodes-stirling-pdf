import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { analysisDescription } from './resources/analysis';
import { convertDescription } from './resources/convert';
import { miscDescription } from './resources/misc';

export class StirlingPdf implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Stirling PDF',
		name: 'stirlingPdf',
		icon: {
			light: 'file:../../icons/stirlingpdf.svg',
			dark: 'file:../../icons/stirlingpdf.dark.svg',
		},
		iconColor: 'orange-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Process PDFs with a Stirling PDF instance',
		defaults: {
			name: 'Stirling PDF',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'stirlingPdfApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analysis',
						value: 'analysis',
					},
					{
						name: 'Convert',
						value: 'convert',
					},
					{
						name: 'Misc',
						value: 'misc',
					},
				],
				default: 'convert',
			},
			...analysisDescription,
			...convertDescription,
			...miscDescription,
		],
	};
}
