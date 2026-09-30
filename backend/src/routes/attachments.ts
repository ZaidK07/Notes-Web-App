import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { attachments, notes } from '../db/schema.js';
import {
  uploadToS3,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  getObjectFromS3,
  deleteFromS3,
} from '../services/s3.js';
import { z } from 'zod';
import path from 'path';

export const attachmentRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/attachments/file/:id - Redirects to a freshly generated presigned URL or streams directly
  fastify.get('/attachments/file/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id));

    if (!attachment) {
      return reply.status(404).send({ error: 'Attachment not found' });
    }

    try {
      // Generate a fresh 24-hour presigned URL and redirect seamlessly
      const signedUrl = await createPresignedDownloadUrl(attachment.fileKey, 86400);
      reply.header('Cache-Control', 'no-cache');
      return reply.redirect(302, signedUrl);
    } catch (err: any) {
      // Fallback: stream directly from S3
      try {
        const s3Obj = await getObjectFromS3(attachment.fileKey);
        reply.header('Content-Type', s3Obj.contentType || attachment.mimeType || 'image/png');
        if (s3Obj.contentLength) {
          reply.header('Content-Length', s3Obj.contentLength);
        }
        return reply.send(s3Obj.stream);
      } catch (streamErr: any) {
        fastify.log.error(streamErr);
        return reply.status(500).send({ error: 'Failed to retrieve file from S3' });
      }
    }
  });

  // GET /api/attachments/signed-url/:id - Returns a fresh presigned URL on demand
  fastify.get('/attachments/signed-url/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id));

    if (!attachment) {
      return reply.status(404).send({ error: 'Attachment not found' });
    }

    const signedUrl = await createPresignedDownloadUrl(attachment.fileKey, 86400);
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileKey: attachment.fileKey,
      fileUrl: signedUrl,
      expiresIn: 86400,
    };
  });

  // GET /api/attachments - List all attachments with fresh presigned URLs
  fastify.get('/attachments', async (request, reply) => {
    const list = await db
      .select({
        id: attachments.id,
        noteId: attachments.noteId,
        fileName: attachments.fileName,
        fileKey: attachments.fileKey,
        fileUrl: attachments.fileUrl,
        fileSize: attachments.fileSize,
        mimeType: attachments.mimeType,
        createdAt: attachments.createdAt,
        noteTitle: notes.title,
      })
      .from(attachments)
      .leftJoin(notes, eq(attachments.noteId, notes.id))
      .orderBy(desc(attachments.createdAt));

    // Sign all URLs with fresh 24-hour expiration
    const results = await Promise.all(
      list.map(async (item) => {
        try {
          const presigned = await createPresignedDownloadUrl(item.fileKey, 86400);
          return {
            ...item,
            fileUrl: presigned,
          };
        } catch {
          return {
            ...item,
            fileUrl: `/api/attachments/file/${item.id}`,
          };
        }
      })
    );

    return results;
  });

  // POST /api/attachments/upload - Direct multipart upload and return presigned URL
  fastify.post('/attachments/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const fields = data.fields as Record<string, any>;
    const noteId = fields.noteId?.value || undefined;

    const fileBuffer = await data.toBuffer();
    const originalName = data.filename || 'image.png';
    const extension = path.extname(originalName) || '.png';
    const attachmentId = uuidv4();
    const fileKey = `notes/${noteId || 'unassigned'}/${attachmentId}${extension}`;
    const mimeType = data.mimetype || 'image/png';

    try {
      await uploadToS3({
        key: fileKey,
        body: fileBuffer,
        mimeType,
      });

      // Generate authorized 24-hour presigned URL
      const signedUrl = await createPresignedDownloadUrl(fileKey, 86400).catch(
        () => `/api/attachments/file/${attachmentId}`
      );

      await db.insert(attachments).values({
        id: attachmentId,
        noteId: noteId || null,
        fileName: originalName,
        fileKey,
        fileUrl: signedUrl,
        fileSize: fileBuffer.length,
        mimeType,
      });

      const [created] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, attachmentId));

      return reply.status(201).send({
        ...created,
        fileUrl: signedUrl,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Failed to upload to S3',
        details: err.message,
      });
    }
  });

  // POST /api/attachments/presign - Request presigned upload URL
  fastify.post('/attachments/presign', async (request, reply) => {
    const schema = z.object({
      fileName: z.string(),
      mimeType: z.string().default('image/png'),
      noteId: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { fileName, mimeType, noteId } = parsed.data;
    const extension = path.extname(fileName) || '.png';
    const uniqueId = uuidv4();
    const fileKey = `notes/${noteId || 'unassigned'}/${uniqueId}${extension}`;

    try {
      const presigned = await createPresignedUploadUrl(fileKey, mimeType);
      const downloadUrl = await createPresignedDownloadUrl(fileKey, 86400).catch(
        () => `/api/attachments/file/${uniqueId}`
      );

      return reply.send({
        ...presigned,
        suggestedAttachmentId: uniqueId,
        fileUrl: downloadUrl,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Failed to generate S3 presigned URL',
        details: err.message,
      });
    }
  });

  // POST /api/attachments/confirm - Save DB record after presigned upload
  fastify.post('/attachments/confirm', async (request, reply) => {
    const schema = z.object({
      id: z.string().optional(),
      noteId: z.string().optional().nullable(),
      fileName: z.string(),
      fileKey: z.string(),
      fileSize: z.number().optional().default(0),
      mimeType: z.string().optional().default('image/png'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { id, noteId, fileName, fileKey, fileSize, mimeType } = parsed.data;
    const attachmentId = id || uuidv4();
    const signedUrl = await createPresignedDownloadUrl(fileKey, 86400).catch(
      () => `/api/attachments/file/${attachmentId}`
    );

    await db.insert(attachments).values({
      id: attachmentId,
      noteId: noteId || null,
      fileName,
      fileKey,
      fileUrl: signedUrl,
      fileSize,
      mimeType,
    });

    const [created] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId));

    return reply.status(201).send({
      ...created,
      fileUrl: signedUrl,
    });
  });

  // DELETE /api/attachments/:id - Delete attachment from S3 and DB
  fastify.delete('/attachments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db.select().from(attachments).where(eq(attachments.id, id));
    if (!existing) {
      return reply.status(404).send({ error: 'Attachment not found' });
    }

    if (existing.fileKey) {
      await deleteFromS3(existing.fileKey).catch((e) =>
        console.warn(`Failed to delete S3 file: ${existing.fileKey}`, e)
      );
    }

    await db.delete(attachments).where(eq(attachments.id, id));
    return { success: true, message: 'Attachment deleted successfully' };
  });
};
