import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'notes_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
};

export const pool = mysql.createPool(dbConfig);
export const db = drizzle(pool, { schema, mode: 'default' });

/**
 * Initializes tables if they don't exist yet for seamless zero-config setup
 */
export async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    try {
      // 1. Notes table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id VARCHAR(36) PRIMARY KEY,
          title VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
          content LONGTEXT NOT NULL,
          is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          color VARCHAR(20) DEFAULT 'slate',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Tags table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS tags (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          color VARCHAR(20) DEFAULT 'brand',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Note Tags Join Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS note_tags (
          note_id VARCHAR(36) NOT NULL,
          tag_id VARCHAR(36) NOT NULL,
          PRIMARY KEY (note_id, tag_id),
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Attachments table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS attachments (
          id VARCHAR(36) PRIMARY KEY,
          note_id VARCHAR(36) NULL,
          file_name VARCHAR(255) NOT NULL,
          file_key VARCHAR(512) NOT NULL,
          file_url VARCHAR(1024) NOT NULL,
          file_size INT DEFAULT 0,
          mime_type VARCHAR(100) DEFAULT 'image/png',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      console.log('✅ MySQL Database tables initialized successfully.');
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.warn('⚠️ Could not connect to MySQL database during initialization:', error.message);
    console.warn('   Ensure MySQL is running and your .env credentials are correct.');
  }
}
