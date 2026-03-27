# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-03-27

### Added
- **ID-based file management**: Every upload now returns a unique 12-character hex ID.
- **Get operation**: Retrieve full file details (URL, MIME, size, expiry) by ID.
- **Get Many operation**: List all active files with rich metadata in a single output item.
- **Delete by ID**: Precisely remove files using their unique ID.
- **Delete All (Purge)**: Clear entire temporary storage in one click.
- **30 Days expiration option**: Extended max expiration from 15 to 30 days.
- **MIME type detection**: Automatic detection for 50+ file formats.
- **Human-readable file sizes**: Output shows `1.5 MB` instead of raw bytes.
- **File status tracking**: Each file shows `active` or `expired` status.
- **Codex file**: Proper n8n search/discovery integration.
- **Unit tests**: Jest test suite for all helper utilities.
- **ESLint**: TypeScript linting with `@typescript-eslint`.
- **NodeOperationError**: Professional error handling with contextual n8n error banners.

### Changed
- **Operation order**: Upload → Get → Get Many → Delete (most-used first).
- **Labels**: All labels converted to Sentence case per n8n UX guidelines.
- **Advanced settings**: Moved optional parameters into "Additional fields" collection.
- **Subtitle**: Node now shows the selected operation on the n8n canvas.

### Fixed
- Default expiration note added (60 minutes if not explicitly set).
- Custom expiration cap updated to 30 days (43,200 minutes).

## [1.0.2] - 2025-03-26

### Added
- Custom filename support.
- High-entropy random hex prefix for file security.
- Automatic base URL detection from environment variables.
- Background cleanup worker with 10-second interval precision.

### Changed
- Removed "Keep Binary Data" option for a leaner interface.
- Nginx configured with strict no-cache headers.

## [1.0.0] - 2025-03-26

### Added
- Initial release.
- Binary file upload with temporary public URL generation.
- Configurable expiration times (1 minute to 15 days).
- Cleanup service for automatic file deletion.
- Professional branding and documentation.
