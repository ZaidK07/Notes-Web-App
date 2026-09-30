import { mysqlTable, varchar, text, boolean, timestamp, int, primaryKey } from 'drizzle-orm/mysql-core';

export const notes = mysqlTable('notes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull().default('Untitled Note'),
  content: text('content').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  color: varchar('color', { length: 20 }).default('slate'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const tags = mysqlTable('tags', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  color: varchar('color', { length: 20 }).default('brand'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const noteTags = mysqlTable('note_tags', {
  noteId: varchar('note_id', { length: 36 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
  tagId: varchar('tag_id', { length: 36 }).notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.noteId, table.tagId] }),
}));

export const attachments = mysqlTable('attachments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  noteId: varchar('note_id', { length: 36 }).references(() => notes.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileKey: varchar('file_key', { length: 512 }).notNull(),
  fileUrl: varchar('file_url', { length: 1024 }).notNull(),
  fileSize: int('file_size').default(0),
  mimeType: varchar('mime_type', { length: 100 }).default('image/png'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
