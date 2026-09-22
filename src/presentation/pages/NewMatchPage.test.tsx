import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { AppSettings, Match } from '@domain/index';
import { DEFAULT_APP_SETTINGS } from '@domain/index';
import { NewMatchPage } from './NewMatchPage';

const matchStoreState = vi.hoisted(() => ({
  match: null as Match | null,
  setMatch: vi.fn(),
}));

const settingsStoreState = vi.hoisted(() => ({
  settings: undefined as unknown as AppSettings,
  isLoaded: true,
}));

vi.mock('@application/stores/matchStore', () => ({
  useMatchStore: (selector: (state: typeof matchStoreState) => unknown) =>
    selector(matchStoreState),
}));

vi.mock('@application/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: typeof settingsStoreState) => unknown) =>
    selector(settingsStoreState),
}));

function renderPage(): void {
  render(
    <MemoryRouter>
      <NewMatchPage />
    </MemoryRouter>,
  );
}

describe('NewMatchPage', () => {
  beforeEach(() => {
    matchStoreState.match = null;
    settingsStoreState.settings = DEFAULT_APP_SETTINGS;
    settingsStoreState.isLoaded = true;
    vi.clearAllMocks();
  });

  it('blocks submission and shows an inline error when the opponent name is empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Squadra di casa/), 'Reale Vicenza');
    await user.click(screen.getByRole('button', { name: 'Avanti' }));

    expect(await screen.findByText('Inserisci il nome della squadra.')).toBeInTheDocument();
    expect(matchStoreState.setMatch).not.toHaveBeenCalled();
  });

  it('creates the match and moves on once both team names are filled in', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Squadra di casa/), 'Reale Vicenza');
    await user.type(screen.getByLabelText(/Squadra ospite/), 'Sandrigo Volley');
    await user.click(screen.getByRole('button', { name: 'Avanti' }));

    await screen.findByRole('button', { name: 'Avanti' });
    expect(matchStoreState.setMatch).toHaveBeenCalledTimes(1);
    const created = matchStoreState.setMatch.mock.calls[0]?.[0] as Match;
    expect(created.info.ourTeam.name).toBe('Reale Vicenza');
    expect(created.info.opponentTeam.name).toBe('Sandrigo Volley');
  });
});
