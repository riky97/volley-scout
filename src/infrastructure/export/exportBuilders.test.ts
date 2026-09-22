import { describe, expect, it } from 'vitest';
import type { Lineup, Match, Player } from '@domain/index';
import {
  DEFAULT_MATCH_SETTINGS,
  appendOpponentPoint,
  appendRallyEvent,
  createMatch,
  createPlayer,
  endSet,
  startSet,
} from '@domain/index';
import { buildPdfExport } from './pdfExport';
import { buildXlsxExport } from './xlsxExport';

const TIMESTAMP = '2026-09-22T19:00:00.000+02:00';

function playedMatch(): Match {
  const roster: readonly Player[] = Array.from({ length: 7 }, (_, index) =>
    createPlayer({
      id: `player-${String(index + 1)}`,
      shirtNumber: index + 1,
      name: `Atleta ${String(index + 1)}`,
      shortName: `A${String(index + 1)}`,
    }),
  );

  let match = createMatch({
    id: 'export-match',
    ourTeamId: 'us',
    opponentTeamId: 'them',
    ourTeamName: 'Pallavolo Sanremo',
    opponentTeamName: 'Volley Imperia',
    date: '2026-09-22',
    venue: 'Palazzetto',
    competition: 'Serie D',
    notes: 'Partita di prova',
    settings: { ...DEFAULT_MATCH_SETTINGS, pointsToWinSet: 3 },
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
  match = startSet({ match, lineup, id: 'set-start', timestamp: TIMESTAMP });

  const actions = [
    { playerId: p1.id, skill: 'serve', outcome: 'point' },
    { playerId: p2.id, skill: 'attack', outcome: 'point' },
    { playerId: p3.id, skill: 'reception', outcome: 'positive' },
    { playerId: p4.id, skill: 'attack', outcome: 'error' },
    { playerId: p5.id, skill: 'block', outcome: 'point' },
    { playerId: p6.id, skill: 'attack', outcome: 'point' },
  ] as const;

  actions.forEach((action, index) => {
    match = appendRallyEvent({
      match,
      playerId: action.playerId,
      skill: action.skill,
      outcome: action.outcome,
      id: `event-${String(index)}`,
      timestamp: TIMESTAMP,
    });
  });

  match = appendOpponentPoint({ match, id: 'opp-1', timestamp: TIMESTAMP });
  return endSet(match, 'set-end', TIMESTAMP);
}

describe('binary exports', () => {
  it('produces a real xlsx workbook', async () => {
    const bytes = await buildXlsxExport(playedMatch());

    expect(bytes.byteLength).toBeGreaterThan(1000);
    // Every xlsx file is a zip archive: "PK\x03\x04".
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  }, 30_000);

  it('produces a real pdf document', async () => {
    const bytes = await buildPdfExport(playedMatch());

    expect(bytes.byteLength).toBeGreaterThan(1000);
    const header = String.fromCharCode(...bytes.subarray(0, 5));
    expect(header).toBe('%PDF-');
  }, 30_000);
});
