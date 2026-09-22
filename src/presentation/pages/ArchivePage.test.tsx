import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ArchiveEntry } from '@infrastructure/storage';
import { ArchivePage } from './ArchivePage';

const archiveStoreState = vi.hoisted(() => ({
  matches: [] as ArchiveEntry[],
  isLoading: false,
  refresh: vi.fn().mockResolvedValue(undefined),
  deleteMatch: vi.fn().mockResolvedValue(undefined),
}));

const matchStoreState = vi.hoisted(() => ({
  loadMatch: vi.fn(),
}));

vi.mock('@application/stores/archiveStore', () => ({
  useArchiveStore: (selector: (state: typeof archiveStoreState) => unknown) =>
    selector(archiveStoreState),
}));

vi.mock('@application/stores/matchStore', () => ({
  useMatchStore: (selector: (state: typeof matchStoreState) => unknown) => selector(matchStoreState),
}));

function entry(overrides: Partial<ArchiveEntry> = {}): ArchiveEntry {
  return {
    id: 'm1',
    date: '2026-09-15',
    ourTeamName: 'Reale Vicenza',
    opponentTeamName: 'Thiene',
    competition: 'Serie C',
    status: 'finished',
    setsWon: { us: 3, them: 1 },
    updatedAt: '2026-09-15T20:00:00.000+02:00',
    ...overrides,
  };
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <ArchivePage />
    </MemoryRouter>,
  );
}

describe('ArchivePage', () => {
  beforeEach(() => {
    archiveStoreState.matches = [];
    archiveStoreState.isLoading = false;
    vi.clearAllMocks();
  });

  it('shows the empty state when the archive has no matches', () => {
    renderPage();
    expect(screen.getByText('Archivio vuoto')).toBeInTheDocument();
  });

  it('lists matches and filters them by the search box', async () => {
    const user = userEvent.setup();
    archiveStoreState.matches = [entry(), entry({ id: 'm2', opponentTeamName: 'Schio' })];
    renderPage();

    expect(screen.getByText(/Reale Vicenza – Thiene/)).toBeInTheDocument();
    expect(screen.getByText(/Reale Vicenza – Schio/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cerca'), 'Schio');

    expect(screen.queryByText(/Reale Vicenza – Thiene/)).not.toBeInTheDocument();
    expect(screen.getByText(/Reale Vicenza – Schio/)).toBeInTheDocument();
  });

  it('asks for confirmation before deleting a match', async () => {
    const user = userEvent.setup();
    archiveStoreState.matches = [entry()];
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Elimina' }));

    expect(screen.getByRole('dialog', { name: 'Eliminare la partita?' })).toBeInTheDocument();
    expect(archiveStoreState.deleteMatch).not.toHaveBeenCalled();
  });
});
