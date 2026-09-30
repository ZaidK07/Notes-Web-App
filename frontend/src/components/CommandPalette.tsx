import React, { useState, useEffect, useRef } from 'react';
import {
  MagnifyingGlass,
  NotePencil,
  Plus,
  Sun,
  Moon,
  Images,
  PushPin,
  Archive,
  CaretRight,
} from '@phosphor-icons/react';
import { Note, ViewFilter } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onNewNote: () => void;
  onSelectView: (view: ViewFilter) => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onNewNote,
  onSelectView,
  onToggleTheme,
  isDark,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent listener
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter notes
  const matchedNotes = notes.filter((n) =>
    (n.title && n.title.toLowerCase().includes(query.toLowerCase())) ||
    (n.content && n.content.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 6);

  // Command items
  const commands = [
    {
      id: 'new-note',
      label: 'Create New Note',
      icon: Plus,
      action: () => {
        onNewNote();
        onClose();
      },
    },
    {
      id: 'view-pinned',
      label: 'Go to Pinned Notes',
      icon: PushPin,
      action: () => {
        onSelectView('pinned');
        onClose();
      },
    },
    {
      id: 'view-gallery',
      label: 'Open Media Gallery (S3)',
      icon: Images,
      action: () => {
        onSelectView('gallery');
        onClose();
      },
    },
    {
      id: 'view-archived',
      label: 'Go to Archive',
      icon: Archive,
      action: () => {
        onSelectView('archived');
        onClose();
      },
    },
    {
      id: 'toggle-theme',
      label: `Switch to ${isDark ? 'Light' : 'Dark'} Mode`,
      icon: isDark ? Sun : Moon,
      action: () => {
        onToggleTheme();
        onClose();
      },
    },
  ].filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  const totalItems = matchedNotes.length + commands.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (totalItems || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % (totalItems || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < matchedNotes.length) {
        onSelectNote(matchedNotes[selectedIndex]);
        onClose();
      } else {
        const cmdIndex = selectedIndex - matchedNotes.length;
        if (commands[cmdIndex]) {
          commands[cmdIndex].action();
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <MagnifyingGlass size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search notes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-3.5 bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-sm font-medium"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {matchedNotes.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Notes
            </div>
          )}

          {matchedNotes.map((n, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={n.id}
                onClick={() => {
                  onSelectNote(n);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <NotePencil size={16} />
                  <span className="truncate font-medium">{n.title || 'Untitled'}</span>
                </div>
                <CaretRight size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
              </button>
            );
          })}

          {commands.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">
              Commands
            </div>
          )}

          {commands.map((cmd, idx) => {
            const itemIdx = matchedNotes.length + idx;
            const isSelected = selectedIndex === itemIdx;
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={16} />
                  <span className="truncate font-medium">{cmd.label}</span>
                </div>
                <CaretRight size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
              </button>
            );
          })}

          {totalItems === 0 && (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching notes or commands found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
