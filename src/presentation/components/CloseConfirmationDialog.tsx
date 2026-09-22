import { Dialog } from './ui/Dialog';
import { DIALOGS } from '@shared/copy';

export interface CloseConfirmationDialogProps {
  readonly open: boolean;
  readonly hasUnsavedChanges: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** Asks before the window closes; the save, if any, is flushed by the confirm handler. */
export function CloseConfirmationDialog({
  open,
  hasUnsavedChanges,
  onConfirm,
  onCancel,
}: CloseConfirmationDialogProps): React.JSX.Element {
  return (
    <Dialog
      open={open}
      title={DIALOGS.confirmQuit.title}
      description={
        hasUnsavedChanges ? DIALOGS.confirmQuit.bodyUnsaved : DIALOGS.confirmQuit.body
      }
      confirmLabel={DIALOGS.confirmQuit.confirm}
      cancelLabel={DIALOGS.confirmQuit.cancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
