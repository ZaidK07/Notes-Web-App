# Contributing to Notes Web App

Thank you for your interest in contributing to **Notes Web App**! We welcome bug reports, feature requests, documentation improvements, and code contributions.

## Development Workflow

### 1. Fork and Clone
```bash
git clone https://github.com/yourusername/notes-web-app.git
cd notes-web-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the sample environment file in `backend/`:
```bash
cp backend/.env.example backend/.env
```
Ensure a MySQL server is running and configure your Backblaze B2 credentials.

### 4. Running Locally
```bash
# Run both frontend & backend concurrently
npm run dev
```

### 5. Running Tests
```bash
npm test
```

## Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names like `feature/markdown-table` or `fix/s3-presign-error`.
2. **Code Style**:
   - Write clean, type-safe TypeScript.
   - Use meaningful component, variable, and function names.
   - Match the existing Tailwind styling and glassmorphic UI patterns.
3. **Commit Messages**: Follow conventional commits (e.g. `feat: add markdown live preview toggle`, `fix: handle missing s3 config gracefully`).
4. **Testing**: Add or update test cases for new backend routes or utilities.

## Reporting Issues

If you find a bug or have a feature suggestion, please open a GitHub Issue with:
- Clear, reproducible steps.
- Environment details (Node.js version, OS, browser).
- Relevant console or server logs.
