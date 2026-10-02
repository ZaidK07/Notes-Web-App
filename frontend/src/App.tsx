import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';
import { MediaGallery } from './components/MediaGallery';
import { AttachmentModal } from './components/AttachmentModal';
import { CommandPalette } from './components/CommandPalette';
import { StatsModal } from './components/StatsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { useTheme } from './hooks/useTheme';
import {
  fetchNotes,
  fetchNote,
  createNote,
  updateNote,
  deleteNote,
  fetchTags,
  createTag,
  deleteTag,
  fetchAttachments,
  deleteAttachment,
  fetchHealth,
  fetchStats,
} from './services/api';
import { Note, Tag, Attachment, HealthStatus, Stats, ViewFilter } from './types';
import {
  MagnifyingGlass,
  Plus,
  NoteBlank,
  FolderDashed,
} from '@phosphor-icons/react';

export function NotesAppContent() {
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine view and selected note from URL pathname
  // Routes: /notes/:id?, /pinned/:id?, /archived/:id?, /gallery, /tag/:tagId/:id?
  const pathParts = location.pathname.split('/').filter(Boolean);
  const routeSection = pathParts[0] || 'notes';

  const currentView: ViewFilter = useMemo(() => {
    if (routeSection === 'pinned') return 'pinned';
    if (routeSection === 'archived') return 'archived';
    if (routeSection === 'gallery') return 'gallery';
    if (routeSection === 'tag' && pathParts[1]) return `tag:${pathParts[1]}` as ViewFilter;
    return 'all';
  }, [routeSection, pathParts]);

  const urlNoteId = useMemo(() => {
    if (routeSection === 'gallery') return null;
    if (routeSection === 'tag') return pathParts[2] || null;
    return pathParts[1] || null;
  }, [routeSection, pathParts]);

  // Core state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(urlNoteId);
  const [tags, setTags] = useState<Tag[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('notes_sidebar_collapsed') === 'true';
  });
  const [notesColumnWidth, setNotesColumnWidth] = useState<number>(() => {
    const saved = localStorage.getItem('notes_list_width');
    return saved ? Math.max(260, Math.min(650, parseInt(saved, 10))) : 340;
  });
  const [isDraggingNotesColumn, setIsDraggingNotesColumn] = useState(false);

  useEffect(() => {
    if (!isDraggingNotesColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const sidebarEl = document.getElementById('app-left-sidebar');
      const sidebarWidth = sidebarEl ? sidebarEl.getBoundingClientRect().width : 0;
      const newWidth = Math.max(260, Math.min(650, e.clientX - sidebarWidth));
      setNotesColumnWidth(newWidth);
      localStorage.setItem('notes_list_width', String(newWidth));
    };

    const handleMouseUp = () => {
      setIsDraggingNotesColumn(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingNotesColumn]);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.altKey && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) setIsCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleSearchShortcut, true);
    return () => window.removeEventListener('keydown', handleSearchShortcut, true);
  }, []);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [activeAttachmentModal, setActiveAttachmentModal] = useState<Attachment | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirmation dialogs state
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState<string | null>(null);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Persist sidebar preference
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('notes_sidebar_collapsed', String(next));
      return next;
    });
  };

  // URL Navigation helper
  const navigateToView = (view: ViewFilter, noteId?: string | null) => {
    let targetPath = '/notes';
    if (view === 'pinned') targetPath = '/pinned';
    else if (view === 'archived') targetPath = '/archived';
    else if (view === 'gallery') targetPath = '/gallery';
    else if (view.startsWith('tag:')) {
      const tagId = view.replace('tag:', '');
      targetPath = `/tag/${tagId}`;
    }

    if (noteId && view !== 'gallery') {
      targetPath = `${targetPath}/${noteId}`;
    }

    navigate(targetPath);
  };

  // Load initial global data
  const loadInitialData = async () => {
    try {
      const [fetchedTags, fetchedStats, fetchedHealth, fetchedAttachments] = await Promise.allSettled([
        fetchTags(),
        fetchStats(),
        fetchHealth(),
        fetchAttachments(),
      ]);

      if (fetchedTags.status === 'fulfilled') setTags(fetchedTags.value);
      if (fetchedStats.status === 'fulfilled') setStats(fetchedStats.value);
      if (fetchedHealth.status === 'fulfilled') setHealth(fetchedHealth.value);
      if (fetchedAttachments.status === 'fulfilled') setAttachments(fetchedAttachments.value);
    } catch {
      addToast('Failed to connect to backend service', 'error');
    }
  };

  // Reload notes based on current view filter and search
  const reloadNotes = useCallback(async () => {
    try {
      const isArchived = currentView.startsWith('tag:') ? undefined : currentView === 'archived';
      const isPinned = currentView === 'pinned' ? true : undefined;
      const tagId = currentView.startsWith('tag:') ? currentView.replace('tag:', '') : undefined;

      const fetchedNotes = await fetchNotes({
        search: searchQuery.trim() || undefined,
        isArchived,
        isPinned,
        tagId,
      });

      setNotes(fetchedNotes);

      // Handle note selection from URL: only select if urlNoteId is provided and exists
      if (currentView !== 'gallery') {
        if (urlNoteId && fetchedNotes.some((n) => n.id === urlNoteId)) {
          setSelectedNoteId(urlNoteId);
        } else {
          setSelectedNoteId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentView, searchQuery, urlNoteId]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    reloadNotes();
  }, [currentView, searchQuery]);

  // Sync selectedNoteId when URL changes
  useEffect(() => {
    setSelectedNoteId(urlNoteId);
  }, [urlNoteId]);

  // Active note object
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Handlers
  const handleSelectNoteCard = (note: Note) => {
    setSelectedNoteId(note.id);
    navigateToView(currentView, note.id);
  };

  const handleNewNote = async () => {
    try {
      const defaultTitle = format(new Date(), 'MMM d, h:mm a');
      const tagIds = currentView.startsWith('tag:') ? [currentView.replace('tag:', '')] : [];
      const newNote = await createNote({
        title: defaultTitle,
        content: '',
        tagIds,
      });
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      navigateToView(currentView === 'gallery' || currentView === 'archived' ? 'all' : currentView, newNote.id);
      addToast('New note created', 'success');
      fetchStats().then(setStats).catch(() => {});
      fetchTags().then(setTags).catch(() => {});
    } catch (err) {
      addToast('Failed to create note', 'error');
    }
  };

  const handleUpdateNote = async (updatedData: Partial<Note> & { tagIds?: string[] }) => {
    if (!selectedNoteId) return;
    try {
      const updated = await updateNote(selectedNoteId, updatedData);
      setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? updated : n)));
      fetchStats().then(setStats).catch(() => {});
      fetchTags().then(setTags).catch(() => {});
      fetchAttachments().then(setAttachments).catch(() => {});
    } catch (err) {
      addToast('Failed to update note', 'error');
    }
  };

  const executeDeleteNote = async () => {
    if (!confirmDeleteNoteId) return;
    try {
      await deleteNote(confirmDeleteNoteId);
      const remaining = notes.filter((n) => n.id !== confirmDeleteNoteId);
      setNotes(remaining);
      if (selectedNoteId === confirmDeleteNoteId) {
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setSelectedNoteId(nextId);
        navigateToView(currentView, nextId);
      }
      addToast('Note deleted', 'success');
      fetchStats().then(setStats).catch(() => {});
      fetchAttachments().then(setAttachments).catch(() => {});
    } catch (err) {
      addToast('Failed to delete note', 'error');
    } finally {
      setConfirmDeleteNoteId(null);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      const updated = await updateNote(note.id, { isPinned: !note.isPinned });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      addToast('Failed to toggle pin', 'error');
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      const updated = await updateNote(note.id, { isArchived: !note.isArchived });
      if (currentView.startsWith('tag:')) {
        setNotes((prev) => prev.map((n) => n.id === note.id ? updated : n));
        addToast(updated.isArchived ? 'Note archived' : 'Note restored', 'success');
        fetchStats().then(setStats).catch(() => {});
        return;
      }
      const remaining = notes.filter((n) => n.id !== note.id);
      setNotes(remaining);
      if (selectedNoteId === note.id) {
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setSelectedNoteId(nextId);
        navigateToView(currentView, nextId);
      }
      addToast(updated.isArchived ? 'Note archived' : 'Note restored', 'success');
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      addToast('Failed to archive note', 'error');
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      const tag = await createTag(name);
      setTags((prev) => [...prev, tag]);
      addToast(`Tag #${tag.name} created`, 'success');
    } catch (err) {
      addToast('Failed to create tag', 'error');
    }
  };

  const executeDeleteTag = async () => {
    if (!confirmDeleteTagId) return;
    try {
      await deleteTag(confirmDeleteTagId);
      setTags((prev) => prev.filter((t) => t.id !== confirmDeleteTagId));
      if (currentView === `tag:${confirmDeleteTagId}`) {
        navigateToView('all');
      }
      addToast('Tag removed', 'success');
      reloadNotes();
    } catch (err) {
      addToast('Failed to delete tag', 'error');
    } finally {
      setConfirmDeleteTagId(null);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      await deleteAttachment(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      if (activeNote) {
        const refreshed = await fetchNote(activeNote.id);
        setNotes((prev) => prev.map((n) => (n.id === refreshed.id ? refreshed : n)));
      }
      addToast('Attachment removed from S3', 'success');
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      addToast('Failed to delete attachment', 'error');
    }
  };

  const handleNavigateToNoteFromGallery = async (noteId: string) => {
    try {
      const note = await fetchNote(noteId);
      const view: ViewFilter = note.tags?.length
        ? `tag:${note.tags[0].id}`
        : note.isArchived ? 'archived' : 'all';
      navigateToView(view, noteId);
    } catch {
      addToast('Failed to open note', 'error');
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-200 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navbar */}
      <Header
        currentView={currentView}
        activeNoteTitle={currentView !== 'gallery' ? activeNote?.title : undefined}
        onSelectView={(v) => {
          setSelectedNoteId(null);
          navigateToView(v, null);
        }}
        onNewNote={handleNewNote}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        health={health}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(v) => {
            setSelectedNoteId(null);
            navigateToView(v, null);
          }}
          tags={tags}
          onCreateTag={handleCreateTag}
          onDeleteTag={(id) => {
            setConfirmDeleteTagId(id);
            return Promise.resolve();
          }}
          stats={stats}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Center / Right Content Area */}
        {currentView === 'gallery' ? (
          <MediaGallery
            attachments={attachments}
            onSelectAttachment={setActiveAttachmentModal}
            onNavigateToNote={handleNavigateToNoteFromGallery}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Note List Sub-Column */}
            <div
              style={{ width: `${notesColumnWidth}px` }}
              className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-sm flex flex-col shrink-0 relative select-none"
            >
              {/* Search Bar in Note List */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <MagnifyingGlass
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Filter notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Note Cards List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {notes.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-600">
                    <FolderDashed size={36} weight="thin" className="mb-2" />
                    <p className="text-xs font-medium">No notes in this view</p>
                    <button
                      onClick={handleNewNote}
                      className="mt-2 text-xs text-brand-500 hover:underline font-semibold"
                    >
                      + Create a note
                    </button>
                  </div>
                ) : (
                  notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      onSelect={() => handleSelectNoteCard(note)}
                      onTogglePin={(e) => handleTogglePin(e, note)}
                      onToggleArchive={(e) => handleToggleArchive(e, note)}
                      onDelete={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteNoteId(note.id);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Drag Resize Divider Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingNotesColumn(true);
              }}
              className={`w-1 hover:w-1.5 transition-all cursor-col-resize shrink-0 select-none relative group z-20 ${
                isDraggingNotesColumn
                  ? 'bg-brand-500 w-1.5 shadow-sm'
                  : 'bg-transparent hover:bg-brand-500/50'
              }`}
              title="Drag to resize sidebar width"
            >
              <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
            </div>

            {/* Right Note Editor View */}
            {activeNote ? (
              <NoteEditor
                key={activeNote.id}
                note={activeNote}
                onUpdate={handleUpdateNote}
                onDelete={() => {
                  setConfirmDeleteNoteId(activeNote.id);
                }}
                onOpenAttachmentModal={setActiveAttachmentModal}
                onShowToast={addToast}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500 bg-slate-50/30 dark:bg-slate-950/30 select-none">
                <div className="w-28 h-28 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center mb-6 text-brand-500 shadow-sm">
                  <NoteBlank size={72} weight="duotone" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  Select a note to display
                </h3>
                <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mt-2.5 mb-7 leading-relaxed">
                  Choose a note from the sidebar list to view or edit, or create a new note to start writing.
                </p>
                <button
                  onClick={handleNewNote}
                  className="px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold flex items-center gap-2.5 shadow-md shadow-brand-500/25 transition-all hover:scale-[1.03] active:scale-[0.98]"
                >
                  <Plus size={18} weight="bold" />
                  <span>Create Note</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attachment Image Inspector Modal */}
      <AttachmentModal
        attachment={activeAttachmentModal}
        onClose={() => setActiveAttachmentModal(null)}
        onDelete={handleDeleteAttachment}
        onShowToast={addToast}
      />

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        onSelectNote={(note) => {
          handleSelectNoteCard(note);
        }}
        onNewNote={handleNewNote}
        onSelectView={(v) => {
          setSelectedNoteId(null);
          navigateToView(v, null);
        }}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />

      {/* Stats Modal */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        stats={stats}
        health={health}
      />

      {/* Delete Note Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteNoteId !== null}
        title="Delete Note"
        message="Are you sure you want to permanently delete this note and all its attached images from S3? This action cannot be undone."
        confirmLabel="Delete Note"
        isDestructive={true}
        onConfirm={executeDeleteNote}
        onCancel={() => setConfirmDeleteNoteId(null)}
      />

      {/* Delete Tag Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteTagId !== null}
        title="Delete Tag"
        message="Are you sure you want to delete this tag? Notes with this tag will not be deleted."
        confirmLabel="Delete Tag"
        isDestructive={true}
        onConfirm={executeDeleteTag}
        onCancel={() => setConfirmDeleteTagId(null)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/notes" replace />} />
      <Route path="/notes" element={<NotesAppContent />} />
      <Route path="/notes/:id" element={<NotesAppContent />} />
      <Route path="/pinned" element={<NotesAppContent />} />
      <Route path="/pinned/:id" element={<NotesAppContent />} />
      <Route path="/archived" element={<NotesAppContent />} />
      <Route path="/archived/:id" element={<NotesAppContent />} />
      <Route path="/gallery" element={<NotesAppContent />} />
      <Route path="/tag/:tagId" element={<NotesAppContent />} />
      <Route path="/tag/:tagId/:id" element={<NotesAppContent />} />
      <Route path="*" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}

export default App;
