import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class FileUploader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Temporary File Uploader',
		name: 'fileUploader',
		icon: 'file:fileUploader.png',
		group: ['transform'],
		version: 1,
		description: 'Store files temporarily and get a public URL on the same domain as n8n.',
		defaults: {
			name: 'Temporary File Uploader',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'The name of the binary property to upload.',
			},
			{
				displayName: 'Public URL Override',
				name: 'baseUrl',
				type: 'string',
				default: '',
				placeholder: 'OPTIONAL: https://n8n.yourdomain.com ',
				description: 'Optional: Manually set the base URL if automatic detection is incorrect.',
			},
			{
				displayName: 'Expiration Time',
				name: 'expiration',
				type: 'options',
				options: [
					{ name: '1 Minute', value: '1m' },
					{ name: '5 Minutes', value: '5m' },
					{ name: '10 Minutes', value: '10m' },
					{ name: '30 Minutes', value: '30m' },
					{ name: '50 Minutes', value: '50m' },
					{ name: '1 Hour', value: '1h' },
					{ name: '6 Hours', value: '6h' },
					{ name: '12 Hours', value: '12h' },
					{ name: '1 Day', value: '1d' },
					{ name: '3 Days', value: '3d' },
					{ name: '7 Days', value: '7d' },
					{ name: '15 Days', value: '15d' },
					{ name: 'Custom (Minutes)', value: 'custom' },
				],
				default: '1h',
				description: 'How long the file should be available before automatic deletion.',
			},
			{
				displayName: 'Custom Minutes',
				name: 'customExpiration',
				type: 'number',
				displayOptions: {
					show: {
						expiration: ['custom'],
					},
				},
				default: 60,
				description: 'Custom expiration time in minutes (Maximum 15 days).',
			},
			{
				displayName: 'Custom Filename',
				name: 'customFilename',
				type: 'string',
				default: '',
				placeholder: 'e.g. my-awesome-image',
				description: 'Optional: Set a custom name for the file. The original extension and a random ID will still be added.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const storagePath = '/data/shared/public/temp-files';

		// Automatic Public URL detection
		let defaultBaseUrl = process.env.WEBHOOK_URL ||
			process.env.N8N_PUBLIC_URL ||
			process.env.N8N_EDITOR_BASE_URL ||
			'http://localhost:5678';

		if (!fs.existsSync(storagePath)) {
			fs.mkdirSync(storagePath, { recursive: true });
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				let baseUrl = (this.getNodeParameter('baseUrl', i) as string) || defaultBaseUrl;

				// Standardize URL
				baseUrl = baseUrl.replace(/\/+$/, '');
				if (baseUrl) baseUrl += '/';

				const expirationParam = this.getNodeParameter('expiration', i) as string;
				const customFilename = this.getNodeParameter('customFilename', i) as string;

				let expirationMinutes = 60;
				if (expirationParam === '1m') expirationMinutes = 1;
				else if (expirationParam === '5m') expirationMinutes = 5;
				else if (expirationParam === '10m') expirationMinutes = 10;
				else if (expirationParam === '30m') expirationMinutes = 30;
				else if (expirationParam === '50m') expirationMinutes = 50;
				else if (expirationParam === '1h') expirationMinutes = 60;
				else if (expirationParam === '6h') expirationMinutes = 360;
				else if (expirationParam === '12h') expirationMinutes = 720;
				else if (expirationParam === '1d') expirationMinutes = 1440;
				else if (expirationParam === '3d') expirationMinutes = 4320;
				else if (expirationParam === '7d') expirationMinutes = 10080;
				else if (expirationParam === '15d') expirationMinutes = 21600;
				else if (expirationParam === 'custom') {
					expirationMinutes = this.getNodeParameter('customExpiration', i) as number;
					if (expirationMinutes > 21600) expirationMinutes = 21600;
				}

				if (!items[i].binary || !items[i].binary![binaryPropertyName]) {
					continue;
				}

				const binaryData = items[i].binary![binaryPropertyName];
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

				// Generate unique filename with high entropy
				const randomId = crypto.randomBytes(6).toString('hex');
				
				let finalFileName = binaryData.fileName || 'file';
				if (customFilename) {
					// Extract extension from original file if possible
					const ext = path.extname(finalFileName);
					finalFileName = customFilename.trim();
					if (ext && !finalFileName.toLowerCase().endsWith(ext.toLowerCase())) {
						finalFileName += ext;
					}
				}

				const fileName = `${randomId}-${finalFileName}`;
				const filePath = path.join(storagePath, fileName);
				const metaPath = `${filePath}.meta`;

				// Save file and ensure it is deletable by any user (cleanup worker)
				fs.writeFileSync(filePath, buffer);
				fs.chmodSync(filePath, '777');

				const expirationDate = new Date();
				expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);

				const metadata = {
					expiresAt: expirationDate.getTime(),
				};

				fs.writeFileSync(metaPath, JSON.stringify(metadata));
				fs.chmodSync(metaPath, '777');

				const fileUrl = `${baseUrl}f/${fileName}`;

				const result: INodeExecutionData = {
					json: {
						fileUrl,
						fileName,
						expiresAt: expirationDate.toISOString(),
					},
				};

				returnData.push(result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
