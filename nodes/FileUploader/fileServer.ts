import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Singleton embedded HTTP file server that runs inside n8n's process.
 * Starts automatically on first use. No Nginx, no webhooks, no config needed.
 */

let server: http.Server | null = null;
let serverPort = 0;
let isStarting = false;

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
	return process.env.FILE_UPLOADER_PATH || path.join(os.tmpdir(), 'n8n-temp-files');
}

function getMime(ext: string): string {
	return MIME_MAP[ext] || 'application/octet-stream';
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
	// Only allow GET
	if (req.method !== 'GET') {
		res.writeHead(405, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Method not allowed' }));
		return;
	}

	const url = new URL(req.url || '/', `http://localhost`);
	const fileId = (url.searchParams.get('id') || '').trim();

	// No file ID
	if (!fileId) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Missing file ID. Use ?id=YOUR_FILE_ID' }));
		return;
	}

	const storagePath = getStoragePath();

	if (!fs.existsSync(storagePath)) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'No files uploaded yet.' }));
		return;
	}

	// Find file by ID prefix
	const files = fs.readdirSync(storagePath);
	const file = files.find((f) => f.startsWith(fileId) && !f.endsWith('.meta'));

	if (!file) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: `File "${fileId}" not found. It may have expired.` }));
		return;
	}

	const filePath = path.join(storagePath, file);

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
	const ext = path.extname(file).replace('.', '').toLowerCase();
	const contentType = getMime(ext);
	const stats = fs.statSync(filePath);
	const originalName = file.substring(13); // Remove 12-char ID + dash

	res.writeHead(200, {
		'Content-Type': contentType,
		'Content-Length': stats.size.toString(),
		'Content-Disposition': `inline; filename="${originalName}"`,
		'Cache-Control': 'public, max-age=3600',
		'X-File-Id': fileId,
		'Access-Control-Allow-Origin': '*',
	});

	const stream = fs.createReadStream(filePath);
	stream.pipe(res);
}

export function getServerPort(): number {
	return serverPort;
}

export function isServerRunning(): boolean {
	return server !== null && serverPort > 0;
}

export async function ensureServerRunning(): Promise<number> {
	if (server && serverPort > 0) return serverPort;
	if (isStarting) {
		// Wait for ongoing startup
		return new Promise((resolve) => {
			const check = setInterval(() => {
				if (serverPort > 0) {
					clearInterval(check);
					resolve(serverPort);
				}
			}, 50);
		});
	}

	isStarting = true;
	const desiredPort = parseInt(process.env.FILE_SERVER_PORT || '5680', 10);

	return new Promise((resolve, reject) => {
		const srv = http.createServer(handleRequest);

		srv.on('error', (err: NodeJS.ErrnoException) => {
			if (err.code === 'EADDRINUSE') {
				// Try next port
				srv.listen(desiredPort + 1, '0.0.0.0');
			} else {
				isStarting = false;
				reject(err);
			}
		});

		srv.on('listening', () => {
			const addr = srv.address();
			if (addr && typeof addr === 'object') {
				serverPort = addr.port;
			}
			server = srv;
			isStarting = false;
			console.log(`[FileUploader] Embedded file server running on port ${serverPort}`);
			resolve(serverPort);
		});

		srv.listen(desiredPort, '0.0.0.0');
	});
}
