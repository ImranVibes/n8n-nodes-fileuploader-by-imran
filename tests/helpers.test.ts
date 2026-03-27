import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Standalone copies of the helper functions from FileUploader.node.ts
 * to test them without importing the full n8n-workflow dependency chain.
 */

function extToMime(ext: string): string {
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

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function findFileById(storagePath: string, id: string): string | null {
	const files = fs.readdirSync(storagePath);
	return files.find((f) => f.startsWith(id) && !f.endsWith('.meta')) || null;
}

function readMeta(metaPath: string): Record<string, any> | null {
	try {
		return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
	} catch {
		return null;
	}
}

// ── Tests ──

describe('extToMime', () => {
	it('should return correct MIME for jpg', () => {
		expect(extToMime('jpg')).toBe('image/jpeg');
	});

	it('should return correct MIME for png', () => {
		expect(extToMime('png')).toBe('image/png');
	});

	it('should return correct MIME for pdf', () => {
		expect(extToMime('pdf')).toBe('application/pdf');
	});

	it('should return correct MIME for mp4', () => {
		expect(extToMime('mp4')).toBe('video/mp4');
	});

	it('should return octet-stream for unknown extensions', () => {
		expect(extToMime('xyz')).toBe('application/octet-stream');
	});

	it('should return correct MIME for csv', () => {
		expect(extToMime('csv')).toBe('text/csv');
	});

	it('should return correct MIME for webp', () => {
		expect(extToMime('webp')).toBe('image/webp');
	});
});

describe('formatBytes', () => {
	it('should return "0 B" for 0 bytes', () => {
		expect(formatBytes(0)).toBe('0 B');
	});

	it('should format bytes correctly', () => {
		expect(formatBytes(500)).toBe('500 B');
	});

	it('should format kilobytes correctly', () => {
		expect(formatBytes(1024)).toBe('1 KB');
	});

	it('should format megabytes correctly', () => {
		expect(formatBytes(1048576)).toBe('1 MB');
	});

	it('should format with decimal precision', () => {
		expect(formatBytes(1536)).toBe('1.5 KB');
	});

	it('should format gigabytes correctly', () => {
		expect(formatBytes(1073741824)).toBe('1 GB');
	});
});

describe('findFileById', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fu-test-'));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('should find a file by its ID prefix', () => {
		const testFile = 'abcdef123456-test-image.png';
		fs.writeFileSync(path.join(tmpDir, testFile), 'test');
		expect(findFileById(tmpDir, 'abcdef123456')).toBe(testFile);
	});

	it('should return null for non-existent ID', () => {
		expect(findFileById(tmpDir, 'nonexistent00')).toBeNull();
	});

	it('should not match .meta files', () => {
		fs.writeFileSync(path.join(tmpDir, 'abcdef123456-test.png.meta'), '{}');
		expect(findFileById(tmpDir, 'abcdef123456')).toBeNull();
	});

	it('should match the correct file among multiple', () => {
		fs.writeFileSync(path.join(tmpDir, 'aaa111222333-file1.jpg'), 'test');
		fs.writeFileSync(path.join(tmpDir, 'bbb444555666-file2.png'), 'test');
		fs.writeFileSync(path.join(tmpDir, 'bbb444555666-file2.png.meta'), '{}');
		expect(findFileById(tmpDir, 'bbb444555666')).toBe('bbb444555666-file2.png');
	});
});

describe('readMeta', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fu-meta-'));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('should parse valid metadata', () => {
		const metaPath = path.join(tmpDir, 'test.meta');
		fs.writeFileSync(metaPath, JSON.stringify({ expiresAt: 1234567890 }));
		expect(readMeta(metaPath)).toEqual({ expiresAt: 1234567890 });
	});

	it('should return null for invalid JSON', () => {
		const metaPath = path.join(tmpDir, 'bad.meta');
		fs.writeFileSync(metaPath, 'not json');
		expect(readMeta(metaPath)).toBeNull();
	});

	it('should return null for missing file', () => {
		expect(readMeta(path.join(tmpDir, 'nope.meta'))).toBeNull();
	});
});
