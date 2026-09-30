import { Note, Tag, Attachment, HealthStatus, Stats } from '../types';

const API_BASE = '/api';

export async function fetchNotes(params?: {
  search?: string;
  tagId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}): Promise<Note[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.tagId) query.append('tagId', params.tagId);
  if (params?.isPinned !== undefined) query.append('isPinned', String(params.isPinned));
  if (params?.isArchived !== undefined) query.append('isArchived', String(params.isArchived));

  const res = await fetch(`${API_BASE}/notes?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function fetchNote(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch note');
  return res.json();
}

export async function createNote(data: {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
  tagIds?: string[];
}): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(
  id: string,
  data: {
    title?: string;
    content?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    color?: string;
    tagIds?: string[];
  }
): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function deleteNote(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete note');
  return res.json();
}

// Tags
export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${API_BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function createTag(name: string, color = 'brand'): Promise<Tag> {
  const res = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error('Failed to create tag');
  return res.json();
}

export async function deleteTag(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/tags/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete tag');
  return res.json();
}

// Attachments & S3
export async function uploadAttachment(file: File, noteId?: string): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  if (noteId) formData.append('noteId', noteId);

  const res = await fetch(`${API_BASE}/attachments/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Failed to upload attachment to S3');
  }

  return res.json();
}

export async function deleteAttachment(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/attachments/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete attachment');
  return res.json();
}

export async function fetchAttachments(): Promise<Attachment[]> {
  const res = await fetch(`${API_BASE}/attachments`);
  if (!res.ok) throw new Error('Failed to fetch attachments');
  return res.json();
}

// Health & Stats
export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}
