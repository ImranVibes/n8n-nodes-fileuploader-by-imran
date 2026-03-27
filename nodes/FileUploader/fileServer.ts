import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Zero-config File Server via HTTP Hijacking
 * Intercepts requests to /f/* natively within n8n's existing Express server 
 * without opening any new ports or requiring webhooks.
 */

let isPatched = false;

const MIME_MAP: Record<string, string> = {
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

function getStoragePath(): string {
	const n8nFolder = process.env.N8N_USER_FOLDER || path.join(os.homedir(), '.n8n');
	const storagePath = process.env.FILE_UPLOADER_PATH || path.join(n8nFolder, 'temp-files');
	console.log(`[FileUploader] Storage Path Resolve: ${storagePath} (exists: ${fs.existsSync(storagePath)})`);
	return storagePath;
}

function getMime(ext: string): string {
	return MIME_MAP[ext] || 'application/octet-stream';
}

function handleFileRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
	if (req.method !== 'GET') {
		res.writeHead(405, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Method not allowed' }));
		return;
	}

	// Extract filename from URL (e.g., /f/123abc456def-image.jpg)
	const urlParts = (req.url || '').split('?')[0].split('/');
	const filename = urlParts[urlParts.length - 1];

	if (!filename || filename === 'f') {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Missing filename.' }));
		return;
	}

	const storagePath = getStoragePath();

	if (!fs.existsSync(storagePath)) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'No files uploaded yet.' }));
		return;
	}

	// The filename should be the exact file name stored on disk
	const filePath = path.join(storagePath, filename);

	if (!fs.existsSync(filePath) || filename.endsWith('.meta')) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: `File "${filename}" not found. It may have expired.` }));
		return;
	}

	// Check expiration via metadata
	const metaPath = `${filePath}.meta`;
	if (fs.existsSync(metaPath)) {
		try {
			const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
			if (meta.expiresAt && meta.expiresAt < Date.now()) {
				res.writeHead(410, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'This file has expired.' }));
				return;
			}
		} catch {
			// Serve anyway if meta is unreadable
		}
	}

	// Serve the file
	const ext = path.extname(filename).replace('.', '').toLowerCase();
	const contentType = getMime(ext);
	const stats = fs.statSync(filePath);
	const originalName = filename.substring(13); // Remove 12-char ID + dash

	res.writeHead(200, {
		'Content-Type': contentType,
		'Content-Length': stats.size.toString(),
		'Content-Disposition': `inline; filename="${originalName}"`,
		'Cache-Control': 'public, max-age=3600',
		'Access-Control-Allow-Origin': '*',
	});

	const stream = fs.createReadStream(filePath);
	stream.pipe(res);
}

export function initEmbeddedFileServer(): void {
	if (isPatched) return;
	isPatched = true;

	const originalEmit = http.Server.prototype.emit;
	
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	http.Server.prototype.emit = function (event: string, ...args: any[]) {
		if (event === 'request') {
			const req = args[0] as http.IncomingMessage;
			const res = args[1] as http.ServerResponse;
			
			// If request path starts with /f/, hijack it!
			if (req.url && req.url.startsWith('/f/')) {
				handleFileRequest(req, res);
				return true; // Stop event propagation to n8n Express app
			}
		}
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		return originalEmit.apply(this, [event, ...args]);
	};
	
	console.log('[FileUploader] Native HTTP route hijacking initialized for /f/*');
}

