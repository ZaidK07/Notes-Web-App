import React from 'react';
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success' || !t.type;
        const isError = t.type === 'error';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-medium backdrop-blur-md transition-all duration-300 ${
              isSuccess
                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
                : isError
                ? 'bg-rose-950/90 text-rose-100 border-rose-800'
                : 'bg-slate-900/90 text-slate-100 border-slate-700'
            }`}
          >
            {isSuccess && <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />}
            {isError && <WarningCircle size={18} weight="fill" className="text-rose-400 shrink-0" />}
            {!isSuccess && !isError && <Info size={18} weight="fill" className="text-brand-400 shrink-0" />}

            <span className="flex-1">{t.text}</span>

            <button
              onClick={() => onRemove(t.id)}
              className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-white/10 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
