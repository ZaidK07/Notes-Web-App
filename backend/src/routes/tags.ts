import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tags, noteTags } from '../db/schema.js';
import { z } from 'zod';

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional().default('brand'),
});

export const tagRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/tags - Get all tags with note count
  fastify.get('/tags', async (request, reply) => {
    const allTags = await db.select().from(tags).orderBy(tags.name);

    const counts = await db
      .select({
        tagId: noteTags.tagId,
        count: count(noteTags.noteId),
      })
      .from(noteTags)
      .groupBy(noteTags.tagId);

    const countMap = Object.fromEntries(counts.map((c) => [c.tagId, c.count]));

    return allTags.map((t) => ({
      ...t,
      noteCount: countMap[t.id] || 0,
    }));
  });

  // POST /api/tags - Create a new tag
  fastify.post('/tags', async (request, reply) => {
    const parsed = createTagSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { name, color } = parsed.data;
    const cleanName = name.trim().toLowerCase();

    // Check if tag already exists
    const [existing] = await db.select().from(tags).where(eq(tags.name, cleanName));
    if (existing) {
      return existing;
    }

    const id = uuidv4();
    await db.insert(tags).values({
      id,
      name: cleanName,
      color: color || 'brand',
    });

    const [created] = await db.select().from(tags).where(eq(tags.id, id));
    return reply.status(201).send({ ...created, noteCount: 0 });
  });

  // DELETE /api/tags/:id - Delete tag
  fastify.delete('/tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(noteTags).where(eq(noteTags.tagId, id));
    await db.delete(tags).where(eq(tags.id, id));
    return { success: true, message: 'Tag deleted' };
  });
};
