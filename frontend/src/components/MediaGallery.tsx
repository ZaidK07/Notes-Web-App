import React, { useState, useMemo } from 'react';
import {
  Images,
  MagnifyingGlass,
  FileImage,
  ArrowsOut,
  CalendarBlank,
  X,
  SquaresFour,
  GridFour,
} from '@phosphor-icons/react';
import { Attachment } from '../types';
import { format } from 'date-fns';

type DateFilterType = 'all' | 'day' | 'week' | 'month' | 'year' | 'custom';
type CardDensity = 'comfortable' | 'compact';

interface MediaGalleryProps {
  attachments: Attachment[];
  onSelectAttachment: (attachment: Attachment) => void;
  onNavigateToNote: (noteId: string) => void;
}

export function parseLocalTime(dateVal?: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

  if (typeof dateVal === 'string') {
    const raw = dateVal.trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, y, m, d, h, min, s] = match;
      return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatShortDate(dateStr?: string | Date): string {
  const d = parseLocalTime(dateStr);
  if (!d) return '';
  try {
    return format(d, 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  attachments,
  onSelectAttachment,
  onNavigateToNote,
}) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [cardDensity, setCardDensity] = useState<CardDensity>(() => {
    return (localStorage.getItem('media_gallery_card_density') as CardDensity) || 'comfortable';
  });
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>(() => {
    return (localStorage.getItem('media_gallery_image_fit') as 'contain' | 'cover') || 'contain';
  });

  const handleSetDensity = (density: CardDensity) => {
    setCardDensity(density);
    localStorage.setItem('media_gallery_card_density', density);
  };

  const handleSetImageFit = (fit: 'contain' | 'cover') => {
    setImageFit(fit);
    localStorage.setItem('media_gallery_image_fit', fit);
  };

  const filtered = useMemo(() => {
    const now = new Date();

    return attachments.filter((att) => {
      // Search matching (filename or associated note title)
      const matchesSearch =
        att.fileName.toLowerCase().includes(search.toLowerCase()) ||
        (att.noteTitle && att.noteTitle.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;
      if (dateFilter === 'all') return true;

      const itemDate = parseLocalTime(att.createdAt);
      if (!itemDate) return false;

      switch (dateFilter) {
        case 'day': {
          // Today: from 00:00:00 midnight to right now (or end of today)
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          return itemDate >= startOfToday && itemDate <= now;
        }
        case 'week': {
          // This Week / Past 7 days: from 7 days ago 00:00:00 to right now
          const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
          return itemDate >= startOfWeek && itemDate <= now;
        }
        case 'month': {
          // This Month: from 1st day of current month 00:00:00 to right now
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          return itemDate >= startOfMonth && itemDate <= now;
        }
        case 'year': {
          // This Year: from Jan 1st 00:00:00 to right now
          const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          return itemDate >= startOfYear && itemDate <= now;
        }
        case 'custom': {
          if (!customStartDate && !customEndDate) return true;
          if (customStartDate) {
            const [sYear, sMonth, sDay] = customStartDate.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (customEndDate) {
            const [eYear, eMonth, eDay] = customEndDate.split('-').map(Number);
            const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
            if (itemDate > end) return false;
          }
          return true;
        }
        default:
          return true;
      }
    });
  }, [attachments, search, dateFilter, customStartDate, customEndDate]);

  const filterOptions: { id: DateFilterType; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 bg-slate-50/50 dark:bg-slate-950/40">
      {/* Top Gallery Header */}
      <div className="flex flex-col gap-4 mb-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Images size={24} weight="duotone" className="text-brand-500" />
              <span>Media Gallery (S3 Storage)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Showing {filtered.length} of {attachments.length} image attachments uploaded across your notes.
            </p>
          </div>

          {/* Controls Right Side: Fit Toggle, Density Toggle & Search */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Image Fit Mode (Fit vs Fill) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 gap-1 text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleSetImageFit('contain')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition-all ${
                  imageFit === 'contain'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Fit whole image (no crop)"
              >
                <span>Fit</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetImageFit('cover')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition-all ${
                  imageFit === 'cover'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Fill thumbnail frame (crop)"
              >
                <span>Fill</span>
              </button>
            </div>

            {/* View Mode Density Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 gap-1 text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleSetDensity('comfortable')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                  cardDensity === 'comfortable'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Comfortable Large Cards"
              >
                <SquaresFour size={15} weight={cardDensity === 'comfortable' ? 'bold' : 'regular'} />
                <span>Large</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetDensity('compact')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                  cardDensity === 'compact'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Compact Dense Cards"
              >
                <GridFour size={15} weight={cardDensity === 'compact' ? 'bold' : 'regular'} />
                <span>Compact</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-60">
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
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center gap-2 flex-wrap pb-1">
          {/* Quick Date Range Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 gap-1 text-xs">
            {filterOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  dateFilter === opt.id
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers (shown when Custom is active) */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-xs shadow-sm">
              <div className="flex items-center gap-1.5 pl-1.5 text-slate-500 dark:text-slate-400">
                <CalendarBlank size={14} />
                <span className="font-medium">From:</span>
              </div>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              <span className="text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              {(customStartDate || customEndDate) && (
                <button
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Clear date range"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-600">
          <FileImage size={48} weight="thin" className="mb-2 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium">No attachments match your filters</p>
          <p className="text-xs mt-1">Try selecting a different date range or clearing your search query.</p>
        </div>
      ) : cardDensity === 'compact' ? (
        /* Compact Dense Grid */
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 pr-1 pb-16 [grid-auto-rows:max-content] auto-rows-max">
          {filtered.map((att) => {
            const displayUrl = `/api/attachments/file/${att.id}`;
            const dateDisplay = formatShortDate(att.createdAt);

            return (
              <div
                key={att.id}
                onClick={() => onSelectAttachment(att)}
                className="group relative rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col h-full"
              >
                {/* Compact Aspect Ratio Thumbnail */}
                <div className="w-full h-28 sm:h-32 shrink-0 bg-slate-100/90 dark:bg-slate-800/80 overflow-hidden relative flex items-center justify-center p-1">
                  <img
                    src={displayUrl}
                    alt={att.fileName}
                    loading="lazy"
                    className={`w-full h-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-200`}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                    }}
                  />
                  {/* Hover overlay with inspect button */}
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 shadow-md">
                      <ArrowsOut size={13} weight="bold" />
                    </span>
                  </div>
                </div>

                {/* Compact Card Info Footer */}
                <div className="p-2.5 shrink-0 flex flex-col gap-0.5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.fileName}>
                    {att.fileName}
                  </span>

                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 dark:text-slate-500">
                    <span>{(att.fileSize / 1024).toFixed(0)} KB</span>
                    <span className="truncate max-w-[65px]">{dateDisplay}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Comfortable Large Grid */
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-1 pb-16 [grid-auto-rows:max-content] auto-rows-max">
          {filtered.map((att) => {
            const displayUrl = `/api/attachments/file/${att.id}`;
            const dateDisplay = formatShortDate(att.createdAt);

            return (
              <div
                key={att.id}
                onClick={() => onSelectAttachment(att)}
                className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col h-full"
              >
                {/* Fixed Aspect Ratio Thumbnail */}
                <div className="w-full h-44 shrink-0 bg-slate-100/90 dark:bg-slate-800/80 overflow-hidden relative flex items-center justify-center p-1.5">
                  <img
                    src={displayUrl}
                    alt={att.fileName}
                    loading="lazy"
                    className={`w-full h-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-200`}
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
                <div className="p-3 shrink-0 flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.fileName}>
                    {att.fileName}
                  </span>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      {(att.fileSize / 1024).toFixed(0)} KB {dateDisplay ? `• ${dateDisplay}` : ''}
                    </span>
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
