import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Match, MatchSnapshot } from '@domain/index';
import { HomePage } from './HomePage';

const matchStoreState = vi.hoisted(() => ({
  match: null as Match | null,
  snapshot: null as MatchSnapshot | null,
  resumeLastMatch: vi.fn().mockResolvedValue(false),
}));

const archiveStoreState = vi.hoisted(() => ({
  matches: [] as unknown[],
  isLoading: false,
  refresh: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@application/stores/matchStore', () => ({
  useMatchStore: (selector: (state: typeof matchStoreState) => unknown) =>
    selector(matchStoreState),
}));

vi.mock('@application/stores/archiveStore', () => ({
  useArchiveStore: (selector: (state: typeof archiveStoreState) => unknown) =>
    selector(archiveStoreState),
}));

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    schemaVersion: 1,
    id: 'match-1',
    status: 'live',
    createdAt: '2026-09-22T10:00:00.000+02:00',
    updatedAt: '2026-09-22T10:00:00.000+02:00',
    closedAt: null,
    info: {
      ourTeam: { id: 't1', name: 'Reale Vicenza', isOurTeam: true },
      opponentTeam: { id: 't2', name: 'Sandrigo', isOurTeam: false },
      date: '2026-09-22',
      venue: '',
      competition: '',
      notes: '',
    },
    settings: {
      bestOf: 5,
      pointsToWinSet: 25,
      pointsToWinTieBreak: 15,
      winByTwo: true,
      startingServer: 'us',
      startingSide: 'left',
      timeoutsPerSet: 2,
      substitutionsPerSet: 6,
      trackSetSkill: false,
    },
    roster: [],
    sets: [],
    events: [],
    ...overrides,
  };
}

function renderHome(): void {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  afterEach(() => {
    matchStoreState.match = null;
    matchStoreState.snapshot = null;
    archiveStoreState.matches = [];
    archiveStoreState.isLoading = false;
    vi.clearAllMocks();
  });

  it('does not show the resume card when there is no unfinished match', async () => {
    matchStoreState.match = null;
    matchStoreState.resumeLastMatch = vi.fn().mockResolvedValue(false);
    renderHome();

    expect(screen.queryByText('Partita in corso')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Volley Scout' })).toBeInTheDocument();
  });

  it('shows the resume card with team names and score when an unfinished match is loaded', () => {
    matchStoreState.match = buildMatch();
    matchStoreState.snapshot = {
      matchId: 'match-1',
      status: 'live',
      currentSetIndex: 1,
      currentSet: null,
      score: { us: 14, them: 11 },
      setsWon: { us: 1, them: 0 },
      servingTeam: 'us',
      currentServerId: null,
      court: [],
      setHistory: [],
      lastEvent: null,
      canUndo: false,
      matchWinner: null,
      pendingSetWinner: null,
      setPointFor: null,
      warnings: [],
    };
    renderHome();

    expect(screen.getByText('Partita in corso')).toBeInTheDocument();
    expect(screen.getByText(/Reale Vicenza – Sandrigo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riprendi partita' })).toBeInTheDocument();
  });

  it('asks for confirmation before starting a new match while one is unfinished', async () => {
    const user = userEvent.setup();
    matchStoreState.match = buildMatch({ status: 'setup' });
    matchStoreState.snapshot = null;
    renderHome();

    await user.click(screen.getByRole('button', { name: 'Nuova partita' }));

    expect(screen.getByRole('dialog', { name: 'Partita in corso' })).toBeInTheDocument();
  });
});
