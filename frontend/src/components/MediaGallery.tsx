import React, { useState } from 'react';
import {
  Images,
  MagnifyingGlass,
  FileImage,
  ArrowsOut,
} from '@phosphor-icons/react';
import { Attachment } from '../types';

interface MediaGalleryProps {
  attachments: Attachment[];
  onSelectAttachment: (attachment: Attachment) => void;
  onNavigateToNote: (noteId: string) => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  attachments,
  onSelectAttachment,
  onNavigateToNote,
}) => {
  const [search, setSearch] = useState('');

  const filtered = attachments.filter((att) =>
    att.fileName.toLowerCase().includes(search.toLowerCase()) ||
    (att.noteTitle && att.noteTitle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 bg-slate-50/50 dark:bg-slate-950/40">
      {/* Top Gallery Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Images size={24} weight="duotone" className="text-brand-500" />
            <span>Media Gallery (S3 Storage)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse and inspect all {attachments.length} image attachments uploaded across your notes.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search images or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
          />
        </div>
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-600">
          <FileImage size={48} weight="thin" className="mb-2 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium">No attachments found</p>
          <p className="text-xs mt-1">Paste or insert images into any note to upload them to S3.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-start content-start pr-1">
          {filtered.map((att) => {
            const displayUrl = `/api/attachments/file/${att.id}`;

            return (
              <div
                key={att.id}
                onClick={() => onSelectAttachment(att)}
                className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col"
              >
                {/* Fixed Aspect Ratio Thumbnail */}
                <div className="w-full h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden relative flex items-center justify-center">
                  <img
                    src={displayUrl}
                    alt={att.fileName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                    }}
                  />
                  {/* Hover overlay with inspect button */}
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-lg flex items-center gap-1.5">
                      <ArrowsOut size={13} weight="bold" />
                      <span>Inspect</span>
                    </span>
                  </div>
                </div>

                {/* Card Info Footer */}
                <div className="p-3 flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.fileName}>
                    {att.fileName}
                  </span>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span>{(att.fileSize / 1024).toFixed(0)} KB</span>
                    {att.noteId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToNote(att.noteId!);
                        }}
                        className="hover:text-brand-500 hover:underline truncate max-w-[90px]"
                        title={`Jump to note: ${att.noteTitle || 'Note'}`}
                      >
                        {att.noteTitle || 'View note'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
