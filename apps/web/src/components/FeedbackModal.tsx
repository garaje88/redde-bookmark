import type { JSX } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'info' | 'success' | 'error';
  confirmText?: string;
}

const VARIANT_STYLES: Record<NonNullable<FeedbackModalProps['variant']>, {
  bg: string;
  text: string;
  label: string;
  icon: JSX.Element;
}> = {
  info: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    label: 'Información',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18h.01M12 6h.01" />
      </svg>
    )
  },
  success: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Listo',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  error: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    label: 'Ups',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }
};

export default function FeedbackModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  confirmText = 'Entendido'
}: FeedbackModalProps) {
  if (!isOpen) return null;
  const style = VARIANT_STYLES[variant];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg}`}>
                <span className={style.text}>{style.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">
                  {style.label}
                </p>
                <h2 className="text-lg font-semibold text-white mt-1">{title}</h2>
                <p className="text-sm text-zinc-400 mt-1">{message}</p>
              </div>
            </div>
          </div>
          <div className="p-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
