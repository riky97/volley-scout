import type { Column, Worksheet } from 'exceljs';
import type { Match, MatchStatistics, PlayerStatistics, ScoutEvent, TeamStatistics } from '@domain/index';
import { computeMatchStatistics } from '@domain/index';
import { OUTCOME_LABELS, SKILL_LABELS, STAT_LABELS } from '@shared/copy';
import { formatCount, formatDateIt, formatPercent1, formatScoreLine } from '@shared/format/number';
import { EVENT_TYPE_LABELS, eventScoreLabel, rosterName, rosterRole, rosterShirt, setsWonCount } from './rosterLookup';

interface PlayerColumn {
  readonly header: string;
  readonly width: number;
  readonly value: (row: PlayerStatistics) => string | number;
}

function playerColumns(match: Match, trackSetSkill: boolean): readonly PlayerColumn[] {
  const columns: PlayerColumn[] = [
    { header: STAT_LABELS.points.short, width: 8, value: (r) => formatCount(r.points) },
    { header: STAT_LABELS.errors.short, width: 8, value: (r) => formatCount(r.errors) },
    { header: STAT_LABELS.totalActions.short, width: 8, value: (r) => formatCount(r.totalActions) },
    { header: STAT_LABELS.attackAttempts.short, width: 8, value: (r) => formatCount(r.attackAttempts) },
    { header: STAT_LABELS.kills.short, width: 8, value: (r) => formatCount(r.kills) },
    { header: STAT_LABELS.attackErrors.short, width: 8, value: (r) => formatCount(r.attackErrors) },
    { header: STAT_LABELS.attackEfficiency.short, width: 9, value: (r) => formatPercent1(r.attackEfficiency) },
    { header: STAT_LABELS.killRate.short, width: 9, value: (r) => formatPercent1(r.killRate) },
    { header: STAT_LABELS.serves.short, width: 8, value: (r) => formatCount(r.serves) },
    { header: STAT_LABELS.aces.short, width: 8, value: (r) => formatCount(r.aces) },
    { header: STAT_LABELS.serveErrors.short, width: 8, value: (r) => formatCount(r.serveErrors) },
    { header: STAT_LABELS.aceRate.short, width: 9, value: (r) => formatPercent1(r.aceRate) },
    { header: STAT_LABELS.serveErrorRate.short, width: 9, value: (r) => formatPercent1(r.serveErrorRate) },
    { header: STAT_LABELS.receptions.short, width: 8, value: (r) => formatCount(r.receptions) },
    { header: STAT_LABELS.positiveReceptions.short, width: 8, value: (r) => formatCount(r.positiveReceptions) },
    { header: STAT_LABELS.negativeReceptions.short, width: 8, value: (r) => formatCount(r.negativeReceptions) },
    { header: STAT_LABELS.receptionErrors.short, width: 8, value: (r) => formatCount(r.receptionErrors) },
    { header: STAT_LABELS.receptionPositivity.short, width: 9, value: (r) => formatPercent1(r.receptionPositivity) },
    { header: STAT_LABELS.receptionErrorRate.short, width: 9, value: (r) => formatPercent1(r.receptionErrorRate) },
    { header: STAT_LABELS.blockPoints.short, width: 8, value: (r) => formatCount(r.blockPoints) },
    { header: STAT_LABELS.blockErrors.short, width: 8, value: (r) => formatCount(r.blockErrors) },
    { header: STAT_LABELS.digs.short, width: 8, value: (r) => formatCount(r.digs) },
    { header: STAT_LABELS.digErrors.short, width: 8, value: (r) => formatCount(r.digErrors) },
  ];
  if (trackSetSkill) {
    columns.push(
      { header: STAT_LABELS.sets.short, width: 8, value: (r) => formatCount(r.sets) },
      { header: STAT_LABELS.setErrors.short, width: 8, value: (r) => formatCount(r.setErrors) },
    );
  }
  return columns;
}

function writePlayerStatsSheet(
  sheet: Worksheet,
  match: Match,
  players: readonly PlayerStatistics[],
): void {
  const trackSetSkill = match.settings.trackSetSkill;
  const extra = playerColumns(match, trackSetSkill);
  const columns: Partial<Column>[] = [
    { header: 'N.', key: 'shirt', width: 6 },
    { header: 'Giocatore', key: 'name', width: 22 },
    { header: 'Ruolo', key: 'role', width: 16 },
    ...extra.map((column, index) => ({ header: column.header, key: `c${String(index)}`, width: column.width })),
  ];
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };

  for (const player of players) {
    const row: Record<string, string | number> = {
      shirt: rosterShirt(match, player.playerId) ?? '',
      name: player.isKnownPlayer ? rosterName(match, player.playerId) : `Sconosciuto (${player.playerId})`,
      role: player.isKnownPlayer ? rosterRole(match, player.playerId) : '',
    };
    extra.forEach((column, index) => {
      row[`c${String(index)}`] = column.value(player);
    });
    sheet.addRow(row);
  }
}

function writeTeamStatsRows(sheet: Worksheet, label: string, team: TeamStatistics): void {
  sheet.addRow([label]).font = { bold: true };
  const rows: readonly [string, string][] = [
    [STAT_LABELS.totalActions.long, formatCount(team.totalActions)],
    [STAT_LABELS.pointsScored.long, formatCount(team.pointsScored)],
    [STAT_LABELS.pointsConceded.long, formatCount(team.pointsConceded)],
    [STAT_LABELS.pointsFromActions.long, formatCount(team.pointsFromActions)],
    [STAT_LABELS.errors.long, formatCount(team.errors)],
    [STAT_LABELS.opponentPoints.long, formatCount(team.opponentPoints)],
    [STAT_LABELS.attackAttempts.long, formatCount(team.attackAttempts)],
    [STAT_LABELS.kills.long, formatCount(team.kills)],
    [STAT_LABELS.attackErrors.long, formatCount(team.attackErrors)],
    [STAT_LABELS.attackEfficiency.long, formatPercent1(team.attackEfficiency)],
    [STAT_LABELS.serves.long, formatCount(team.serves)],
    [STAT_LABELS.aces.long, formatCount(team.aces)],
    [STAT_LABELS.serveErrors.long, formatCount(team.serveErrors)],
    [STAT_LABELS.receptions.long, formatCount(team.receptions)],
    [STAT_LABELS.positiveReceptions.long, formatCount(team.positiveReceptions)],
    [STAT_LABELS.negativeReceptions.long, formatCount(team.negativeReceptions)],
    [STAT_LABELS.receptionPositivity.long, formatPercent1(team.receptionPositivity)],
    [STAT_LABELS.blockPoints.long, formatCount(team.blockPoints)],
    [STAT_LABELS.timeoutsUsed.long, formatCount(team.timeoutsUsed)],
    [STAT_LABELS.substitutionsUsed.long, formatCount(team.substitutionsUsed)],
  ];
  for (const [label2, value] of rows) sheet.addRow([label2, value]);
  sheet.addRow([]);
}

function eventPlayerLabel(match: Match, event: ScoutEvent): string {
  if (event.type === 'rally') return rosterName(match, event.playerId);
  if (event.type === 'substitution') {
    return `${rosterName(match, event.playerOutId)} → ${rosterName(match, event.playerInId)}`;
  }
  return '';
}

function eventSkillLabel(event: ScoutEvent): string {
  return event.type === 'rally' ? SKILL_LABELS[event.skill] : '';
}

function eventOutcomeLabel(event: ScoutEvent): string {
  if (event.type === 'rally') return OUTCOME_LABELS[event.outcome];
  return '';
}

function eventNoteLabel(event: ScoutEvent): string {
  if (event.type === 'rally' || event.type === 'opponent_point') return event.comment;
  if (event.type === 'note') return event.text;
  return '';
}

function writeEventsSheet(sheet: Worksheet, match: Match): void {
  sheet.columns = [
    { header: 'Set', key: 'set', width: 6 },
    { header: 'Ora', key: 'time', width: 12 },
    { header: 'Tipo', key: 'type', width: 14 },
    { header: 'Giocatore', key: 'player', width: 26 },
    { header: 'Fondamentale', key: 'skill', width: 14 },
    { header: 'Esito', key: 'outcome', width: 12 },
    { header: 'Punteggio', key: 'score', width: 12 },
    { header: 'Note', key: 'note', width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const event of match.events) {
    const time = event.timestamp.includes('T') ? (event.timestamp.split('T')[1] ?? '').slice(0, 8) : event.timestamp;
    sheet.addRow({
      set: event.setIndex + 1,
      time,
      type: EVENT_TYPE_LABELS[event.type],
      player: eventPlayerLabel(match, event),
      skill: eventSkillLabel(event),
      outcome: eventOutcomeLabel(event),
      score: eventScoreLabel(event),
      note: eventNoteLabel(event),
    });
  }
}

/** Sheet names cannot exceed 31 chars nor contain \ / ? * [ ] — "Set N" never does, kept for safety. */
function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]]/gu, '_').slice(0, 31);
}

/**
 * Builds the XLSX export: `Riepilogo`, `Giocatori`, `Statistiche`, `Eventi`, then one sheet
 * per set (`Set 1`, `Set 2`, …). See docs/00-product-plan.md §9 and docs/02-statistics.md.
 */
export async function buildXlsxExport(match: Match): Promise<Uint8Array> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Volley Scout';
  workbook.created = new Date();

  const stats: MatchStatistics = computeMatchStatistics(match);

  // --- Riepilogo -----------------------------------------------------------------------
  const riepilogo = workbook.addWorksheet(safeSheetName('Riepilogo'));
  riepilogo.columns = [
    { header: '', key: 'label', width: 22 },
    { header: '', key: 'value', width: 40 },
  ];
  riepilogo.addRow(['Nostra squadra', match.info.ourTeam.name]);
  riepilogo.addRow(['Squadra avversaria', match.info.opponentTeam.name]);
  riepilogo.addRow(['Data', formatDateIt(match.info.date)]);
  riepilogo.addRow(['Competizione', match.info.competition]);
  riepilogo.addRow(['Luogo', match.info.venue]);
  const setsWon = setsWonCount(match);
  riepilogo.addRow(['Risultato finale', `${match.info.ourTeam.name} ${formatScoreLine(setsWon.us, setsWon.them)} ${match.info.opponentTeam.name}`]);
  riepilogo.addRow(['Generato il', formatDateIt(new Date().toISOString().slice(0, 10))]);
  riepilogo.addRow([]);

  riepilogo.addRow(['Set', 'Noi', 'Loro']).font = { bold: true };
  match.sets.forEach((set) => {
    riepilogo.addRow([set.index + 1, set.ourPoints, set.theirPoints]);
  });
  if (match.info.notes.trim().length > 0) {
    riepilogo.addRow([]);
    riepilogo.addRow(['Note', match.info.notes]);
  }

  // --- Giocatori (whole match) -----------------------------------------------------------
  const giocatori = workbook.addWorksheet(safeSheetName('Giocatori'));
  writePlayerStatsSheet(giocatori, match, stats.players);

  // --- Statistiche (team, whole match + per set) -----------------------------------------
  const statistiche = workbook.addWorksheet(safeSheetName('Statistiche'));
  statistiche.columns = [
    { header: '', key: 'label', width: 32 },
    { header: '', key: 'value', width: 16 },
  ];
  writeTeamStatsRows(statistiche, 'Totale partita', stats.team);
  stats.perSetTeam.forEach((teamSet, index) => {
    writeTeamStatsRows(statistiche, `Set ${String(index + 1)}`, teamSet);
  });

  // --- Eventi (full match log) -------------------------------------------------------------
  const eventi = workbook.addWorksheet(safeSheetName('Eventi'));
  writeEventsSheet(eventi, match);

  // --- One sheet per set -------------------------------------------------------------------
  match.sets.forEach((set, index) => {
    const sheet = workbook.addWorksheet(safeSheetName(`Set ${String(index + 1)}`));
    sheet.addRow([`Set ${String(index + 1)}`, formatScoreLine(set.ourPoints, set.theirPoints)]).font = {
      bold: true,
    };
    sheet.addRow([]);
    const players = stats.perSetPlayers[index] ?? [];
    if (players.length === 0 || players.every((p) => p.totalActions === 0)) {
      sheet.addRow(['Nessuna azione registrata in questo set.']);
    } else {
      writePlayerStatsSheet(sheet, match, players);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
