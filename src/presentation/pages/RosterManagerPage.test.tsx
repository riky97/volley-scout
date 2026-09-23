import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { RosterTemplate } from '@domain/index';
import { createPlayer, createRosterTemplate } from '@domain/index';
import { RosterManagerPage } from './RosterManagerPage';

const archiveStoreState = vi.hoisted(() => ({
  matches: [],
  templates: [] as RosterTemplate[],
  isLoading: false,
  refresh: vi.fn().mockResolvedValue(undefined),
  deleteMatch: vi.fn().mockResolvedValue(undefined),
  saveTemplate: vi.fn().mockResolvedValue(undefined),
  updateTemplate: vi.fn().mockResolvedValue(undefined),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@application/stores/archiveStore', () => ({
  useArchiveStore: (selector: (state: typeof archiveStoreState) => unknown) =>
    selector(archiveStoreState),
}));

const TIMESTAMP = '2026-09-20T10:00:00.000+02:00';

function template(): RosterTemplate {
  return createRosterTemplate({
    id: 'template-1',
    name: 'Prima squadra',
    teamName: 'SOI Inveruno',
    players: [
      createPlayer({ id: 'p1', shirtNumber: 4, name: 'Rossi Marco' }),
      createPlayer({ id: 'p2', shirtNumber: 7, name: 'Bianchi Luca' }),
    ],
    timestamp: TIMESTAMP,
  });
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <RosterManagerPage />
    </MemoryRouter>,
  );
}

describe('RosterManagerPage', () => {
  beforeEach(() => {
    archiveStoreState.templates = [];
    vi.clearAllMocks();
  });

  it('invites the operator to prepare a squad when none is saved', () => {
    renderPage();

    expect(screen.getByText('Nessuna rosa salvata')).toBeInTheDocument();
  });

  it('saves a new roster without starting a match', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuova rosa' }));
    await user.type(screen.getByLabelText('Nome della rosa'), 'Prima squadra');
    await user.type(screen.getByLabelText('Nome della squadra'), 'SOI Inveruno');

    await user.type(screen.getByLabelText(/^Numero/u), '4');
    await user.type(screen.getByLabelText(/^Nome e cognome/u), 'Rossi Marco');
    await user.click(screen.getByRole('button', { name: 'Salva giocatore' }));

    await user.click(screen.getByRole('button', { name: 'Salva rosa' }));

    expect(archiveStoreState.saveTemplate).toHaveBeenCalledWith(
      'Prima squadra',
      'SOI Inveruno',
      expect.arrayContaining([expect.objectContaining({ shirtNumber: 4, name: 'Rossi Marco' })]),
    );
  });

  it('refuses to save a roster with no players', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuova rosa' }));
    await user.type(screen.getByLabelText('Nome della rosa'), 'Vuota');
    await user.click(screen.getByRole('button', { name: 'Salva rosa' }));

    expect(archiveStoreState.saveTemplate).not.toHaveBeenCalled();
  });

  it('lists a saved roster and opens it for editing', async () => {
    const user = userEvent.setup();
    archiveStoreState.templates = [template()];
    renderPage();

    expect(screen.getByText('Prima squadra')).toBeInTheDocument();
    expect(screen.getByText(/2 giocatori/u)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modifica' }));

    expect(screen.getByLabelText('Nome della rosa')).toHaveValue('Prima squadra');
    expect(screen.getByText('Rossi Marco')).toBeInTheDocument();
  });

  it('deletes a roster only after confirmation', async () => {
    const user = userEvent.setup();
    archiveStoreState.templates = [template()];
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Elimina' }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminare la rosa?' });

    await user.click(within(dialog).getByRole('button', { name: 'Annulla' }));
    expect(archiveStoreState.deleteTemplate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Elimina' }));
    const reopened = screen.getByRole('dialog', { name: 'Eliminare la rosa?' });
    await user.click(within(reopened).getByRole('button', { name: 'Elimina' }));

    expect(archiveStoreState.deleteTemplate).toHaveBeenCalledWith('template-1');
  });
});
