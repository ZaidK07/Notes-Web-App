import React, { useEffect } from 'react';
import {
  X,
  ChartBar,
  Database,
  CloudCheck,
  Tag as TagIcon,
  PushPin,
  Archive,
  Images,
  NotePencil,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { HealthStatus, Stats } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Stats | null;
  health: HealthStatus | null;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  health,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDbOk = health?.services?.database?.status === 'connected';
  const isS3Ok = health?.services?.s3?.status === 'connected';

  const statCards = [
    {
      label: 'Active Notes',
      value: stats?.activeNotes ?? 0,
      icon: NotePencil,
      color: 'text-brand-500 bg-brand-50 dark:bg-brand-950/60',
    },
    {
      label: 'Pinned Notes',
      value: stats?.pinnedNotes ?? 0,
      icon: PushPin,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',
    },
    {
      label: 'S3 Images',
      value: stats?.totalAttachments ?? 0,
      icon: Images,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      label: 'Tags Created',
      value: stats?.totalTags ?? 0,
      icon: TagIcon,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/60',
    },
    {
      label: 'Archived Notes',
      value: stats?.archivedNotes ?? 0,
      icon: Archive,
      color: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-500">
              <ChartBar size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Notebook Statistics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System health and notebook metrics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* System Services Status */}
        <div className="my-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Storage & Database Status
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Database size={15} className={isDbOk ? 'text-emerald-500' : 'text-rose-500'} />
              MySQL Database
            </span>
            <span
              className={`flex items-center gap-1 font-medium ${
                isDbOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isDbOk ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} />}
              {isDbOk ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <CloudCheck size={15} className={isS3Ok ? 'text-emerald-500' : 'text-amber-500'} />
              S3 Image Storage
            </span>
            <span
              className={`flex items-center gap-1 font-medium ${
                isS3Ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isS3Ok ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} />}
              {isS3Ok ? 'Connected' : health?.services?.s3?.status || 'Unconfigured'}
            </span>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{c.label}</span>
                  <div className={`p-1.5 rounded-lg ${c.color}`}>
                    <Icon size={14} weight="bold" />
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {c.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
