# n8n-nodes-fileuploader-by-imran

A professional n8n community node for temporary file hosting. Stop worrying about where to host images for your webhooks or notifications—just use this node to get a public URL instantly.

![Logo](nodes/FileUploader/fileUploader.png)

## Features

- 🚀 **Instant Public URL**: Host any binary file on the same domain as your n8n instance.
- 🕒 **Fine-grained Expiration**: Choose from 1 minute to 15 days, or set a custom duration.
- 🧹 **Near-Instant Cleanup**: Expired files are deleted every 10 seconds automatically.
- 🔗 **Automatic URL Detection**: Intelligently detects your n8n base URL from environment variables.
- 🔒 **Secure & Collision-Proof**: Every filename is prefixed with a 12-character random hex string.
- 🏷️ **Custom Filenames**: Option to set your own filename for easy identification.
- 🛠️ **Reverse Proxy Integration**: Designed to work behind Nginx for unified port management.

## Installation

To install this node in your n8n instance, run the following command:

```bash
npm install n8n-nodes-fileuploader-by-imran
```

Alternatively, you can install it through the n8n community node marketplace in your instance settings.

## Usage

1. Add the **Temporary File Uploader** node to your workflow.
2. Provide the name of the binary property you want to host (default is `data`).
3. (Optional) Set a **Custom Filename**.
4. Select an **Expiration Time**.
5. The node will output a `fileUrl` which is publicly accessible until it expires.

## Architecture Notes

This node is designed to be paired with a simple Nginx configuration to serve files from `/data/shared/public/temp-files`. 

The cleanup is managed by a lightweight background process that ensures your storage stays clean without impacting n8n performance.

---

### Made with ❤️ by **Imran**

**For Business Enquiries:**
📧 [imran42633@gmail.com](mailto:imran42633@gmail.com)
✈️ Telegram: [@bangabandhusheikhmujiburrahman](https://t.me/bangabandhusheikhmujiburrahman)

## License

[MIT](LICENSE)
