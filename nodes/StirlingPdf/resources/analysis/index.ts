import type { INodeProperties } from 'n8n-workflow';
import { inputDataField } from '../../shared/descriptions';
import { sendPdfAsMultipart } from '../../shared/binary';

const showOnlyForAnalysis = {
	resource: ['analysis'],
};

export const analysisDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForAnalysis },
		options: [
			{
				name: 'Get Basic Info',
				value: 'getBasicInfo',
				action: 'Get basic info from a PDF',
				description: 'Return page count, metadata and other basic properties',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/analysis/basic-info',
					},
					send: {
						preSend: [sendPdfAsMultipart],
					},
				},
			},
		],
		default: 'getBasicInfo',
	},
	{
		...inputDataField,
		displayOptions: { show: showOnlyForAnalysis },
	},
];
