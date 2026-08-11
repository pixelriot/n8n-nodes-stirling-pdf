import type { INodeProperties } from 'n8n-workflow';
import { inputDataField } from '../../shared/descriptions';
import { jsonRouting } from '../../shared/routing';

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
				routing: jsonRouting('/api/v1/analysis/basic-info'),
			},
			{
				name: 'Get Form Fields',
				value: 'getFormFields',
				action: 'Get form field info from a PDF',
				description: 'Return information about the form fields in a PDF',
				routing: jsonRouting('/api/v1/analysis/form-fields'),
			},
			{
				name: 'Get Security Info',
				value: 'getSecurityInfo',
				action: 'Get security info from a PDF',
				description: 'Return encryption and permission information about a PDF',
				routing: jsonRouting('/api/v1/analysis/security-info'),
			},
		],
		default: 'getBasicInfo',
	},
	{
		...inputDataField,
		displayOptions: { show: showOnlyForAnalysis },
	},
];
