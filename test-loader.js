const path = require('path');
const fs = require('fs');
const nodePath = path.resolve('dist/FileUploader.node.js');

try {
    const nodeCode = require(nodePath);
    fs.writeFileSync('err.json', JSON.stringify({ success: true }));
} catch(e) {
    fs.writeFileSync('err.json', JSON.stringify({
        message: e.message,
        stack: e.stack,
        code: e.code
    }, null, 2));
}
