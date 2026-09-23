import type { ComponentProps } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@presentation/lib/cn';

/*
 * shadcn/ui dialog (new-york), adapted to this app: our tokens instead of shadcn's palette, no
 * open/close animation and no corner close button, so it looks exactly like the dialog it
 * replaced. Radix brings what the hand-written version lacked: the page behind becomes inert
 * for assistive technology, background scroll is locked, and dialogs stack as layers.
 */

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>): React.JSX.Element {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>): React.JSX.Element {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>): React.JSX.Element {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      // z-40 is the dialog layer of the z-index scale in _tokens.scss; toasts sit above at 50.
      className={cn('fixed inset-0 z-40 bg-[rgb(16_23_32/0.55)]', className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>): React.JSX.Element {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-40 max-h-[85vh] w-[min(560px,calc(100%-48px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
          'rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] p-[var(--sp-5)] shadow-[var(--shadow-2)] outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('mt-[var(--sp-5)] flex justify-end gap-[var(--sp-3)]', className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('mb-[var(--sp-3)] text-[length:var(--fs-h2)] font-bold text-[var(--text)]', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'mb-[var(--sp-4)] text-[length:var(--fs-body)] leading-normal text-[var(--text-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle };
