# Changelog

All notable changes to this project will be documented in this file.

## [1.5.0] - 2025-03-27

### Added
- **Hybrid Memory-Sync**: Files are now dual-stored in memory and on disk. This solves "No files uploaded yet" errors on distributed/scaling hostings (like n8n Cloud) where workers and web servers don't share a filesystem.
- **Robust Sync Discovery**: Internal synchronization now attempts to reach the web server via both `localhost` and the public `WEBHOOK_URL` to bypass DNS/Proxy restrictions.
- **Improved MIME Mapping**: Support for 50+ common file extensions with correct content-types.

### Fixed
- Fixed directory visibility issues in multi-container environments.

## [1.4.0] - 2025-03-27

### Added
- **Native HTTP Hijacking (True Zero-Config)**: Intercepts `/f/*` requests directly on n8n's existing web port using `http.Server.prototype.emit`.
- **Cleaner URLs**: Reverted to direct file paths (`/f/id-filename.ext`) instead of query parameters.
- **Zero-Config Serving**: Removed the need for the "Temp File Server" trigger node and manual webhook workflows.

## [1.3.0] - 2025-03-27

### Added
- **Embedded HTTP File Server**: Built-in standalone server running on port 5680 (fallback 5681+).

### Removed
- Removed the separate "Temp File Server" trigger node.

## [1.2.0] - 2025-03-27

### Added
- **Temporary File Server (Trigger Node)**: Initial webhook-based file server to serve files without Nginx.

## [1.1.0] - 2025-03-27

### Added
- **ID-based file management**: Every upload now returns a unique 12-character hex ID.
- **Get operation**: Retrieve full file details (URL, MIME, size, expiry) by ID.
- **Get Many operation**: List all active files with rich metadata.
- **Delete All (Purge)**: Clear entire temporary storage in one click.
- **30 Days expiration**: Extended max expiration.
- **Professional UX**: Sentinel-case labels, NodeOperationError, and custom branding.

## [1.0.0] - 2025-03-26

### Added
- Initial release.
- Binary file upload with temporary URL generation.
- Cleanup service for automatic file deletion.
