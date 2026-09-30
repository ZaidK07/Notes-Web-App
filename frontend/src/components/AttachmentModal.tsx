import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Trash,
  ArrowSquareOut,
  Image as ImageIcon,
  Check,
} from '@phosphor-icons/react';
import { Attachment } from '../types';
import { format } from 'date-fns';
import { ConfirmModal } from './ConfirmModal';

interface AttachmentModalProps {
  attachment: Attachment | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
  attachment,
  onClose,
  onDelete,
  onShowToast,
}) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!attachment) return null;

  const formattedSize =
    attachment.fileSize > 1024 * 1024
      ? `${(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB`
      : `${(attachment.fileSize / 1024).toFixed(1)} KB`;

  const formattedDate = attachment.createdAt
    ? format(new Date(attachment.createdAt), 'MMM d, yyyy HH:mm')
    : 'Recently';

  const handleCopyMarkdown = () => {
    const md = `![${attachment.fileName}](${attachment.fileUrl})`;
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    onShowToast('Markdown image tag copied to clipboard', 'success');
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(attachment.fileUrl);
    setCopiedUrl(true);
    onShowToast('Direct S3 URL copied to clipboard', 'success');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleConfirmDelete = async () => {
    await onDelete(attachment.id);
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-500">
                <ImageIcon size={20} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {attachment.fileName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formattedSize} &bull; {formattedDate}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Image Preview Container */}
          <div className="flex-1 overflow-auto p-6 bg-slate-950/5 dark:bg-slate-950/40 flex items-center justify-center min-h-[250px]">
            <img
              src={attachment.fileUrl}
              alt={attachment.fileName}
              className="max-h-[50vh] max-w-full rounded-xl object-contain shadow-lg border border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Metadata & Actions Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Metadata pill */}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[280px]">
              Key: {attachment.fileKey}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copiedMd ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>Copy Markdown Tag</span>
              </button>

              <button
                onClick={handleCopyUrl}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copiedUrl ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>Copy Direct Link</span>
              </button>

              <a
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
                title="Open in new tab"
              >
                <ArrowSquareOut size={16} />
              </a>

              <button
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shadow-sm"
                title="Delete from S3 and Note"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Delete Image Attachment"
        message="Are you sure you want to permanently delete this image from S3 storage? This action cannot be undone."
        confirmLabel="Delete Attachment"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </>
  );
};
