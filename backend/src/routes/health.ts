import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { count, eq } from 'drizzle-orm';
import { pool, db } from '../db/index.js';
import { notes, attachments, tags } from '../db/schema.js';
import { checkS3Health } from '../services/s3.js';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/health - Check DB and S3 connection status
  fastify.get('/health', async (request, reply) => {
    let dbStatus: 'connected' | 'error' = 'error';
    let dbError: string | null = null;

    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      dbStatus = 'connected';
    } catch (err: any) {
      dbStatus = 'error';
      dbError = err.message;
    }

    const s3Health = await checkS3Health();

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          error: dbError,
        },
        s3: s3Health,
      },
    };
  });

  // GET /api/stats - Total notes, attachments, tags count
  fastify.get('/stats', async (request, reply) => {
    try {
      const [totalNotes] = await db.select({ val: count() }).from(notes);
      const [pinnedNotes] = await db.select({ val: count() }).from(notes).where(eq(notes.isPinned, true));
      const [archivedNotes] = await db.select({ val: count() }).from(notes).where(eq(notes.isArchived, true));
      const [totalAttachments] = await db.select({ val: count() }).from(attachments);
      const [totalTags] = await db.select({ val: count() }).from(tags);

      return {
        totalNotes: totalNotes?.val || 0,
        activeNotes: (totalNotes?.val || 0) - (archivedNotes?.val || 0),
        pinnedNotes: pinnedNotes?.val || 0,
        archivedNotes: archivedNotes?.val || 0,
        totalAttachments: totalAttachments?.val || 0,
        totalTags: totalTags?.val || 0,
      };
    } catch (err: any) {
      return {
        totalNotes: 0,
        activeNotes: 0,
        pinnedNotes: 0,
        archivedNotes: 0,
        totalAttachments: 0,
        totalTags: 0,
      };
    }
  });
};
