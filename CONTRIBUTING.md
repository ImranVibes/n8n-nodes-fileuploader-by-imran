# Contributing to n8n-nodes-fileuploader-by-imran

Thank you for your interest in contributing! 🎉

## Getting Started

1. **Fork** the repository.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/n8n-nodes-fileuploader-by-imran.git
   cd n8n-nodes-fileuploader-by-imran
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Build** the project:
   ```bash
   npm run build
   ```

## Development Workflow

- **Build**: `npm run build` — Compiles TypeScript and copies assets.
- **Lint**: `npm run lint` — Runs ESLint to check code quality.
- **Test**: `npm test` — Runs Jest unit tests.

## Code Standards

- Use **Sentence case** for all UI labels (n8n guideline).
- Use `NodeOperationError` instead of raw `throw new Error()`.
- Add unit tests for any new helper functions.
- Run `npm run lint` before committing.

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/my-awesome-feature`
2. Make your changes and commit with a clear message.
3. Push to your fork and open a **Pull Request**.

## Reporting Issues

Open an issue on GitHub with:
- A clear description of the problem.
- Steps to reproduce.
- Expected vs. actual behavior.

---

Made with ❤️ by **Imran**
