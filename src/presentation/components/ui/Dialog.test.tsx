import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';
import { Toaster } from './Toast';

function Harness({ onConfirm }: { readonly onConfirm: () => void }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Elimina partita
      </button>
      <Dialog
        open={open}
        title="Eliminare la partita?"
        description="L'operazione non si può annullare."
        confirmLabel="Elimina"
        destructive
        onConfirm={onConfirm}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

describe('Dialog', () => {
  it('focuses the least destructive button when it opens', async () => {
    const user = userEvent.setup();
    render(<Harness onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Elimina partita' }));

    const dialog = screen.getByRole('dialog', { name: 'Eliminare la partita?' });
    expect(dialog).toHaveAccessibleDescription("L'operazione non si può annullare.");
    expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus();
  });

  it('cancels on Escape and gives focus back to what opened it', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    const opener = screen.getByRole('button', { name: 'Elimina partita' });

    await user.click(opener);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(opener).toHaveFocus();
  });

  it('stays open when the backdrop is tapped', async () => {
    const user = userEvent.setup();
    render(<Harness onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Elimina partita' }));
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides the page behind it from assistive technology', async () => {
    const user = userEvent.setup();
    // The app always mounts the toaster; its live region must not keep the page exposed.
    const { container } = render(
      <>
        <Harness onConfirm={vi.fn()} />
        <Toaster />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Elimina partita' }));

    expect(container).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Elimina partita' })).not.toBeInTheDocument();
  });
});
