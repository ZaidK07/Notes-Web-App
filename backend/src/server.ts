import { buildApp } from './app.js';
import { initDatabase } from './db/index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const PORT = parseInt(process.env.PORT || '7818', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Try initializing database tables
    await initDatabase();

    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Notes Web App Backend listening on http://${HOST}:${PORT}`);
    console.log(`📖 API Documentation available at http://localhost:${PORT}/docs`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
