import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Match } from '@domain/index';
import { DEFAULT_MATCH_SETTINGS, SCHEMA_VERSION, createPlayer } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { useArchiveStore } from '@application/stores/archiveStore';
import { RosterPage } from './RosterPage';

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

function sixAvailablePlayers(): Match['roster'] {
  return Array.from({ length: 6 }, (_, index) =>
    createPlayer({ id: `p${String(index + 1)}`, shirtNumber: index + 1, name: `Player ${String(index + 1)}` }),
  );
}

function renderRosterPage(): void {
  render(
    <MemoryRouter>
      <RosterPage />
    </MemoryRouter>,
  );
}

describe('RosterPage', () => {
  beforeEach(() => {
    useMatchStore.setState({ match: null, snapshot: null, lastErrorCode: null, redoBuffer: null });
    useArchiveStore.setState({ matches: [], templates: [], isLoading: false });
  });

  it('shows an inline error on both rows and disables "Avanti" when two shirt numbers collide', async () => {
    const players = sixAvailablePlayers();
    const duplicated = players.map((player, index) =>
      index === 1 ? { ...player, shirtNumber: players[0]?.shirtNumber ?? 1 } : player,
    );
    useMatchStore.setState({ match: buildMatch(duplicated) });

    renderRosterPage();

    const rowAlerts = await screen.findAllByRole('alert');
    expect(rowAlerts).toHaveLength(2);
    for (const alert of rowAlerts) {
      expect(alert).toHaveTextContent('Numero di maglia già assegnato.');
    }

    const next = screen.getByRole('button', { name: 'Avanti' });
    expect(next).toBeDisabled();
  });

  it('disables "Avanti" and shows the reason when fewer than six players are available', () => {
    const players = sixAvailablePlayers().map((player, index) =>
      index === 0 ? { ...player, isAvailable: false } : player,
    );
    useMatchStore.setState({ match: buildMatch(players) });

    renderRosterPage();

    const next = screen.getByRole('button', { name: 'Avanti' });
    expect(next).toBeDisabled();
    expect(screen.getByText('Servono almeno sei giocatori per iniziare.')).toBeInTheDocument();
  });

  it('lets "Avanti" enable once the roster has six available players with unique numbers', async () => {
    useMatchStore.setState({ match: buildMatch(sixAvailablePlayers()) });

    renderRosterPage();

    const next = screen.getByRole('button', { name: 'Avanti' });
    expect(next).not.toBeDisabled();
    await userEvent.click(next);
  });
});
