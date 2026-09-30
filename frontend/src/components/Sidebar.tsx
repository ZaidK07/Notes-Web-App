import React, { useState } from 'react';
import {
  NoteBlank,
  PushPin,
  Archive,
  Images,
  Plus,
  Trash,
  X,
  HardDrives,
  CheckCircle,
  SidebarSimple,
} from '@phosphor-icons/react';
import { Tag, ViewFilter, Stats } from '../types';

interface SidebarProps {
  currentView: ViewFilter;
  onSelectView: (view: ViewFilter) => void;
  tags: Tag[];
  onCreateTag: (name: string) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
  stats: Stats | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  tags,
  onCreateTag,
  onDeleteTag,
  stats,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [submittingTag, setSubmittingTag] = useState(false);

  const handleCreateTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || submittingTag) return;
    try {
      setSubmittingTag(true);
      await onCreateTag(newTagName.trim());
      setNewTagName('');
      setIsCreatingTag(false);
    } finally {
      setSubmittingTag(false);
    }
  };

  const navItems = [
    {
      id: 'all' as ViewFilter,
      label: 'All Notes',
      icon: NoteBlank,
      count: stats?.activeNotes ?? 0,
    },
    {
      id: 'pinned' as ViewFilter,
      label: 'Pinned',
      icon: PushPin,
      count: stats?.pinnedNotes ?? 0,
    },
    {
      id: 'gallery' as ViewFilter,
      label: 'Media Gallery',
      icon: Images,
      count: stats?.totalAttachments ?? 0,
    },
    {
      id: 'archived' as ViewFilter,
      label: 'Archive',
      icon: Archive,
      count: stats?.archivedNotes ?? 0,
    },
  ];

  return (
    <aside
      className={`border-r border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/60 backdrop-blur-md flex flex-col shrink-0 select-none transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / Collapse Toggle */}
      <div className="p-3 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Notebook
          </div>
        ) : null}
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <SidebarSimple size={16} />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-between'
              } px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
              title={isCollapsed ? `${item.label} (${item.count})` : undefined}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                {!isCollapsed && <span>{item.label}</span>}
              </div>
              {!isCollapsed && item.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-2">
        <div className="h-[1px] bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Tags Section */}
      {!isCollapsed ? (
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 scrollbar-none">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Tags
            </span>
            <button
              onClick={() => setIsCreatingTag(!isCreatingTag)}
              className="p-1 rounded-md text-slate-400 hover:text-brand-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Add Tag"
            >
              <Plus size={14} weight="bold" />
            </button>
          </div>

          {isCreatingTag && (
            <form onSubmit={handleCreateTagSubmit} className="px-2 py-1 flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                autoFocus
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setIsCreatingTag(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </form>
          )}

          {tags.length === 0 && !isCreatingTag && (
            <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 italic">
              No tags yet
            </div>
          )}

          {tags.map((tag) => {
            const viewKey: ViewFilter = `tag:${tag.id}`;
            const isActive = currentView === viewKey;

            return (
              <div
                key={tag.id}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <button
                  onClick={() => onSelectView(viewKey)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                  <span className="truncate">#{tag.name}</span>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  {tag.noteCount !== undefined && tag.noteCount > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.2 rounded font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                    >
                      {tag.noteCount}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTag(tag.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 transition-opacity"
                    title="Delete tag"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-2 flex flex-col items-center">
          {tags.map((tag) => {
            const viewKey: ViewFilter = `tag:${tag.id}`;
            const isActive = currentView === viewKey;
            return (
              <button
                key={tag.id}
                onClick={() => onSelectView(viewKey)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={`#${tag.name}`}
              >
                #
              </button>
            );
          })}
        </div>
      )}

      {/* Storage Footer Info */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800">
        {!isCollapsed ? (
          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <HardDrives size={14} className="text-brand-500" /> Storage
              </span>
              <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                <CheckCircle size={12} weight="fill" /> Ready
              </span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              {stats?.totalNotes ?? 0} notes &bull; {stats?.totalAttachments ?? 0} images in S3
            </div>
          </div>
        ) : (
          <div
            className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-500 cursor-pointer"
            title={`${stats?.totalNotes ?? 0} notes, ${stats?.totalAttachments ?? 0} S3 images`}
          >
            <HardDrives size={18} />
          </div>
        )}
      </div>
    </aside>
  );
};
