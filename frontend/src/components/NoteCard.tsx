import React from 'react';
import {
  PushPin,
  Archive,
  ArrowCounterClockwise,
  Trash,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { Note } from '../types';
import { parseLocalTime } from './MediaGallery';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onToggleArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function getCleanSnippet(content?: string): string {
  if (!content) return '';
  return content
    // Remove markdown images: ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove markdown task checklist boxes: - [ ] or - [x]
    .replace(/^[-*+]\s*\[[ xX]\]\s*/gm, '')
    // Replace markdown links with link text: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common entities
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Remove markdown formatting headers/bullets/symbols
    .replace(/^[#>-]\s+/gm, '')
    .replace(/[*_~]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function formatShortTime(dateStr?: string | Date): string {
  if (!dateStr) return '';
  try {
    const d = parseLocalTime(dateStr);
    if (!d) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000 && diffMs >= 0) return 'Just now';
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected,
  onSelect,
  onTogglePin,
  onToggleArchive,
  onDelete,
}) => {
  const snippetText = getCleanSnippet(note.content);
  const timeStr = formatShortTime(note.updatedAt || note.createdAt);
  const mdImagesCount = (note.content?.match(/!\[.*?\]\(.*?\)|<img[^>]+>/gi) || []).length;
  const dbImagesCount = note.attachments?.length || 0;
  const imageCount = Math.max(dbImagesCount, mdImagesCount);
  const firstTag = note.tags && note.tags.length > 0 ? note.tags[0] : null;

  return (
    <div
      onClick={onSelect}
      className={`group relative p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col gap-1.5 ${
        isSelected
          ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 shadow-sm'
      }`}
    >
      {/* Row 1: Title + Direct Action Controls */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5 flex-1 min-w-0 tracking-tight">
          {note.isPinned && (
            <PushPin
              size={12}
              weight="fill"
              className="text-amber-500 shrink-0 transform rotate-45"
            />
          )}
          <span className="truncate">{note.title || 'Untitled Note'}</span>
        </h3>

        {/* Direct Action Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(e);
            }}
            className={`p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors ${
              note.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
            }`}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <PushPin size={13} weight={note.isPinned ? 'fill' : 'regular'} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleArchive(e);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-brand-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            title={note.isArchived ? 'Restore note' : 'Archive note'}
          >
            {note.isArchived ? (
              <ArrowCounterClockwise size={13} />
            ) : (
              <Archive size={13} />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
            title="Delete note"
          >
            <Trash size={13} />
          </button>
        </div>
      </div>

      {/* Row 2: Full-width 1-line content snippet preview */}
      <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed font-normal">
        {snippetText || 'No content'}
      </p>

      {/* Row 3: Metadata Footer (Tags, Image Counter, Timestamp) */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          {firstTag && (
            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9.5px] font-medium shrink-0 truncate max-w-[120px]">
              #{firstTag.name}
            </span>
          )}

          {imageCount > 0 && (
            <span className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 text-[10px] font-medium bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.2 rounded">
              <ImageIcon size={11} weight="bold" />
              <span>{imageCount}</span>
            </span>
          )}
        </div>

        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0 ml-auto">
          {timeStr}
        </span>
      </div>
    </div>
  );
};
