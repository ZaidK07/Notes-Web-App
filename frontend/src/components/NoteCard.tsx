import React from 'react';
import {
  PushPin,
  Archive,
  ArrowCounterClockwise,
  Trash,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { Note } from '../types';

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
    const d = new Date(dateStr);
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
  const timeStr = formatShortTime(note.updatedAt);
  const imageCount = note.attachments?.length || 0;
  const firstTag = note.tags && note.tags.length > 0 ? note.tags[0] : null;

  return (
    <div
      onClick={onSelect}
      className={`group relative px-3 py-2.5 rounded-xl border transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-brand-50/90 dark:bg-brand-950/50 border-brand-500 shadow-sm shadow-brand-500/10'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 shadow-sm'
      }`}
    >
      {/* Line 1: Title + Pin + Metadata & Hover Actions */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5 flex-1 min-w-0">
          {note.isPinned && (
            <PushPin
              size={12}
              weight="fill"
              className="text-amber-500 shrink-0 transform rotate-45"
            />
          )}
          <span className="truncate">{note.title || 'Untitled Note'}</span>
        </h3>

        {/* Right side: Image count & Time (or hover action buttons) */}
        <div className="flex items-center gap-1.5 shrink-0 h-4">
          {imageCount > 0 && (
            <span className="flex items-center gap-0.5 text-brand-600 dark:text-brand-400 text-[10px] font-medium">
              <ImageIcon size={11} weight="bold" />
              <span>{imageCount}</span>
            </span>
          )}

          {/* Normal: Relative Time */}
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono group-hover:hidden">
            {timeStr}
          </span>

          {/* Hover: Quick Action Buttons */}
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(e);
              }}
              className={`p-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors ${
                note.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
              }`}
              title={note.isPinned ? 'Unpin note' : 'Pin note'}
            >
              <PushPin size={12} weight={note.isPinned ? 'fill' : 'regular'} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleArchive(e);
              }}
              className="p-0.5 rounded text-slate-400 hover:text-brand-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              title={note.isArchived ? 'Restore note' : 'Archive note'}
            >
              {note.isArchived ? (
                <ArrowCounterClockwise size={12} />
              ) : (
                <Archive size={12} />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e);
              }}
              className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
              title="Delete note"
            >
              <Trash size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Line 2: Tag + Single-Line Clean Snippet Preview */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
        {firstTag && (
          <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9.5px] font-medium shrink-0">
            #{firstTag.name}
          </span>
        )}
        <span className="truncate text-slate-500 dark:text-slate-400 font-normal">
          {snippetText || 'No additional text'}
        </span>
      </div>
    </div>
  );
};
