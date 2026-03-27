# n8n-nodes-fileuploader-by-imran

A professional n8n community node for **temporary file hosting** with **ID-based file management**. Upload any binary file, get a unique ID and a public URL instantly — no external services required.

![Logo](https://raw.githubusercontent.com/ImranVibes/n8n-nodes-fileuploader-by-imran/main/nodes/FileUploader/fileUploader.png)

---

## ✨ Features

- 🆔 **Unique File IDs** — Every upload gets a 12-character hex ID for easy reference, retrieval, and deletion.
- 🚀 **Instant Public URL** — Host any binary file on the same domain as your n8n instance.
- 📋 **Rich File Listing** — See all active files with ID, URL, MIME type, size, status, and expiration.
- 🔍 **Get by ID** — Retrieve full metadata for any file using its unique ID.
- 🗑️ **Delete by ID or Purge** — Precisely remove files using their ID or clear everything at once.
- 🕒 **Fine-Grained Expiration** — Choose from 1 minute to 30 days, or set a custom duration.
- 🧹 **Auto Cleanup** — Expired files are deleted every 10 seconds automatically.
- 🔗 **Auto URL Detection** — Intelligently detects your n8n base URL from environment variables.
- 🏷️ **Custom Filenames** — Option to set your own filename for easy identification.
- 📊 **MIME Detection** — Automatic MIME type detection for 50+ file formats.
- 🛠️ **Reverse Proxy Ready** — Designed to work behind Nginx for unified port management.
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

## 🚀 Quick Start

### Upload
1. Connect a node that outputs binary data (e.g., HTTP Request, Read Binary File).
2. Set the **Binary property** name (default: `data`).
3. Optionally configure a custom filename and expiration time in **Additional fields**.
4. The output includes `id`, `fileUrl`, `fileName`, `mimeType`, `sizeFormatted`, and `expiresAt`.

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
| `FILE_UPLOADER_PATH`  | **Storage directory** for temp files (default: OS temp dir) |
| `WEBHOOK_URL`         | Primary webhook URL                |
| `N8N_PUBLIC_URL`      | Public-facing n8n URL              |
| `N8N_EDITOR_BASE_URL` | Editor base URL                    |

> **Important:** If `FILE_UPLOADER_PATH` is not set, files are stored in your system's temp directory (`/tmp/n8n-temp-files` on Linux). For Docker setups with Nginx serving files, set this to your shared volume path (e.g., `/data/shared/public/temp-files`).

---

## 🐛 Troubleshooting

### File not accessible via URL
- Ensure your **Nginx reverse proxy** is configured to serve files from `/data/shared/public/temp-files`.
- Check that the Nginx location block `/f/` is pointing to the correct directory.

### Wrong URL generated
- Verify that `WEBHOOK_URL` or `N8N_PUBLIC_URL` is correctly set in your environment variables.
- Use the **Public URL override** in Additional fields to manually set the correct URL.

### File expired immediately
- Check your system clock. The cleanup worker relies on accurate system time.
- Ensure the cleanup container's timezone matches the n8n container.

### Permission denied errors
- The node sets `777` permissions on files for cross-container access. Ensure your volume mounts allow this.

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
