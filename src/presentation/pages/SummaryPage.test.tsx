import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '@domain/index';
import { buildSnapshot, endMatch, endSet, startSet as startSetRule } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { useToastStore } from '@presentation/components/ui/Toast';
import { lineupFrom, makeClock, makeIdGenerator, makeMatch, playPoints, startedMatch } from '@test/factories';
import { SummaryPage } from './SummaryPage';

/**
 * Set end is confirmed, never automatic (docs/04-architecture.md #2), so reaching 25 points
 * alone does not close a set. This plays and confirms two full sets of a best-of-3 match,
 * leaving the match `live` with a winner already decided (2 sets won).
 */
function playTwoSetsWon(): Match {
  const idGen = makeIdGenerator('evt');
  const clock = makeClock();
  const base = makeMatch({ settings: { bestOf: 3, pointsToWinSet: 25, pointsToWinTieBreak: 15 } });
  let match = startedMatch({ match: base, idGen, clock });
  match = playPoints(match, 'us', 25, { idGen, clock });
  match = endSet(match, idGen(), clock());
  match = startSetRule({ match, lineup: lineupFrom(match.roster), id: idGen(), timestamp: clock() });
  match = playPoints(match, 'us', 25, { idGen, clock });
  match = endSet(match, idGen(), clock());
  return match;
}

import type * as ExportModule from '@infrastructure/export';

vi.mock('@infrastructure/export', async () => {
  const actual = await vi.importActual<typeof ExportModule>('@infrastructure/export');
  return { ...actual, exportMatch: vi.fn() };
});

const { exportMatch } = await import('@infrastructure/export');
const exportMatchMock = vi.mocked(exportMatch);

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <SummaryPage />
    </MemoryRouter>,
  );
}

function resetStore(): void {
  useMatchStore.setState({
    match: null,
    snapshot: null,
    saveState: 'idle',
    lastErrorCode: null,
    redoBuffer: null,
    isLoading: false,
  });
  useToastStore.setState({ toasts: [] });
}

describe('SummaryPage', () => {
  beforeEach(() => {
    resetStore();
    exportMatchMock.mockReset();
  });

  afterEach(() => {
    resetStore();
  });

  it('shows the empty/error state and navigation actions when there is no match to summarise', () => {
    renderPage();

    expect(screen.getByText('Impossibile aprire la partita.')).toBeInTheDocument();
    expect(screen.getByText("Torna all'archivio")).toBeInTheDocument();
    expect(screen.getByText('Torna alla home')).toBeInTheDocument();
  });

  it('shows the loading state while the match is being loaded', () => {
    useMatchStore.setState({ isLoading: true });
    renderPage();

    expect(screen.getByText('Caricamento partita…')).toBeInTheDocument();
  });

  it('renders the final result, set scores and statistics for a finished match', () => {
    const match = endMatch(playTwoSetsWon(), '2026-01-10T20:00:00.000+01:00');

    useMatchStore.setState({ match, snapshot: buildSnapshot(match), isLoading: false });
    renderPage();

    expect(screen.getByText('Riepilogo partita')).toBeInTheDocument();
    expect(screen.getByText('Us 2 – 0 Them')).toBeInTheDocument();
    expect(screen.getByText('Esporta PDF')).toBeInTheDocument();
    expect(screen.getByText('Esporta XLSX')).toBeInTheDocument();
    expect(screen.getByText('Esporta JSON')).toBeInTheDocument();
    // Finished matches never show "Termina partita" again.
    expect(screen.queryByText('Termina partita')).not.toBeInTheDocument();
  });

  it('shows "Termina partita" only for a live match that already has a winner', () => {
    const match = playTwoSetsWon();
    useMatchStore.setState({ match, snapshot: buildSnapshot(match), isLoading: false });
    renderPage();

    expect(screen.getByText('Termina partita')).toBeInTheDocument();
  });

  it('shows a success toast when an export completes', async () => {
    const user = userEvent.setup();
    const match = playTwoSetsWon();
    useMatchStore.setState({ match, snapshot: buildSnapshot(match), isLoading: false });
    exportMatchMock.mockResolvedValue({ kind: 'saved', path: '/tmp/scout.json' });

    renderPage();
    await act(async () => {
      await user.click(screen.getByText('Esporta JSON'));
    });

    await waitFor(() => {
      expect(useToastStore.getState().toasts.some((toast) => toast.message === 'File esportato.')).toBe(true);
    });
  });

  it('shows a retry dialog instead of a toast when an export fails', async () => {
    const user = userEvent.setup();
    const match = playPoints(startedMatch({ match: makeMatch() }), 'us', 25);
    useMatchStore.setState({ match, snapshot: buildSnapshot(match), isLoading: false });
    exportMatchMock.mockResolvedValue({ kind: 'failed', error: new Error('disk full') });

    renderPage();
    await act(async () => {
      await user.click(screen.getByText('Esporta PDF'));
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Esportazione non riuscita.')).toBeInTheDocument();
  });
});
