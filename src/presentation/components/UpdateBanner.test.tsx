import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMatchStore } from '@application/stores/matchStore';
import { UpdateBanner } from './UpdateBanner';

const pwa = vi.hoisted(() => ({
  ready: false,
  applyUpdate: vi.fn(),
}));

vi.mock('@infrastructure/pwa', () => ({
  isUpdateReady: () => pwa.ready,
  subscribeToUpdate: () => () => undefined,
  applyUpdate: pwa.applyUpdate,
}));

describe('UpdateBanner', () => {
  beforeEach(() => {
    pwa.ready = false;
    pwa.applyUpdate.mockClear();
    useMatchStore.setState({ saveState: 'idle' });
  });

  it('stays hidden while no new version is ready', () => {
    const { container } = render(<UpdateBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the update and applies it on tap', async () => {
    pwa.ready = true;
    const user = userEvent.setup();
    render(<UpdateBanner />);

    expect(screen.getByText('È disponibile una nuova versione di Volley Scout.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aggiorna' }));
    expect(pwa.applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('waits for the save in progress before allowing the reload', () => {
    pwa.ready = true;
    useMatchStore.setState({ saveState: 'saving' });
    render(<UpdateBanner />);

    expect(screen.getByRole('button', { name: 'Aggiorna' })).toBeDisabled();
  });
});
