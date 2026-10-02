<div align="center">

# Notes Web App

**A modern, lightweight, privacy-focused note-taking web application with Backblaze B2 S3 image attachments and MySQL database storage.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-v18%2B-green.svg)](https://nodejs.org/)
[![Backend](https://img.shields.io/badge/backend-Fastify%20%7C%20TypeScript-000000.svg)](https://fastify.dev/)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%7C%20React%2018%20%7C%20TypeScript-38bdf8.svg)](https://vitejs.dev/)
[![Styling](https://img.shields.io/badge/styling-Tailwind%20CSS-06b6d4.svg)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/database-MySQL%20%7C%20Drizzle%20ORM-f59e0b.svg)](https://orm.drizzle.team/)
[![Storage](https://img.shields.io/badge/storage-Backblaze%20B2%20%2F%20AWS%20S3-e11d48.svg)](https://www.backblaze.com/b2/cloud-storage.html)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<p align="center">
  <a href="#key-features">Key Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#api-reference">API Reference</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="#license">License</a>
</p>

</div>

---

## Overview

**Notes Web App** is an open-source, nimble note-taking platform designed for speed, clarity, and control. It brings together a responsive, glassmorphic UI aesthetic inspired by modern developer tooling, a high-performance **Fastify TypeScript** backend, a lightweight **MySQL** database driven by **Drizzle ORM**, and cloud image storage via **Backblaze B2 (S3-compatible API)**.

Whether organizing code snippets, drafting technical documents, or managing project notes with inline visual attachments, Notes Web App provides an uncluttered workspace in both Light and Dark modes.

---

## Key Features

### ⚡ Ultra-Fast, Glassmorphic UI (Web Database Viewer Aesthetic)
* **Tailored Aesthetics:** Built with the `Outfit` typography, sleek frosted glass headers (`glass-panel`), crisp dark/light themes, and custom scrollbars.
* **Responsive Layout:** Adaptive sidebar for instant filtering by tags, pinned notes, archives, and image gallery.
* **Instant Command Palette (`⌘K` / `Ctrl+K`):** Quickly search notes, switch views, or toggle themes with keyboard navigation.

### 📝 Rich Note Editor & Markdown Support
* **Dual Mode Editor:** Live split markdown editor with real-time preview and instant syntax highlighting.
* **Formatting Toolbar:** Fast actions for bold, italic, headings, blockquotes, code blocks, unordered/ordered lists, and check lists.
* **Auto-Save & Status Indicators:** Visual save indicators so work is never lost.

### 🖼️ Backblaze B2 S3 Image Attachments
* **Drag-and-Drop & Clipboard Paste:** Paste screenshots directly into notes (`⌘V`) or drop images into the editor.
* **Direct Cloud Storage:** Uploads securely to Backblaze B2 via standard AWS S3 SDK v3 protocol with presigned upload URLs or Fastify streaming.
* **Attachment Drawer & Inspector Modal:** Full-resolution image zoom, copyable image markdown links, file size badges, and deletion controls.
* **Media Gallery View:** Browse all attached assets across your notebook in one consolidated view.

### 🗄️ MySQL Database & Drizzle ORM
* **Lightweight Schema:** Zero bloat, blazing queries with Drizzle ORM and `mysql2`.
* **Tagging & Categorization:** Multi-tag support with color badges for quick categorization.
* **Search & Pinning:** Full-text instant filtering across note titles, contents, and tag labels.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│              Frontend (Vite + React + TS)               │
│  - Outfit Font + Tailwind Glassmorphic Design System    │
│  - Markdown Editor + Drag & Drop S3 Image Attachments   │
│  - Command Palette (⌘K), Sidebar Filter, Inspector Modal│
└────────────────────────────┬────────────────────────────┘
                             │ REST API / JSON
┌────────────────────────────▼────────────────────────────┐
│               Backend (Fastify + TS)                    │
│  - RESTful Routes: Notes, Tags, S3 Attachments, Search  │
│  - S3 / Backblaze Client (@aws-sdk/client-s3)           │
│  - Drizzle ORM + Connection Pooling                     │
└──────────────┬────────────────────────────┬─────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────┐ ┌────────────────────────┐
│        MySQL Database        │ │  Backblaze B2 Cloud S3 │
│  (Notes, Tags, Attachments)  │ │  (Images / Media Assets)
└──────────────────────────────┘ └────────────────────────┘
```

---

## Quick Start

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **MySQL**: Server 8.0+ or MariaDB
* **Backblaze B2 Account**: S3-compatible Application Key ID, Secret Key, and Bucket name.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yourusername/notes-web-app.git
cd notes-web-app
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` in `backend/`:
```bash
cp backend/.env.example backend/.env
```
Update your database credentials and Backblaze B2 S3 credentials in `backend/.env`.

### 3. Run Database Migrations / Sync
```bash
npm run dev:backend
```
*(The backend automatically creates missing tables on initial boot if not present).*

### 4. Start Development Servers
```bash
# Starts both Backend (port 9548) and Frontend (port 9547)
npm run dev
```

Visit **http://localhost:9547** to access the application.

---

## Configuration

### Environment Variables (`backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `9548` | Fastify server listen port |
| `HOST` | No | `0.0.0.0` | Fastify host bind address |
| `CORS_ORIGIN` | No | `http://localhost:9547` | Allowed CORS frontend origin |
| `DB_HOST` | **Yes** | `localhost` | MySQL Host |
| `DB_PORT` | No | `3306` | MySQL Port |
| `DB_USER` | **Yes** | `root` | MySQL User |
| `DB_PASSWORD`| **Yes** | `""` | MySQL Password |
| `DB_NAME` | **Yes** | `notes_db` | MySQL Database Name |
| `S3_ENDPOINT` | **Yes** | - | Backblaze B2 Endpoint (e.g., `https://s3.us-west-004.backblazeb2.com`) |
| `S3_REGION` | **Yes** | `us-west-004` | S3 Region |
| `S3_BUCKET` | **Yes** | - | Backblaze B2 Bucket Name |
| `S3_ACCESS_KEY_ID` | **Yes** | - | Backblaze B2 Application Key ID |
| `S3_SECRET_ACCESS_KEY` | **Yes** | - | Backblaze B2 Application Key (Secret) |
| `S3_PUBLIC_BASE_URL` | No | - | Optional custom CDN / Public bucket base URL |

---

## API Reference

### Notes Endpoints
* `GET /api/notes` - List all active notes (supports query filters `search`, `tag`, `isPinned`, `isArchived`).
* `GET /api/notes/:id` - Fetch single note with attachments and tags.
* `POST /api/notes` - Create a new note.
* `PUT /api/notes/:id` - Update note content, title, pin status, or archive status.
* `DELETE /api/notes/:id` - Permanently delete a note and its attached S3 objects.

### Attachments & S3 Endpoints
* `POST /api/attachments/upload` - Direct multipart image upload to Backblaze B2 S3.
* `POST /api/attachments/presign` - Request S3 presigned PUT URL for direct client upload.
* `DELETE /api/attachments/:id` - Delete an attachment from DB and Backblaze B2 bucket.

### System & Health Endpoints
* `GET /api/health` - Server, MySQL connection, and Backblaze S3 health status.
* `GET /api/stats` - Notebook statistics (total notes, attachments, tags, storage used).

---

## Contributing

Contributions are warmly welcomed! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting Pull Requests.

---

## License

This project is licensed under the [MIT License](LICENSE).
