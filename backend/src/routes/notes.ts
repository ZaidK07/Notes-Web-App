import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and, like, or, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notes, tags, noteTags, attachments, Attachment } from '../db/schema.js';
import { deleteFromS3 } from '../services/s3.js';
import { z } from 'zod';

const createNoteSchema = z.object({
  title: z.string().optional().default('Untitled Note'),
  content: z.string().optional().default(''),
  isPinned: z.boolean().optional().default(false),
  isArchived: z.boolean().optional().default(false),
  color: z.string().optional().default('slate'),
  tagIds: z.array(z.string()).optional().default([]),
});

const updateNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  color: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

/**
 * Normalizes any S3 direct URLs in markdown to point to the authorized backend streaming proxy
 */
function normalizeNoteContent(content: string, noteAttachments: Attachment[] = []): string {
  if (!content) return '';
  let updated = content;

  // Replace raw direct S3 URLs with backend stream endpoints
  for (const att of noteAttachments) {
    if (att.fileKey) {
      const escapedKey = att.fileKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`https?://[^)\\s]+/(${escapedKey})`, 'g');
      updated = updated.replace(regex, `/api/attachments/file/${att.id}`);
    }
  }

  // Also replace any generic backblazeb2 URLs ending with uuid
  updated = updated.replace(
    /https?:\/\/[^\s)]*backblazeb2\.com\/[^\s)]*\/([0-9a-fA-F-]{36})\.[a-zA-Z0-9]+/g,
    '/api/attachments/file/$1'
  );

  return updated;
}

export const noteRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/notes - List notes with filtering
  fastify.get('/notes', async (request, reply) => {
    const query = request.query as {
      search?: string;
      tagId?: string;
      isPinned?: string;
      isArchived?: string;
    };

    const conditions = [];

    // Filter by archive state (default: not archived, unless explicitly requested)
    if (query.isArchived !== undefined) {
      conditions.push(eq(notes.isArchived, query.isArchived === 'true'));
    } else {
      conditions.push(eq(notes.isArchived, false));
    }

    if (query.isPinned !== undefined) {
      conditions.push(eq(notes.isPinned, query.isPinned === 'true'));
    }

    if (query.search && query.search.trim()) {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(
          like(notes.title, searchTerm),
          like(notes.content, searchTerm)
        )
      );
    }

    let allNotes = await db
      .select()
      .from(notes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));

    // If tagId filter is provided, filter notes having this tag
    if (query.tagId) {
      const noteIdsWithTag = await db
        .select({ noteId: noteTags.noteId })
        .from(noteTags)
        .where(eq(noteTags.tagId, query.tagId));
      
      const allowedIds = new Set(noteIdsWithTag.map((r) => r.noteId));
      allNotes = allNotes.filter((n) => allowedIds.has(n.id));
    }

    // Fetch tags and attachments for all retrieved notes
    const noteIds = allNotes.map((n) => n.id);
    let noteTagsMap: Record<string, typeof tags.$inferSelect[]> = {};
    let noteAttachmentsMap: Record<string, typeof attachments.$inferSelect[]> = {};

    if (noteIds.length > 0) {
      const tagJoins = await db
        .select({
          noteId: noteTags.noteId,
          tag: tags,
        })
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(inArray(noteTags.noteId, noteIds));

      for (const row of tagJoins) {
        if (!noteTagsMap[row.noteId]) noteTagsMap[row.noteId] = [];
        noteTagsMap[row.noteId].push(row.tag);
      }

      const allAttachments = await db
        .select()
        .from(attachments)
        .where(inArray(attachments.noteId, noteIds));

      for (const att of allAttachments) {
        if (att.noteId) {
          if (!noteAttachmentsMap[att.noteId]) noteAttachmentsMap[att.noteId] = [];
          noteAttachmentsMap[att.noteId].push({
            ...att,
            fileUrl: `/api/attachments/file/${att.id}`,
          });
        }
      }
    }

    const result = allNotes.map((note) => {
      const atts = noteAttachmentsMap[note.id] || [];
      return {
        ...note,
        content: normalizeNoteContent(note.content, atts),
        tags: noteTagsMap[note.id] || [],
        attachments: atts,
      };
    });

    return result;
  });

  // GET /api/notes/:id - Fetch single note
  fastify.get('/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const noteTagRows = await db
      .select({ tag: tags })
      .from(noteTags)
      .innerJoin(tags, eq(noteTags.tagId, tags.id))
      .where(eq(noteTags.noteId, id));

    const noteAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.noteId, id));

    const mappedAttachments = noteAttachments.map((a) => ({
      ...a,
      fileUrl: `/api/attachments/file/${a.id}`,
    }));

    return {
      ...note,
      content: normalizeNoteContent(note.content, mappedAttachments),
      tags: noteTagRows.map((r) => r.tag),
      attachments: mappedAttachments,
    };
  });

  // POST /api/notes - Create new note
  fastify.post('/notes', async (request, reply) => {
    const parsed = createNoteSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { title, content, isPinned, isArchived, color, tagIds } = parsed.data;
    const noteId = uuidv4();

    await db.insert(notes).values({
      id: noteId,
      title: title || 'Untitled Note',
      content: content || '',
      isPinned: !!isPinned,
      isArchived: !!isArchived,
      color: color || 'slate',
    });

    if (tagIds && tagIds.length > 0) {
      const joins = tagIds.map((tagId) => ({
        noteId,
        tagId,
      }));
      await db.insert(noteTags).values(joins);
    }

    const [createdNote] = await db.select().from(notes).where(eq(notes.id, noteId));
    const attachedTags = tagIds && tagIds.length > 0
      ? await db.select().from(tags).where(inArray(tags.id, tagIds))
      : [];

    return reply.status(201).send({
      ...createdNote,
      tags: attachedTags,
      attachments: [],
    });
  });

  // PUT /api/notes/:id - Update note
  fastify.put('/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateNoteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const [existing] = await db.select().from(notes).where(eq(notes.id, id));
    if (!existing) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const { tagIds, ...fieldsToUpdate } = parsed.data;

    if (Object.keys(fieldsToUpdate).length > 0) {
      await db.update(notes).set(fieldsToUpdate).where(eq(notes.id, id));
    }

    if (tagIds !== undefined) {
      await db.delete(noteTags).where(eq(noteTags.noteId, id));
      if (tagIds.length > 0) {
        await db.insert(noteTags).values(
          tagIds.map((tagId) => ({
            noteId: id,
            tagId,
          }))
        );
      }
    }

    const [updated] = await db.select().from(notes).where(eq(notes.id, id));
    const noteTagRows = await db
      .select({ tag: tags })
      .from(noteTags)
      .innerJoin(tags, eq(noteTags.tagId, tags.id))
      .where(eq(noteTags.noteId, id));

    const noteAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.noteId, id));

    const mappedAttachments = noteAttachments.map((a) => ({
      ...a,
      fileUrl: `/api/attachments/file/${a.id}`,
    }));

    return {
      ...updated,
      content: normalizeNoteContent(updated.content, mappedAttachments),
      tags: noteTagRows.map((r) => r.tag),
      attachments: mappedAttachments,
    };
  });

  // DELETE /api/notes/:id - Delete note and its S3 attachments
  fastify.delete('/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db.select().from(notes).where(eq(notes.id, id));
    if (!existing) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // Delete S3 files associated with this note
    const noteAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.noteId, id));

    for (const att of noteAttachments) {
      if (att.fileKey) {
        await deleteFromS3(att.fileKey).catch((e) =>
          console.warn(`Failed to delete S3 file: ${att.fileKey}`, e)
        );
      }
    }

    // Delete attachments from DB
    await db.delete(attachments).where(eq(attachments.noteId, id));
    // Delete note tags
    await db.delete(noteTags).where(eq(noteTags.noteId, id));
    // Delete note
    await db.delete(notes).where(eq(notes.id, id));

    return { success: true, message: 'Note and attachments deleted' };
  });
};
