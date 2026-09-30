import React from 'react';
import {
  Sun,
  Moon,
  MagnifyingGlass,
  Database,
  CloudCheck,
  CloudSlash,
  ChartBar,
  Plus,
  CaretRight,
} from '@phosphor-icons/react';
import { HealthStatus, ViewFilter } from '../types';

interface HeaderProps {
  currentView: ViewFilter;
  activeNoteTitle?: string;
  onSelectView?: (view: ViewFilter) => void;
  onNewNote: () => void;
  onOpenSearch: () => void;
  onOpenStats: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  health: HealthStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeNoteTitle,
  onSelectView,
  onNewNote,
  onOpenSearch,
  onOpenStats,
  theme,
  onToggleTheme,
  health,
}) => {
  const getViewLabel = () => {
    if (currentView === 'all') return 'All Notes';
    if (currentView === 'pinned') return 'Pinned Notes';
    if (currentView === 'archived') return 'Archived';
    if (currentView === 'gallery') return 'Media Gallery';
    if (currentView.startsWith('tag:')) return `Tag: #${currentView.replace('tag:', '')}`;
    return 'Notes';
  };

  const isDbOk = health?.services?.database?.status === 'connected';
  const isS3Ok = health?.services?.s3?.status === 'connected';

  return (
    <header className="h-16 px-6 flex items-center justify-between glass-panel z-20 shadow-sm shrink-0 transition-colors duration-200">
      {/* Left: Brand & Breadcrumbs */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <button
          onClick={() => onSelectView?.('all')}
          className="flex items-center gap-2.5 text-brand-900 dark:text-white shrink-0 hover:opacity-80 transition-opacity text-left"
          title="Go to All Notes"
        >
          <img src="/favicon.svg" alt="Notes Logo" className="w-6 h-6 shrink-0" />
          <h1 className="text-lg font-semibold tracking-tight hidden lg:block">Notes App</h1>
        </button>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 min-w-0 text-sm overflow-x-auto scrollbar-none py-1 ml-2">
          <CaretRight size={12} weight="bold" className="text-slate-400 dark:text-slate-600 shrink-0" />
          <button
            onClick={() => onSelectView?.(currentView)}
            className="px-2 py-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap font-medium cursor-pointer"
            title={`View ${getViewLabel()}`}
          >
            {getViewLabel()}
          </button>

          {activeNoteTitle && (
            <>
              <CaretRight size={12} weight="bold" className="text-slate-400 dark:text-slate-600 shrink-0" />
              <span className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap truncate max-w-[200px]">
                {activeNoteTitle}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Middle: Search Trigger (Cmd+K) */}
      <div className="hidden md:flex items-center px-3">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-brand-400 dark:hover:border-brand-500 text-xs text-slate-500 dark:text-slate-400 transition-all shadow-sm group w-52 justify-between"
        >
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={14} className="text-slate-400 group-hover:text-brand-500" />
            <span>Search notes...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        {/* Connection Status Badges */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-help"
            title={isDbOk ? 'MySQL Connected' : `MySQL: ${health?.services?.database?.error || 'Offline'}`}
          >
            <Database size={13} className={isDbOk ? 'text-emerald-500' : 'text-rose-500'} />
            <span>MySQL</span>
          </div>
          <div className="w-[1px] h-3 bg-slate-300 dark:bg-slate-700" />
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-help"
            title={
              isS3Ok
                ? 'S3 Storage Connected'
                : health?.services?.s3?.status === 'unconfigured'
                ? 'S3 Unconfigured'
                : `S3 Error: ${health?.services?.s3?.message}`
            }
          >
            {isS3Ok ? (
              <CloudCheck size={13} className="text-emerald-500" />
            ) : (
              <CloudSlash size={13} className="text-amber-500" />
            )}
            <span>S3</span>
          </div>
        </div>

        {/* Stats Button */}
        <button
          onClick={onOpenStats}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
          title="Notebook Statistics"
        >
          <ChartBar size={16} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun size={16} className="text-amber-400" />
          ) : (
            <Moon size={16} className="text-slate-700" />
          )}
        </button>

        {/* New Note Button */}
        <button
          onClick={onNewNote}
          className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={15} weight="bold" />
          <span>New Note</span>
        </button>
      </div>
    </header>
  );
};
