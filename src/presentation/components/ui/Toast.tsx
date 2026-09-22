import { useEffect } from 'react';
import { create } from 'zustand';
import clsx from 'clsx';
import { COMMON_BUTTONS } from '@shared/copy';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly tone: ToastTone;
}

interface ToastStoreState {
  readonly toasts: readonly Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    counter += 1;
    const toast: Toast = { id: `toast-${String(counter)}`, message, tone };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

/** Convenience for non-React code paths. */
export function showToast(message: string, tone: ToastTone = 'info'): void {
  useToastStore.getState().push(message, tone);
}

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)]',
  success: 'border-[var(--outcome-point)] bg-[var(--outcome-point-soft)] text-[var(--text)]',
  warning: 'border-[var(--outcome-negative)] bg-[var(--outcome-negative-soft)] text-[var(--text)]',
  error: 'border-[var(--outcome-error)] bg-[var(--outcome-error-soft)] text-[var(--text)]',
};

const TONE_PREFIX: Record<ToastTone, string> = {
  info: 'Info',
  success: 'OK',
  warning: 'Attenzione',
  error: 'Errore',
};

function ToastRow({ toast }: { readonly toast: Toast }): React.JSX.Element {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss(toast.id);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, dismiss]);

  return (
    <div
      className={clsx(
        'flex items-start gap-[var(--sp-3)] rounded-[var(--radius-md)] border px-[var(--sp-4)]',
        'py-[var(--sp-3)] shadow-[var(--shadow-1)]',
        TONE_CLASSES[toast.tone],
      )}
    >
      <span className="font-semibold">{TONE_PREFIX[toast.tone]}:</span>
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        className="underline"
        onClick={() => {
          dismiss(toast.id);
        }}
      >
        {COMMON_BUTTONS.close}
      </button>
    </div>
  );
}

/** Non-critical feedback only; errors that block the operator use a dialog instead. */
export function Toaster(): React.JSX.Element {
  const toasts = useToastStore((state) => state.toasts);
  return (
    <div
      className="pointer-events-none fixed bottom-[var(--sp-5)] right-[var(--sp-5)] z-50 flex w-[380px] flex-col gap-[var(--sp-3)]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastRow toast={toast} />
        </div>
      ))}
    </div>
  );
}
