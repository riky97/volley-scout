import { Dialog } from './ui/Dialog';
import { DIALOGS } from '@shared/copy';

export interface CloseConfirmationDialogProps {
  readonly open: boolean;
  readonly hasUnsavedChanges: boolean;
  readonly closeFailed: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function describe(closeFailed: boolean, hasUnsavedChanges: boolean): string {
  if (closeFailed) return DIALOGS.confirmQuit.bodyFailed;
  return hasUnsavedChanges ? DIALOGS.confirmQuit.bodyUnsaved : DIALOGS.confirmQuit.body;
}

/** Asks before the window closes; the save, if any, is flushed by the confirm handler. */
export function CloseConfirmationDialog({
  open,
  hasUnsavedChanges,
  closeFailed,
  onConfirm,
  onCancel,
}: CloseConfirmationDialogProps): React.JSX.Element {
  return (
    <Dialog
      open={open}
      title={DIALOGS.confirmQuit.title}
      description={describe(closeFailed, hasUnsavedChanges)}
      confirmLabel={DIALOGS.confirmQuit.confirm}
      cancelLabel={DIALOGS.confirmQuit.cancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
