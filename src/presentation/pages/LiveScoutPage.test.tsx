import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Lineup, Match, Player } from '@domain/index';
import { DEFAULT_MATCH_SETTINGS, createMatch, createPlayer, startSet } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { LiveScoutPage } from './LiveScoutPage';

const TIMESTAMP = '2026-09-22T19:00:00.000+02:00';

/** Player 7 stays off the starting lineup; `withLibero` flags them as the libero. */
function makePlayers(withLibero: boolean): readonly Player[] {
  return Array.from({ length: 7 }, (_, index) =>
    createPlayer({
      id: `player-${String(index + 1)}`,
      shirtNumber: index + 1,
      name: `Giocatore ${String(index + 1)}`,
      shortName: `Atleta${String(index + 1)}`,
      isLibero: withLibero && index === 6,
    }),
  );
}

function makeLiveMatch(withLibero = false): Match {
  const roster = makePlayers(withLibero);
  const match = createMatch({
    id: 'match-1',
    ourTeamId: 'team-us',
    opponentTeamId: 'team-them',
    ourTeamName: 'Noi',
    opponentTeamName: 'Loro',
    date: '2026-09-22',
    venue: '',
    competition: '',
    notes: '',
    settings: DEFAULT_MATCH_SETTINGS,
    roster,
    timestamp: TIMESTAMP,
  });
  const [p1, p2, p3, p4, p5, p6] = roster;
  if (
    p1 === undefined ||
    p2 === undefined ||
    p3 === undefined ||
    p4 === undefined ||
    p5 === undefined ||
    p6 === undefined
  ) {
    throw new Error('roster too small');
  }
  const lineup: Lineup = [p1.id, p2.id, p3.id, p4.id, p5.id, p6.id];
  return startSet({ match, lineup, id: 'set-start-1', timestamp: TIMESTAMP });
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <LiveScoutPage />
    </MemoryRouter>,
  );
}

describe('LiveScoutPage', () => {
  beforeEach(() => {
    useMatchStore.getState().setMatch(makeLiveMatch());
  });

  it('records a rated action in three clicks and updates the score', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText('Noi: 0')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Atleta1$/u })[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Attacco' }));
    const outcomes = screen.getByRole('group', { name: '3 · Esito' });
    await user.click(within(outcomes).getByRole('button', { name: /Punto/u }));

    expect(screen.getByLabelText('Noi: 1')).toBeInTheDocument();
  });

  it('gives the opponent a point with the express button and enables undo', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Punto avversario/u }));

    expect(screen.getByLabelText('Loro: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Annulla azione/u }));

    expect(screen.getByLabelText('Loro: 0')).toBeInTheDocument();
  });

  it('records a plain point for us without choosing a player', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Punto nostro/u }));

    expect(screen.getByLabelText('Noi: 1')).toBeInTheDocument();
  });
  it('records an action from the keyboard: shirt number, skill, outcome', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(document.body);

    // The shirt number is committed by the next key, so the skill must still register.
    fireEvent.keyDown(document, { key: '4' });
    fireEvent.keyDown(document, { key: 'a' });
    fireEvent.keyDown(document, { key: 'p' });

    expect(screen.getByLabelText('Noi: 1')).toBeInTheDocument();
  });

  it('gives us a point with the space bar and takes it back with Ctrl+Z', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(document.body);

    fireEvent.keyDown(document, { key: ' ' });
    expect(screen.getByLabelText('Noi: 1')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(screen.getByLabelText('Noi: 0')).toBeInTheDocument();
  });

  it('closes an undecided match from the live screen, after confirming', async () => {
    const user = userEvent.setup();
    renderPage();

    // The set is at 0-0: "Termina set" cannot apply, so this is the only way out.
    await user.click(screen.getByRole('button', { name: 'Termina partita' }));

    const dialog = screen.getByRole('dialog', { name: 'Terminare la partita?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sì, termina' }));

    expect(useMatchStore.getState().match?.status).toBe('abandoned');
  });

  it('lists the libero under the court and records their action', async () => {
    useMatchStore.getState().setMatch(makeLiveMatch(true));
    const user = userEvent.setup();
    renderPage();

    const liberoRow = screen.getByRole('group', { name: 'Libero' });
    await user.click(within(liberoRow).getByRole('button', { name: /7\s*Atleta7/u }));
    await user.click(screen.getByRole('button', { name: 'Ricezione' }));
    const outcomes = screen.getByRole('group', { name: '3 · Esito' });
    await user.click(within(outcomes).getByRole('button', { name: /Errore/u }));

    expect(screen.getByLabelText('Loro: 1')).toBeInTheDocument();
  });

  it('shows no libero row when the roster has no libero', () => {
    renderPage();
    expect(screen.queryByRole('group', { name: 'Libero' })).not.toBeInTheDocument();
  });

  it('leaves the match running when the operator cancels', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Termina partita' }));
    const dialog = screen.getByRole('dialog', { name: 'Terminare la partita?' });
    await user.click(within(dialog).getByRole('button', { name: 'Annulla' }));

    expect(useMatchStore.getState().match?.status).toBe('live');
  });
});
