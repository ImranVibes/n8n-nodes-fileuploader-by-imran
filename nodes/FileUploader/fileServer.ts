import { _http, _fs, _path, _os, _process, _log } from './runtime';

/**
 * Universal Zero-Config File Server via HTTP Hijacking & Memory Sync
 * Intercepts requests to /f/* natively within n8n's existing Express server.
 * Supports 'Memory Sync' to work on distributed hostings where workers don't share disk.
 */

let isPatched = false;

interface CachedFile {
	buffer: Buffer;
	mimeType: string;
	originalName: string;
	expiresAt: number;
}

// In-memory cache to support distributed worker processes
const MEMORY_CACHE = new Map<string, CachedFile>();

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
	const n8nFolder = _process.env.N8N_USER_FOLDER || _path.join(_os.homedir(), '.n8n');
	const storagePath = _process.env.FILE_UPLOADER_PATH || _path.join(n8nFolder, 'temp-files');
	return storagePath;
}

function getMime(ext: string): string {
	return MIME_MAP[ext] || 'application/octet-stream';
}

function handleFileRequest(req: import('http').IncomingMessage, res: import('http').ServerResponse): void {
	// ── 1. HANDLE SYNC (INTERNAL UPLOAD FROM WORKER) ──
	if (req.method === 'POST' && req.url && req.url.includes('/f/sync')) {
		let body = Buffer.alloc(0);
		req.on('data', chunk => body = Buffer.concat([body, chunk]));
		req.on('end', () => {
			try {
				const url = new URL(req.url!, 'http://localhost');
				const id = url.searchParams.get('id');
				const name = url.searchParams.get('name') || 'file';
				const mime = url.searchParams.get('mime') || 'application/octet-stream';
				const ttl = parseInt(url.searchParams.get('ttl') || '60', 10);

				if (!id) throw new Error('Missing ID');

				MEMORY_CACHE.set(id, {
					buffer: body,
					mimeType: mime,
					originalName: name,
					expiresAt: Date.now() + (ttl * 60 * 1000)
				});

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ success: true }));
			} catch (e) {
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: (e as Error).message }));
			}
		});
		return;
	}

	if (req.method !== 'GET') {
		res.writeHead(405, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Method not allowed' }));
		return;
	}

	// ── 2. SERVE FILE (GET) ──
	const urlParts = (req.url || '').split('?')[0].split('/');
	const filename = urlParts[urlParts.length - 1];

	if (!filename || filename === 'f') {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Missing filename.' }));
		return;
	}

	// ── 2a. Check Memory Cache First (Fastest, works on distributed) ──
	const fileId = filename.split('-')[0];
	const cached = MEMORY_CACHE.get(fileId);
	if (cached) {
		if (cached.expiresAt < Date.now()) {
			MEMORY_CACHE.delete(fileId);
		} else {
			res.writeHead(200, {
				'Content-Type': cached.mimeType,
				'Content-Length': cached.buffer.length.toString(),
				'Content-Disposition': `inline; filename="${cached.originalName}"`,
				'Cache-Control': 'public, max-age=3600',
				'Access-Control-Allow-Origin': '*',
			});
			res.end(cached.buffer);
			return;
		}
	}

	// ── 2b. Fallback to Disk (For local/single-container setups) ──
	const storagePath = getStoragePath();
	const filePath = _path.join(storagePath, filename);

	if (!_fs.existsSync(filePath) || filename.endsWith('.meta')) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: `File "${filename}" not found. It may have expired or was never synced to the web server.` }));
		return;
	}

	const metaPath = `${filePath}.meta`;
	if (_fs.existsSync(metaPath)) {
		try {
			const meta = JSON.parse(_fs.readFileSync(metaPath, 'utf8'));
			if (meta.expiresAt && meta.expiresAt < Date.now()) {
				res.writeHead(410, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'This file has expired.' }));
				return;
			}
		} catch { /* ignore */ }
	}

	const ext = _path.extname(filename).replace('.', '').toLowerCase();
	const contentType = getMime(ext);
	const stats = _fs.statSync(filePath);
	const originalName = filename.substring(13);

	res.writeHead(200, {
		'Content-Type': contentType,
		'Content-Length': stats.size.toString(),
		'Content-Disposition': `inline; filename="${originalName}"`,
		'Cache-Control': 'public, max-age=3600',
		'Access-Control-Allow-Origin': '*',
	});

	const stream = _fs.createReadStream(filePath);
	stream.pipe(res);
}

export function initEmbeddedFileServer(): void {
	if (isPatched) return;
	isPatched = true;

	const originalEmit = _http.Server.prototype.emit;
	
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	_http.Server.prototype.emit = function (event: string, ...args: any[]) {
		if (event === 'request') {
			const req = args[0] as import('http').IncomingMessage;
			const res = args[1] as import('http').ServerResponse;
			
			if (req.url && req.url.startsWith('/f/')) {
				handleFileRequest(req, res);
				return true;
			}
		}
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		return originalEmit.apply(this, [event, ...args]);
	};
	
	_log('[FileUploader] Native HTTP route hijacking initialized for /f/*');
}
