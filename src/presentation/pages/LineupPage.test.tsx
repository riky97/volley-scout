import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Match } from '@domain/index';
import { DEFAULT_MATCH_SETTINGS, SCHEMA_VERSION, createPlayer } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { LineupPage } from './LineupPage';

function buildMatch(players: Match['roster']): Match {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'match-1',
    status: 'setup',
    createdAt: '2026-09-22T10:00:00.000+02:00',
    updatedAt: '2026-09-22T10:00:00.000+02:00',
    closedAt: null,
    info: {
      ourTeam: { id: 'team-us', name: 'Reale Vicenza', isOurTeam: true },
      opponentTeam: { id: 'team-them', name: 'Sandrigo', isOurTeam: false },
      date: '2026-09-22',
      venue: '',
      competition: '',
      notes: '',
    },
    settings: DEFAULT_MATCH_SETTINGS,
    roster: players,
    sets: [],
    events: [],
  };
}

const SURNAMES = ['Rossi', 'Bianchi', 'Verdi', 'Neri', 'Gialli', 'Blu'];

function sixAvailablePlayers(): Match['roster'] {
  return SURNAMES.map((surname, index) =>
    createPlayer({ id: `p${String(index + 1)}`, shirtNumber: index + 1, name: surname }),
  );
}

function renderLineupPage(): void {
  render(
    <MemoryRouter>
      <LineupPage />
    </MemoryRouter>,
  );
}

describe('LineupPage', () => {
  beforeEach(() => {
    useMatchStore.setState({ match: null, snapshot: null, lastErrorCode: null, redoBuffer: null });
  });

  it('keeps "Inizia partita" disabled and shows the reason until six distinct players are on court', async () => {
    useMatchStore.setState({ match: buildMatch(sixAvailablePlayers()) });
    renderLineupPage();

    const confirm = screen.getByRole('button', { name: 'Inizia partita' });
    expect(confirm).toBeDisabled();
    expect(screen.getByText('Seleziona sei giocatori per iniziare.')).toBeInTheDocument();

    const positions = ['P4', 'P3', 'P2', 'P5', 'P6', 'P1'];
    for (let index = 0; index < 6; index += 1) {
      const chip = screen.getByRole('button', { name: new RegExp(`^${String(index + 1)}$`) });
      await userEvent.click(chip);
      const position = positions[index] ?? 'P1';
      const slot = screen.getByRole('button', { name: new RegExp(`^${position} — Posizione libera$`) });
      await userEvent.click(slot);
    }

    expect(confirm).not.toBeDisabled();
    expect(screen.queryByText('Seleziona sei giocatori per iniziare.')).not.toBeInTheDocument();
  });

  it('starts set 1 with the assembled lineup once six players are placed', async () => {
    useMatchStore.setState({ match: buildMatch(sixAvailablePlayers()) });
    renderLineupPage();

    const positions = ['P4', 'P3', 'P2', 'P5', 'P6', 'P1'];
    for (let index = 0; index < 6; index += 1) {
      const chip = screen.getByRole('button', { name: new RegExp(`^${String(index + 1)}$`) });
      await userEvent.click(chip);
      const position = positions[index] ?? 'P1';
      const slot = screen.getByRole('button', { name: new RegExp(`^${position} — Posizione libera$`) });
      await userEvent.click(slot);
    }

    const confirm = screen.getByRole('button', { name: 'Inizia partita' });
    await userEvent.click(confirm);

    const set = useMatchStore.getState().match?.sets.at(0);
    expect(set?.status).toBe('live');
    expect(set?.lineup).toHaveLength(6);
    expect(new Set(set?.lineup).size).toBe(6);
  });
});
