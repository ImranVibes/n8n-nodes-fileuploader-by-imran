import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { ensureServerRunning } from './fileServer';

export class FileUploader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Temporary File Uploader',
		name: 'fileUploader',
		icon: 'file:fileUploader.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Store files temporarily and get a public URL on the same domain as n8n.',
		defaults: {
			name: 'Temporary File Uploader',
			color: '#6366f1',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'File', value: 'file' },
				],
				default: 'file',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: { resource: ['file'] },
				},
				options: [
					{
						name: 'Upload',
						value: 'upload',
						action: 'Upload a file',
						description: 'Upload a binary file and get a temporary public URL with a unique ID',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get file info',
						description: 'Retrieve details about a specific file by its ID',
					},
					{
						name: 'Get Many',
						value: 'list',
						action: 'List active files',
						description: 'List all currently active temporary files with full details',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete files',
						description: 'Delete a specific file by ID or purge all temporary files',
					},
				],
				default: 'upload',
			},

			// ── Upload parameters ──
			{
				displayName: 'Binary property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: { operation: ['upload'], resource: ['file'] },
				},
				description: 'The name of the binary property to upload.',
			},
			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: {
					show: { operation: ['upload'], resource: ['file'] },
				},
				options: [
					{
						displayName: 'Custom filename',
						name: 'customFilename',
						type: 'string',
						default: '',
						placeholder: 'e.g. my-awesome-image',
						description: 'Set a custom name for the file. The original extension and a unique ID will still be added.',
					},
					{
						displayName: 'Expiration time',
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
							{ name: '30 Days', value: '30d' },
							{ name: 'Custom (Minutes)', value: 'custom' },
						],
						default: '1h',
						description: 'How long the file should be available before automatic deletion. Default is 1 hour if not set.',
					},
					{
						displayName: 'Custom minutes',
						name: 'customExpiration',
						type: 'number',
						displayOptions: {
							show: { expiration: ['custom'] },
						},
						default: 60,
						description: 'Custom expiration time in minutes (maximum 30 days).',
					},
					{
						displayName: 'Public URL override',
						name: 'baseUrl',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://n8n.yourdomain.com',
						description: 'Manually set the base URL if automatic detection is incorrect.',
					},
				],
			},

			// ── Get parameters ──
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				required: true,
				displayOptions: {
					show: { operation: ['get'], resource: ['file'] },
				},
				default: '',
				placeholder: 'e.g. a1b2c3d4e5f6',
				description: 'The unique 12-character ID returned when the file was uploaded.',
			},

			// ── Delete parameters ──
			{
				displayName: 'Delete mode',
				name: 'deleteMode',
				type: 'options',
				displayOptions: {
					show: { operation: ['delete'], resource: ['file'] },
				},
				options: [
					{ name: 'By ID', value: 'specific' },
					{ name: 'All Files (Purge)', value: 'all' },
				],
				default: 'specific',
				description: 'Whether to delete a single file by its ID or purge everything.',
			},
			{
				displayName: 'File ID',
				name: 'deleteFileId',
				type: 'string',
				required: true,
				displayOptions: {
					show: { operation: ['delete'], deleteMode: ['specific'], resource: ['file'] },
				},
				default: '',
				placeholder: 'e.g. a1b2c3d4e5f6',
				description: 'The unique 12-character ID of the file to delete.',
			},
		],
	};

	// ── Helpers ──

	private static getBaseUrl(self: IExecuteFunctions, itemIndex: number): string {
		const override = (self.getNodeParameter('additionalFields.baseUrl', itemIndex, '') as string).trim();
		if (override) return override.replace(/\/+$/, '') + '/';
		return ((process.env.WEBHOOK_URL || process.env.N8N_PUBLIC_URL || process.env.N8N_EDITOR_BASE_URL || 'http://localhost:5678') as string).replace(/\/+$/, '') + '/';
	}

	private static parseExpiration(self: IExecuteFunctions, itemIndex: number): number {
		const map: Record<string, number> = {
			'1m': 1, '5m': 5, '10m': 10, '30m': 30, '50m': 50,
			'1h': 60, '6h': 360, '12h': 720, '1d': 1440,
			'3d': 4320, '7d': 10080, '15d': 21600, '30d': 43200,
		};
		const param = self.getNodeParameter('additionalFields.expiration', itemIndex, '1h') as string;
		if (param === 'custom') {
			const custom = self.getNodeParameter('additionalFields.customExpiration', itemIndex, 60) as number;
			return Math.min(custom, 43200);
		}
		return map[param] ?? 60;
	}

	private static readMeta(metaPath: string): Record<string, any> | null {
		try {
			return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
		} catch {
			return null;
		}
	}

	private static buildFileInfo(storagePath: string, file: string, baseUrl: string) {
		const fullPath = path.join(storagePath, file);
		const metaPath = `${fullPath}.meta`;
		const meta = FileUploader.readMeta(metaPath);
		const stats = fs.statSync(fullPath);
		const id = file.substring(0, 12);
		const originalName = file.substring(13); // skip "id-"
		const ext = path.extname(originalName).replace('.', '').toLowerCase();

		return {
			id,
			fileName: file,
			originalName,
			fileUrl: `${baseUrl}?id=${id}`,
			mimeType: ext ? `${FileUploader.extToMime(ext)}` : 'application/octet-stream',
			sizeBytes: stats.size,
			sizeFormatted: FileUploader.formatBytes(stats.size),
			createdAt: stats.birthtime.toISOString(),
			expiresAt: meta?.expiresAt ? new Date(meta.expiresAt).toISOString() : 'unknown',
			status: meta?.expiresAt && meta.expiresAt > Date.now() ? 'active' : 'expired',
		};
	}

	private static extToMime(ext: string): string {
		const map: Record<string, string> = {
			jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
			webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
			pdf: 'application/pdf', json: 'application/json', xml: 'application/xml',
			zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
			mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
			mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
			txt: 'text/plain', html: 'text/html', css: 'text/css', js: 'text/javascript',
			csv: 'text/csv', doc: 'application/msword', xls: 'application/vnd.ms-excel',
		};
		return map[ext] || 'application/octet-stream';
	}

	private static formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
	}

	private static findFileById(storagePath: string, id: string): string | null {
		const files = fs.readdirSync(storagePath);
		return files.find((f) => f.startsWith(id) && !f.endsWith('.meta')) || null;
	}

	// ── Execute ──

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const storagePath = process.env.FILE_UPLOADER_PATH || path.join(os.tmpdir(), 'n8n-temp-files');

		if (!fs.existsSync(storagePath)) {
			fs.mkdirSync(storagePath, { recursive: true });
		}

		const operation = this.getNodeParameter('operation', 0) as string;

		// Start embedded file server & build base URL
		const port = await ensureServerRunning();
		const rawBase = (process.env.WEBHOOK_URL || process.env.N8N_PUBLIC_URL || process.env.N8N_EDITOR_BASE_URL || 'http://localhost:5678') as string;
		const urlObj = new URL(rawBase.replace(/\/+$/, ''));
		const fileServerBase = `${urlObj.protocol}//${urlObj.hostname}:${port}`;

		// ── LIST ──
		if (operation === 'list') {
			const files = fs.readdirSync(storagePath).filter((f) => !f.endsWith('.meta'));
			const fileList: Record<string, any>[] = [];
			for (const file of files) {
				try {
					fileList.push(FileUploader.buildFileInfo(storagePath, file, fileServerBase));
				} catch {
					// File may have been deleted between readdir and stat
				}
			}
			returnData.push({ json: { totalFiles: fileList.length, files: fileList } });

		// ── GET ──
		} else if (operation === 'get') {
			for (let i = 0; i < items.length; i++) {
				try {
					const fileId = (this.getNodeParameter('fileId', i) as string).trim();
					const file = FileUploader.findFileById(storagePath, fileId);
					if (!file) {
						throw new NodeOperationError(this.getNode(), `No file found with ID "${fileId}". It may have expired or been deleted.`);
					}
					returnData.push({ json: FileUploader.buildFileInfo(storagePath, file, fileServerBase) });
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: (error as Error).message } });
						continue;
					}
					throw error;
				}
			}

		// ── DELETE ──
		} else if (operation === 'delete') {
			const deleteMode = this.getNodeParameter('deleteMode', 0) as string;
			if (deleteMode === 'all') {
				const files = fs.readdirSync(storagePath);
				const realFiles = files.filter((f) => !f.endsWith('.meta'));
				for (const file of files) {
					try { fs.unlinkSync(path.join(storagePath, file)); } catch {}
				}
				returnData.push({ json: { success: true, message: `Purged all temporary files.`, deletedCount: realFiles.length } });
			} else {
				for (let i = 0; i < items.length; i++) {
					try {
						const fileId = (this.getNodeParameter('deleteFileId', i) as string).trim();
						const file = FileUploader.findFileById(storagePath, fileId);
						if (!file) {
							throw new NodeOperationError(this.getNode(), `No file found with ID "${fileId}". It may have already expired or been deleted.`);
						}
						const fullPath = path.join(storagePath, file);
						const metaPath = `${fullPath}.meta`;
						if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
						if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
						returnData.push({ json: { success: true, deletedId: fileId, deletedFile: file } });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: (error as Error).message } });
							continue;
						}
						throw error;
					}
				}
			}

		// ── UPLOAD ──
		} else if (operation === 'upload') {
			for (let i = 0; i < items.length; i++) {
				try {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const expirationMinutes = FileUploader.parseExpiration(this, i);

					if (!items[i].binary || !items[i].binary![binaryPropertyName]) {
						throw new NodeOperationError(this.getNode(), `No binary data found in property "${binaryPropertyName}". Make sure the previous node outputs binary data.`);
					}

					const binaryData = items[i].binary![binaryPropertyName];
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					const customFilename = (this.getNodeParameter('additionalFields.customFilename', i, '') as string).trim();

					// Generate unique 12-char hex ID
					const fileId = crypto.randomBytes(6).toString('hex');

					let finalFileName = binaryData.fileName || 'file';
					if (customFilename) {
						const ext = path.extname(finalFileName);
						finalFileName = customFilename;
						if (ext && !finalFileName.toLowerCase().endsWith(ext.toLowerCase())) {
							finalFileName += ext;
						}
					}

					const fileName = `${fileId}-${finalFileName}`;
					const filePath = path.join(storagePath, fileName);
					const metaPath = `${filePath}.meta`;

					fs.writeFileSync(filePath, buffer);
					fs.chmodSync(filePath, '777');

					const expirationDate = new Date();
					expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);

					const metadata = {
						expiresAt: expirationDate.getTime(),
						originalName: binaryData.fileName || 'file',
						mimeType: binaryData.mimeType || 'application/octet-stream',
						uploadedAt: Date.now(),
					};

					fs.writeFileSync(metaPath, JSON.stringify(metadata));
					fs.chmodSync(metaPath, '777');

					returnData.push({
						json: {
							id: fileId,
							fileUrl: `${fileServerBase}?id=${fileId}`,
							fileName,
							originalName: binaryData.fileName || 'file',
							mimeType: binaryData.mimeType || 'application/octet-stream',
							sizeBytes: buffer.length,
							sizeFormatted: FileUploader.formatBytes(buffer.length),
							expiresAt: expirationDate.toISOString(),
						},
					});
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: (error as Error).message } });
						continue;
					}
					throw error;
				}
			}
		}

		return [returnData];
	}
}
