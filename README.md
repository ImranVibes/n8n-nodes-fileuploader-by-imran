# n8n-nodes-fileuploader-by-imran

A professional n8n community node for **temporary file hosting** with **ID-based file management**. Upload any binary file, get a unique ID and a public URL instantly — no external services required.

![Logo](https://raw.githubusercontent.com/ImranVibes/n8n-nodes-fileuploader-by-imran/main/nodes/FileUploader/fileUploader.png)

---

## ✨ Features

- 🔌 **True Zero-Config** — Built-in native HTTP hijacker. Install the node and it serves files instantly. No Nginx, no webhooks, no port-forwarding required.
- 🆔 **Unique File IDs** — Every upload gets a 12-character hex ID for easy reference, retrieval, and deletion.
- 🚀 **Instant Public URL** — Host any binary file directly on your n8n instance's URL (`/f/filename.jpg`).
- 📋 **Rich File Listing** — See all active files with ID, URL, MIME type, size, status, and expiration.
- 🔍 **Get by ID** — Retrieve full metadata for any file using its unique ID.
- 🗑️ **Delete by ID or Purge** — Precisely remove files using their ID or clear everything at once.
- 🕒 **Fine-Grained Expiration** — Choose from 1 minute to 30 days, or set a custom duration.
- 🧹 **Auto Cleanup** — Expired files are deleted every 10 seconds automatically.
- 🔗 **Auto URL Detection** — Intelligently detects your n8n base URL from environment variables.
- 🏷️ **Custom Filenames** — Option to set your own filename for easy identification.
- 📊 **MIME Detection** — Automatic MIME type detection for 50+ file formats.
- 🎯 **Canvas Subtitle** — Shows the selected operation directly on the n8n canvas.

---

## 📦 Installation

```bash
npm install n8n-nodes-fileuploader-by-imran
```

Or install through the **n8n Community Nodes** settings in your instance.

---

## 🔧 Operations

| Operation    | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| **Upload**   | Upload a binary file and receive a unique ID + public URL       |
| **Get**      | Retrieve file details (URL, MIME, size, expiry) by ID           |
| **Get Many** | List all active files with full metadata in a single output     |
| **Delete**   | Remove a file by ID or purge all temporary files                |

---

## ⚡ Quick Start (True Zero Config)

### Upload
1. In any workflow, add the **"Temporary File Uploader"** node.
2. Connect a node that outputs binary data (e.g., HTTP Request).
3. Run the workflow — you'll get a public URL on your n8n instance like:
   ```
   https://your-n8n.com/f/abc123def456-image.jpg
   ```
4. Open the URL in your browser — the file is served instantly! 🎉

*(No extra workflows, no opened ports, no proxy setup required!)*

### Get / Delete
1. Use the `id` from a previous Upload output.
2. Paste it into the **File ID** field.

### Get Many
1. Run the node with **Get Many** selected.
2. Receive a single output containing `totalFiles` and a `files` array with all active file details.

---

## ⏱️ Expiration Options

| Duration         | Value     |
| ---------------- | --------- |
| 1 Minute         | `1m`      |
| 5 Minutes        | `5m`      |
| 10 Minutes       | `10m`     |
| 30 Minutes       | `30m`     |
| 50 Minutes       | `50m`     |
| **1 Hour** (default) | `1h`  |
| 6 Hours          | `6h`      |
| 12 Hours         | `12h`     |
| 1 Day            | `1d`      |
| 3 Days           | `3d`      |
| 7 Days           | `7d`      |
| 15 Days          | `15d`     |
| 30 Days          | `30d`     |
| Custom (Minutes) | `custom`  |

> **Note:** The default expiration is **1 hour** if not explicitly set. The maximum custom value is **30 days** (43,200 minutes).

---

## 🔧 Environment Variables

The node automatically detects your public URL using these variables (in order of priority):

| Variable              | Description                        |
| --------------------- | ---------------------------------- |
| `FILE_UPLOADER_PATH`  | **Storage directory** for temp files (default: `~/.n8n/temp-files`) |
| `WEBHOOK_URL`         | Primary webhook URL                |
| `N8N_PUBLIC_URL`      | Public-facing n8n URL              |
| `N8N_EDITOR_BASE_URL` | Editor base URL                    |

> **Important:** This node uses **Hybrid Memory-Sync**. Files are stored both on disk and in the web-server's memory. This ensures it works instantly even on distributed hostings (like n8n Cloud or scaling Docker setups) where the worker and web-server don't share a filesystem. 🚀

---

## 🐛 Troubleshooting

### "No files uploaded yet" or 404 Error
- Ensure you have **run the upload at least once**. The server only initializes when the first file is processed.
- If you are on a very restricted hosting, verify that your n8n instance can make **internal HTTP requests** to itself.
- Check your n8n console logs for any `[FileUploader]` error messages.

### Wrong URL generated
- The node tries to guess your URL. If it's wrong, set the `N8N_PUBLIC_URL` or `WEBHOOK_URL` environment variable.
- You can also use the **Public URL override** in the **Additional Fields** section of the node to manually force a specific domain.

### File expired immediately
- Check your system clock. The cleanup worker relies on accurate system time for expiration logic.

### Permission denied errors
- On Linux/Docker, ensure the n8n user has write access to the `.n8n` directory or your custom `FILE_UPLOADER_PATH`.

---

## 🧪 Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run linter
npm run lint

# Run tests
npm test
```

---

## 📝 Changelog

See [CHANGELOG.md](https://github.com/ImranVibes/n8n-nodes-fileuploader-by-imran/blob/main/CHANGELOG.md) for version history.

## 🤝 Contributing

See [CONTRIBUTING.md](https://github.com/ImranVibes/n8n-nodes-fileuploader-by-imran/blob/main/CONTRIBUTING.md) for guidelines.

---

### Made with ❤️ by **Imran**

**For Business Enquiries:**
📧 [imran42633@gmail.com](mailto:imran42633@gmail.com)
✈️ Telegram: [@bangabandhusheikhmujiburrahman](https://t.me/bangabandhusheikhmujiburrahman)

## License

[MIT](LICENSE)
