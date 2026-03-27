import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class FileServer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Temp File Server',
		name: 'fileServer',
		icon: 'file:fileUploader.png',
		group: ['trigger'],
		version: 1,
		subtitle: 'Serve uploaded files via webhook',
		description: 'Webhook-based file server that serves temporary files uploaded by the Temporary File Uploader node. No Nginx or external web server required.',
		defaults: {
			name: 'Temp File Server',
			color: '#6366f1',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: '={{$parameter["webhookPath"]}}',
				isFullPath: false,
			},
		],
		properties: [
			{
				displayName: 'Webhook path',
				name: 'webhookPath',
				type: 'string',
				default: 'temp-file-serve',
				required: true,
				description: 'The webhook path to serve files from. Files will be accessible at: {n8n-url}/webhook/temp-file-serve?id={fileId}',
			},
		],
	};

	private static extToMime(ext: string): string {
		const map: Record<string, string> = {
			jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
			webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
			pdf: 'application/pdf', json: 'application/json', xml: 'application/xml',
			zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
			'7z': 'application/x-7z-compressed', rar: 'application/x-rar-compressed',
			mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo', mov: 'video/quicktime',
			mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
			txt: 'text/plain', html: 'text/html', css: 'text/css', js: 'text/javascript',
			csv: 'text/csv', doc: 'application/msword', xls: 'application/vnd.ms-excel',
			docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		};
		return map[ext] || 'application/octet-stream';
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const storagePath = process.env.FILE_UPLOADER_PATH || path.join(os.tmpdir(), 'n8n-temp-files');

		const fileId = (req.query.id as string || '').trim();

		// No file ID provided — return usage info
		if (!fileId) {
			res.status(400).json({
				error: 'Missing file ID',
				usage: 'Add ?id=YOUR_FILE_ID to the URL',
			});
			return { noWebhookResponse: true };
		}

		// Find the file by ID prefix
		if (!fs.existsSync(storagePath)) {
			res.status(404).json({ error: 'Storage directory not found. Upload a file first.' });
			return { noWebhookResponse: true };
		}

		const files = fs.readdirSync(storagePath);
		const file = files.find((f) => f.startsWith(fileId) && !f.endsWith('.meta')) || null;

		if (!file) {
			res.status(404).json({ error: `File with ID "${fileId}" not found. It may have expired or been deleted.` });
			return { noWebhookResponse: true };
		}

		const filePath = path.join(storagePath, file);

		// Check if file has expired
		const metaPath = `${filePath}.meta`;
		if (fs.existsSync(metaPath)) {
			try {
				const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
				if (meta.expiresAt && meta.expiresAt < Date.now()) {
					res.status(410).json({ error: 'This file has expired and will be cleaned up shortly.' });
					return { noWebhookResponse: true };
				}
			} catch {
				// If meta is unreadable, still serve the file
			}
		}

		// Serve the file
		const ext = path.extname(file).replace('.', '').toLowerCase();
		const contentType = FileServer.extToMime(ext);
		const stats = fs.statSync(filePath);
		const originalName = file.substring(13); // Remove the 12-char ID prefix + dash

		res.setHeader('Content-Type', contentType);
		res.setHeader('Content-Length', stats.size.toString());
		res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
		res.setHeader('Cache-Control', 'public, max-age=3600');
		res.setHeader('X-File-Id', fileId);

		const fileBuffer = fs.readFileSync(filePath);
		res.send(fileBuffer);

		return {
			noWebhookResponse: true,
			workflowData: [
				[
					{
						json: {
							fileId,
							fileName: file,
							originalName,
							mimeType: contentType,
							sizeBytes: stats.size,
							servedAt: new Date().toISOString(),
							ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
						},
					},
				],
			],
		};
	}
}
