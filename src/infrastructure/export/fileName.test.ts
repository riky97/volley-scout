import { describe, expect, it } from 'vitest';
import { createMatch, DEFAULT_MATCH_SETTINGS } from '@domain/index';
import type { Match } from '@domain/index';
import { buildExportFileName } from './fileName';

function makeMatch(ourTeamName: string, opponentTeamName: string, date = '2026-09-22'): Match {
  return createMatch({
    id: 'match-1',
    ourTeamId: 'team-us',
    opponentTeamId: 'team-them',
    ourTeamName,
    opponentTeamName,
    date,
    venue: '',
    competition: '',
    notes: '',
    settings: DEFAULT_MATCH_SETTINGS,
    roster: [],
    timestamp: '2026-09-22T18:00:00.000+02:00',
  });
}

describe('buildExportFileName', () => {
  it('builds the expected scout_<our>_<opponent>_<date> shape', () => {
    const match = makeMatch('Reale Vicenza', 'Sandrigo Volley');
    expect(buildExportFileName(match, 'xlsx')).toBe('scout_Reale_Vicenza_Sandrigo_Volley_2026-09-22.xlsx');
  });

  it('strips a leading dot from the extension', () => {
    const match = makeMatch('Us', 'Them');
    expect(buildExportFileName(match, '.pdf')).toBe('scout_Us_Them_2026-09-22.pdf');
  });

  it('folds accents instead of dropping the letters', () => {
    const match = makeMatch('Perugia Città', 'Novàra');
    expect(buildExportFileName(match, 'json')).toBe('scout_Perugia_Citta_Novara_2026-09-22.json');
  });

  it('replaces every non [A-Za-z0-9-_] run with a single underscore', () => {
    const match = makeMatch('A.S. Team!!  99', 'Team (B)');
    expect(buildExportFileName(match, 'json')).toBe('scout_A_S_Team_99_Team_B_2026-09-22.json');
  });

  it('caps a very long team name instead of producing an unbounded file name', () => {
    const longName = 'Pallavolo '.repeat(20).trim(); // way over the 40-char team budget
    const match = makeMatch(longName, 'Sandrigo');
    const result = buildExportFileName(match, 'xlsx');
    expect(result.length).toBeLessThanOrEqual(120 + '.xlsx'.length);
    expect(result.startsWith('scout_Pallavolo_Pallavolo')).toBe(true);
    expect(result.endsWith('_Sandrigo_2026-09-22.xlsx')).toBe(true);
  });

  it('only uses characters from [A-Za-z0-9-_.] in the whole file name', () => {
    const match = makeMatch('Città östlich #1', 'Équipe & Co.');
    const result = buildExportFileName(match, 'xlsx');
    expect(result).toMatch(/^[A-Za-z0-9\-_.]+$/u);
  });

  it('falls back to a placeholder segment when a team name has no letters or digits', () => {
    const match = makeMatch('!!!', 'Sandrigo');
    const result = buildExportFileName(match, 'json');
    expect(result).toBe('scout_squadra_Sandrigo_2026-09-22.json');
  });
});
