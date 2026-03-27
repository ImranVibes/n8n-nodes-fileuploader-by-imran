const fs = require('fs');
const path = require('path');
const os = require('os');

const n8nFolder = process.env.N8N_USER_FOLDER || require('path').join(os.homedir(), '.n8n');
const storagePath = process.env.FILE_UPLOADER_PATH || require('path').join(n8nFolder, 'temp-files');
const LEGACY_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour for old files without meta

function cleanup() {
    const now = Date.now();
    try {
        if (!fs.existsSync(storagePath)) return;
        const files = fs.readdirSync(storagePath);
        let deletedCount = 0;

        for (const file of files) {
            const fullPath = path.join(storagePath, file);
            
            // Race condition check: file might have been deleted since readdir
            if (!fs.existsSync(fullPath)) continue;

            const stats = fs.statSync(fullPath);
            if (stats.isDirectory() || file.endsWith('.meta')) continue;

            const metaPath = `${fullPath}.meta`;
            let shouldDelete = false;

            if (fs.existsSync(metaPath)) {
                try {
                    const content = fs.readFileSync(metaPath, 'utf8');
                    const metadata = JSON.parse(content);
                    if (metadata.expiresAt < now) {
                        console.log(`[${new Date().toISOString()}] Expired (meta): ${file}`);
                        shouldDelete = true;
                    }
                } catch (e) {
                    console.error(`[${new Date().toISOString()}] Error reading meta for ${file}:`, e.message);
                    shouldDelete = true; 
                }
            } else {
                if (now - stats.mtimeMs > LEGACY_EXPIRATION_MS) {
                    console.log(`[${new Date().toISOString()}] Expired (legacy): ${file}`);
                    shouldDelete = true;
                }
            }

            if (shouldDelete) {
                try {
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
                    deletedCount++;
                } catch (err) {
                    // Silently ignore if already gone
                }
            }
        }
        if (deletedCount > 0) {
            console.log(`[${new Date().toISOString()}] Cleanup finished. Deleted ${deletedCount} item(s).`);
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Cleanup failed:`, error.message);
    }
}

// Run every 10 seconds for "Instant" feel
setInterval(cleanup, 10 * 1000);
cleanup(); 
