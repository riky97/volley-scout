import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { COMMON_BUTTONS } from '@shared/copy';
import styles from './Dialog.module.scss';

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string | undefined;
  readonly confirmLabel?: string | undefined;
  readonly cancelLabel?: string | undefined;
  readonly destructive?: boolean | undefined;
  readonly onConfirm?: (() => void) | undefined;
  readonly onCancel: () => void;
  readonly children?: ReactNode | undefined;
}

/**
 * Modal dialog with focus trapping. Focus lands on the least destructive button,
 * Escape always cancels, and the backdrop never closes a destructive confirmation by accident.
 */
export function Dialog({
  open,
  title,
  description,
  confirmLabel = COMMON_BUTTONS.confirm,
  cancelLabel = COMMON_BUTTONS.cancel,
  destructive = false,
  onConfirm,
  onCancel,
  children,
}: DialogProps): React.JSX.Element | null {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (panel === null) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.backdrop}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description !== undefined && (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        )}
        {children}
        <div className={styles.actions}>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {onConfirm !== undefined && (
            <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
