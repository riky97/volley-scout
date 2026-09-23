import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  Dialog as DialogRoot,
  DialogTitle,
} from './primitives/dialog';
import { COMMON_BUTTONS } from '@shared/copy';

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
 * Confirmation dialog on the shadcn/Radix primitive. Focus lands on the least destructive
 * button, Escape always cancels, and a tap on the backdrop never closes it, so a destructive
 * confirmation cannot be dismissed (or confirmed) by accident.
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
}: DialogProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Radix hands focus back to a DialogTrigger; ours open from code, so remember the element.
  const returnFocusRef = useRef<Element | null>(null);

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        // Radix only asks to close: on Escape, since outside clicks are refused below.
        if (!next) onCancel();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current = document.activeElement;
          cancelRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const previous = returnFocusRef.current;
          if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        // Without a description Radix expects the attribute to be cleared explicitly.
        {...(description === undefined ? { 'aria-describedby': undefined } : {})}
      >
        <DialogTitle>{title}</DialogTitle>
        {description !== undefined && <DialogDescription>{description}</DialogDescription>}
        {children}
        <DialogFooter>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {onConfirm !== undefined && (
            <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
