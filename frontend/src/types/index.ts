export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt?: string;
  noteCount?: number;
}

export interface Attachment {
  id: string;
  noteId?: string | null;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  noteTitle?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  attachments: Attachment[];
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: {
      status: 'connected' | 'error';
      error?: string | null;
    };
    s3: {
      status: 'connected' | 'unconfigured' | 'error';
      message: string;
    };
  };
}

export interface Stats {
  totalNotes: number;
  activeNotes: number;
  pinnedNotes: number;
  archivedNotes: number;
  totalAttachments: number;
  totalTags: number;
}

export type ViewFilter = 'all' | 'pinned' | 'archived' | 'gallery' | `tag:${string}`;
