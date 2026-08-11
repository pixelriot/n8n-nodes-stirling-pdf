import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StirlingPdfApi implements ICredentialType {
	name = 'stirlingPdfApi';

	displayName = 'Stirling PDF API';

	icon: Icon = {
		light: 'file:../icons/stirlingpdf.svg',
		dark: 'file:../icons/stirlingpdf.dark.svg',
	};

	documentationUrl = 'https://docs.stirlingpdf.com/API';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. https://stirling.example.com',
			description: 'Root URL of your Stirling PDF instance, without a trailing slash',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Sent as the X-API-KEY header on every request',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};

	// Stirling PDF's processing endpoints are all POST-with-file, so there is no
	// authenticated GET that returns 200 for a valid key. We test reachability of
	// the instance via the public /info/status health check; the API key itself is
	// first exercised on a real operation.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/api/v1/info/status',
			method: 'GET',
		},
	};
}
