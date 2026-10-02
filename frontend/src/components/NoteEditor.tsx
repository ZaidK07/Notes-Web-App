import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  TextHOne,
  TextHTwo,
  TextHThree,
  Code,
  CodeBlock,
  Quotes,
  ListBullets,
  ListNumbers,
  CheckSquare,
  Link,
  Image as ImageIcon,
  PushPin,
  Archive,
  ArrowCounterClockwise,
  Trash,
  Check,
  CircleNotch,
  CodeSimple,
  Eye,
  ArrowSquareOut,
  X,
} from '@phosphor-icons/react';
import { Note, Tag, Attachment } from '../types';
import { uploadAttachment } from '../services/api';
import { LinkModal } from './LinkModal';

interface NoteEditorProps {
  note: Note;
  allTags: Tag[];
  onUpdate: (updatedData: Partial<Note> & { tagIds?: string[] }) => Promise<void>;
  onDelete: () => void;
  onOpenAttachmentModal: (attachment: Attachment) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function getEditorMarkdown(ed: any): string {
  if (!ed) return '';
  return ed.storage?.markdown?.getMarkdown?.() || ed.getText?.() || '';
}

// Custom TipTap Image Node View that renders a sleek picture icon chip at cursor position
const ImageChipNodeView: React.FC<any> = ({ node, deleteNode, selected }) => {
  const { src, alt, title } = node.attrs;
  const displayName = alt || title || 'Attached Image';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('open-image-preview', {
        detail: { src, alt: displayName },
      })
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  };

  return (
    <NodeViewWrapper as="span" className="inline select-none align-baseline">
      <span
        onClick={handleClick}
        className={`group inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 rounded-lg border border-brand-200/90 dark:border-brand-800/80 bg-brand-50/90 dark:bg-brand-950/70 hover:bg-brand-100 dark:hover:bg-brand-900 text-brand-900 dark:text-brand-200 text-xs font-medium cursor-pointer shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] align-middle ${
          selected ? 'ring-2 ring-brand-500 border-brand-500 shadow-sm' : ''
        }`}
        title="Click to view full image in popup"
      >
        <span className="w-3.5 h-3.5 rounded overflow-hidden bg-brand-200/60 dark:bg-brand-800/60 flex items-center justify-center shrink-0 border border-brand-300/40 dark:border-brand-700/40">
          {src ? (
            <img
              src={src}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <ImageIcon size={10} className="text-brand-600 dark:text-brand-400" />
          )}
        </span>

        <span className="max-w-[140px] truncate text-slate-800 dark:text-slate-200 font-medium tracking-tight text-xs">
          {displayName}
        </span>

        <ArrowSquareOut
          size={11}
          className="text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 shrink-0 transition-colors"
        />

        <button
          type="button"
          onClick={handleDelete}
          className="ml-0.5 p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/70 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
          title="Delete image"
        >
          <X size={10} weight="bold" />
        </button>
      </span>
    </NodeViewWrapper>
  );
};

const CustomImageExtension = ImageExtension.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageChipNodeView);
  },
});

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  allTags,
  onUpdate,
  onDelete,
  onOpenAttachmentModal,
  onShowToast,
}) => {
  const [title, setTitle] = useState(note.title);
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [isArchived, setIsArchived] = useState(note.isArchived);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    note.tags ? note.tags.map((t) => t.id) : []
  );

  // Persistent RAW view toggle (default: false / Visual mode)
  const [isRawMode, setIsRawMode] = useState<boolean>(() => {
    return localStorage.getItem('notes_editor_raw_mode') === 'true';
  });

  const [rawContent, setRawContent] = useState(note.content || '');
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalUrl, setLinkModalUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist raw mode preference
  const toggleRawMode = () => {
    setIsRawMode((prev) => {
      const next = !prev;
      localStorage.setItem('notes_editor_raw_mode', String(next));
      return next;
    });
  };

  // Auto-save debouncer
  const triggerAutoSave = (
    newTitle: string,
    newContent: string,
    newPinned: boolean,
    newArchived: boolean,
    newTagIds: string[]
  ) => {
    setSaveStatus('dirty');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await onUpdate({
          title: newTitle,
          content: newContent,
          isPinned: newPinned,
          isArchived: newArchived,
          tagIds: newTagIds,
        });
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('dirty');
        onShowToast('Failed to auto-save note', 'error');
      }
    }, 600);
  };

  // Upload helper that inserts at current cursor position
  const handleUploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast('Only image files are supported', 'error');
      return;
    }

    try {
      setIsUploading(true);
      onShowToast(`Uploading ${file.name} to S3...`, 'info');
      const attachment = await uploadAttachment(file, note.id);

      if (!isRawMode && editor) {
        // Insert directly at current cursor position in TipTap
        editor
          .chain()
          .focus()
          .setImage({
            src: attachment.fileUrl,
            alt: attachment.fileName,
            title: attachment.fileName,
          })
          .run();

        const currentMarkdown = getEditorMarkdown(editor);
        setRawContent(currentMarkdown);
        triggerAutoSave(title, currentMarkdown, isPinned, isArchived, selectedTagIds);
      } else {
        // Insert markdown tag at cursor position in raw textarea
        const textarea = rawTextareaRef.current;
        const mdTag = `\n![${attachment.fileName}](${attachment.fileUrl})\n`;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent =
            rawContent.substring(0, start) + mdTag + rawContent.substring(end);
          setRawContent(newContent);
          triggerAutoSave(title, newContent, isPinned, isArchived, selectedTagIds);
        } else {
          const newContent = rawContent + mdTag;
          setRawContent(newContent);
          triggerAutoSave(title, newContent, isPinned, isArchived, selectedTagIds);
        }
      }

      onShowToast('Image uploaded and inserted', 'success');
      onUpdate({});
    } catch (err: any) {
      onShowToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const [, setEditorStateVersion] = useState(0);

  // TipTap Visual Editor Configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-500 underline cursor-pointer hover:text-brand-600',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list-group',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-list-item',
        },
      }),
      CustomImageExtension.configure({
        inline: true,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder:
          'Write note in Visual Mode... (Paste screenshots with ⌘V or drag & drop images to insert directly at cursor)',
      }),
      Markdown.configure({
        html: true,
        breaks: true,
        linkify: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: note.content || '',
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-full flex-1 text-slate-800 dark:text-slate-200 font-sans leading-relaxed text-sm cursor-text',
      },
      handleDOMEvents: {
        // Catch paste events for image screenshots at cursor position
        paste: (_view, event) => {
          const items = event.clipboardData?.items;
          if (items) {
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                  event.preventDefault();
                  handleUploadAndInsertImage(file);
                  return true;
                }
              }
            }
          }
          return false;
        },
      },
    },
    onSelectionUpdate: () => {
      // Instantly synchronize toolbar active states whenever cursor moves
      setEditorStateVersion((v) => (v + 1) % 10000);
    },
    onTransaction: () => {
      // Ensure instantaneous UI reactivity on any document transformation
      setEditorStateVersion((v) => (v + 1) % 10000);
    },
    onUpdate: ({ editor: ed }) => {
      const markdownOutput = getEditorMarkdown(ed);
      setRawContent(markdownOutput);
      triggerAutoSave(title, markdownOutput, isPinned, isArchived, selectedTagIds);
    },
  });

  // Listen for image chip clicks to open the inspector popup
  useEffect(() => {
    const handleOpenImagePreview = (e: any) => {
      const detail = e.detail;
      if (detail && detail.src) {
        const matchingAtt = note.attachments?.find(
          (a) => a.fileUrl === detail.src || a.fileKey === detail.src
        ) || {
          id: 'preview',
          fileName: detail.alt || 'Attached Image',
          fileKey: detail.src,
          fileUrl: detail.src,
          fileSize: 0,
          mimeType: 'image/png',
          createdAt: new Date().toISOString(),
        };
        onOpenAttachmentModal(matchingAtt);
      }
    };

    window.addEventListener('open-image-preview', handleOpenImagePreview);
    return () => {
      window.removeEventListener('open-image-preview', handleOpenImagePreview);
    };
  }, [note.attachments, onOpenAttachmentModal]);

  // Sync editor when note ID changes
  useEffect(() => {
    setTitle(note.title);
    setIsPinned(note.isPinned);
    setIsArchived(note.isArchived);
    setSelectedTagIds(note.tags ? note.tags.map((t) => t.id) : []);
    setRawContent(note.content || '');
    setSaveStatus('saved');

    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(note.content || '');
    }
  }, [note.id]);

  // Sync TipTap when switching out of Raw Mode
  useEffect(() => {
    if (!isRawMode && editor && !editor.isDestroyed) {
      editor.commands.setContent(rawContent);
    }
  }, [isRawMode]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const contentToSave = isRawMode ? rawContent : getEditorMarkdown(editor);
    triggerAutoSave(val, contentToSave, isPinned, isArchived, selectedTagIds);
  };

  const handleRawContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawContent(val);
    triggerAutoSave(title, val, isPinned, isArchived, selectedTagIds);
  };

  const handleTogglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    const contentToSave = isRawMode ? rawContent : getEditorMarkdown(editor);
    triggerAutoSave(title, contentToSave, next, isArchived, selectedTagIds);
  };

  const handleToggleArchive = () => {
    const next = !isArchived;
    setIsArchived(next);
    const contentToSave = isRawMode ? rawContent : getEditorMarkdown(editor);
    triggerAutoSave(title, contentToSave, isPinned, next, selectedTagIds);
  };

  const handleToggleTag = (tagId: string) => {
    const nextTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(nextTagIds);
    const contentToSave = isRawMode ? rawContent : getEditorMarkdown(editor);
    triggerAutoSave(title, contentToSave, isPinned, isArchived, nextTagIds);
  };

  // Raw mode paste handler
  const handleRawPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleUploadAndInsertImage(file);
            return;
          }
        }
      }
    }
  };

  // Link modal open/save/remove handlers
  const handleOpenLinkModal = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkModalUrl(previousUrl);
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = (url: string) => {
    if (!editor) return;
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  // Click handler to move cursor to the bottom when clicking anywhere in empty editor space
  const handleEditorContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't interfere with button clicks, link clicks, checkbox toggles, or image chip interactions
    if (target.closest('button, a, input, label, [data-node-view-wrapper]')) {
      return;
    }

    if (!isRawMode && editor) {
      // If clicking outside an active text line (e.g. in the vast empty bottom area)
      const isDirectTextNode = target.closest('p, h1, h2, h3, li, blockquote, pre, code');
      if (!isDirectTextNode || target === e.currentTarget) {
        editor.chain().focus('end').run();
      }
    } else if (isRawMode && rawTextareaRef.current) {
      const textarea = rawTextareaRef.current;
      textarea.focus();
      const len = textarea.value.length;
      textarea.setSelectionRange(len, len);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900/40 backdrop-blur-sm">
      {/* Hidden file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadAndInsertImage(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Top Header Bar */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Note Title Input */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled Note..."
            className="text-2xl font-bold bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none flex-1 tracking-tight"
          />

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Save Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 dark:text-slate-500 mr-1">
              {saveStatus === 'saving' ? (
                <>
                  <CircleNotch size={13} className="animate-spin text-brand-500" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span>Saved</span>
                </>
              )}
            </div>

            {/* RAW Mode Toggle Button */}
            <button
              onClick={toggleRawMode}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                isRawMode
                  ? 'bg-brand-500 text-white border-brand-500 shadow-brand-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title={isRawMode ? 'Switch to Visual WYSIWYG Editor' : 'Switch to Raw Markdown View'}
            >
              {isRawMode ? <Eye size={14} weight="bold" /> : <CodeSimple size={14} weight="bold" />}
              <span>{isRawMode ? 'Visual Mode' : 'RAW'}</span>
            </button>

            {/* Pin Toggle */}
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded-xl border transition-colors shadow-sm ${
                isPinned
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
              title={isPinned ? 'Unpin note' : 'Pin note'}
            >
              <PushPin size={16} weight={isPinned ? 'fill' : 'regular'} />
            </button>

            {/* Archive Toggle */}
            <button
              onClick={handleToggleArchive}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-500 transition-colors shadow-sm"
              title={isArchived ? 'Restore note' : 'Archive note'}
            >
              {isArchived ? <ArrowCounterClockwise size={16} /> : <Archive size={16} />}
            </button>

            {/* Delete Note */}
            <button
              onClick={onDelete}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 text-slate-500 hover:text-rose-500 transition-colors shadow-sm"
              title="Delete note"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mr-1">
            Tags:
          </span>
          {allTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Formatting Toolbar (Available in Visual Editor) */}
      {!isRawMode && editor && (
        <div className="px-6 py-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1 flex-wrap bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('bold')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Bold (⌘B)"
          >
            <TextB size={15} weight="bold" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('italic')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Italic (⌘I)"
          >
            <TextItalic size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('strike')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Strikethrough"
          >
            <TextStrikethrough size={15} />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Heading 1"
          >
            <TextHOne size={15} weight="bold" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Heading 2"
          >
            <TextHTwo size={15} weight="bold" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Heading 3"
          >
            <TextHThree size={15} weight="bold" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Bullet List"
          >
            <ListBullets size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Numbered List"
          >
            <ListNumbers size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('taskList')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Task Checklist"
          >
            <CheckSquare size={15} />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('code')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Inline Code"
          >
            <Code size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('codeBlock')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Code Block"
          >
            <CodeBlock size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('blockquote')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Blockquote"
          >
            <Quotes size={15} />
          </button>

          <button
            onClick={handleOpenLinkModal}
            className={`p-1.5 rounded-lg transition-colors ${
              editor.isActive('link')
                ? 'bg-brand-500 text-white'
                : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Insert or Edit Link (⌘K)"
          >
            <Link size={15} />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Insert Image at Cursor */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Insert image at cursor position (or paste directly with ⌘V)"
          >
            {isUploading ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} weight="bold" />
            )}
            <span>Insert Image</span>
          </button>
        </div>
      )}

      {/* Editor Body with balanced bottom static space for full notes & comfortable scrolling */}
      <div
        className="flex-1 overflow-y-auto px-8 pt-6 pb-8 cursor-text flex flex-col scroll-smooth"
        onClick={handleEditorContainerClick}
      >
        {isRawMode ? (
          <div className="flex-1 flex flex-col min-h-full cursor-text">
            <textarea
              ref={rawTextareaRef}
              value={rawContent}
              onChange={handleRawContentChange}
              onPaste={handleRawPaste}
              placeholder="Write raw Markdown here... (⌘V pastes images at cursor position)"
              className="w-full flex-1 min-h-[350px] bg-transparent border-none resize-none text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed focus:outline-none placeholder-slate-400 cursor-text"
            />
            {/* Static non-writable bottom overscroll area */}
            <div
              className="h-[30vh] min-h-[210px] w-full cursor-text shrink-0 select-none"
              onClick={(e) => {
                e.stopPropagation();
                if (rawTextareaRef.current) {
                  rawTextareaRef.current.focus();
                  const len = rawTextareaRef.current.value.length;
                  rawTextareaRef.current.setSelectionRange(len, len);
                }
              }}
            />
          </div>
        ) : (
          <div
            className="flex-1 flex flex-col min-h-full cursor-text"
            onClick={handleEditorContainerClick}
          >
            <EditorContent editor={editor} className="flex-1 flex flex-col min-h-full cursor-text" />
            {/* Static non-writable bottom overscroll area for comfortable scrolling */}
            <div
              className="h-[30vh] min-h-[210px] w-full cursor-text shrink-0 select-none"
              onClick={(e) => {
                e.stopPropagation();
                if (editor) {
                  editor.chain().focus('end').run();
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Custom Link Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        initialUrl={linkModalUrl}
        onSave={handleSaveLink}
        onRemove={handleRemoveLink}
        onClose={() => setIsLinkModalOpen(false)}
      />
    </div>
  );
};
