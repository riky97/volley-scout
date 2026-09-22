import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CloseConfirmationDialog } from './CloseConfirmationDialog';

describe('CloseConfirmationDialog', () => {
  it('stays out of the way until the window is asked to close', () => {
    render(
      <CloseConfirmationDialog
        open={false}
        hasUnsavedChanges={false}
        closeFailed={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the app only when the operator confirms', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CloseConfirmationDialog
        open
        hasUnsavedChanges={false}
        closeFailed={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Chiudere Volley Scout?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sì, chiudi' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps the app open when the operator cancels', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CloseConfirmationDialog
        open
        hasUnsavedChanges={false}
        closeFailed={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Annulla' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('warns when a save is still in flight', () => {
    render(
      <CloseConfirmationDialog
        open
        hasUnsavedChanges
        closeFailed={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/modifiche non ancora salvate/u)).toBeInTheDocument();
  });

  it('says so when the window refused to close', () => {
    render(
      <CloseConfirmationDialog
        open
        hasUnsavedChanges={false}
        closeFailed
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/Chiusura non riuscita/u)).toBeInTheDocument();
  });
});
