import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import type { Match, MatchStatistics } from '@domain/index';
import { computeMatchStatistics } from '@domain/index';
import { STAT_LABELS } from '@shared/copy';
import { formatCount, formatDateIt, formatPercent1, formatScoreLine } from '@shared/format/number';
import { rosterName, rosterRole, rosterShirt, setsWonCount } from './rosterLookup';

/** jspdf-autotable attaches this at runtime; the package's own types leave it out. */
interface DocWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

const PAGE_MARGIN = 14;
const PAGE_WIDTH = 210; // A4 portrait, mm

function finalYOf(doc: DocWithAutoTable, fallback: number): number {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function drawFooter(doc: jsPDF, generatedOn: string): void {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generato il ${generatedOn}`, PAGE_MARGIN, 289);
    doc.text(`${String(page)} / ${String(pageCount)}`, PAGE_WIDTH - PAGE_MARGIN, 289, { align: 'right' });
    doc.setTextColor(0);
  }
}

/**
 * Builds the PDF export: A4 portrait, printable, built-in fonts only (no CDN, no network).
 * Header, final result, per-set scores, team statistics, per-player table, notes, generation
 * date. See docs/00-product-plan.md §9 and docs/03-ux-flows.md §3.7.
 */
export async function buildPdfExport(match: Match): Promise<Uint8Array> {
  const [{ jsPDF: JsPdf }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default ?? autoTableModule.autoTable;

  const doc = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as DocWithAutoTable;
  const runTable = (options: UserOptions): void => {
    autoTable(doc, options);
  };

  const stats: MatchStatistics = computeMatchStatistics(match);
  const setsWon = setsWonCount(match);
  const generatedOn = formatDateIt(new Date().toISOString().slice(0, 10));

  let cursorY = PAGE_MARGIN;

  // --- Header --------------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Riepilogo partita', PAGE_MARGIN, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${match.info.ourTeam.name} – ${match.info.opponentTeam.name}`, PAGE_MARGIN, cursorY);
  cursorY += 6;

  const metaParts = [
    formatDateIt(match.info.date),
    match.info.competition,
    match.info.venue,
  ].filter((part) => part.trim().length > 0);
  if (metaParts.length > 0) {
    doc.setFontSize(9.5);
    doc.setTextColor(90);
    doc.text(metaParts.join(' · '), PAGE_MARGIN, cursorY);
    doc.setTextColor(0);
    cursorY += 7;
  } else {
    cursorY += 2;
  }

  // --- Final result ----------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(
    `${match.info.ourTeam.name} ${formatScoreLine(setsWon.us, setsWon.them)} ${match.info.opponentTeam.name}`,
    PAGE_MARGIN,
    cursorY + 6,
  );
  cursorY += 12;

  // --- Set-by-set scores -------------------------------------------------------------------
  runTable({
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    theme: 'grid',
    head: [['Set', ...match.sets.map((set) => `Set ${String(set.index + 1)}`)]],
    body: [
      ['Noi', ...match.sets.map((set) => formatCount(set.ourPoints))],
      ['Loro', ...match.sets.map((set) => formatCount(set.theirPoints))],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
  });
  cursorY = finalYOf(doc, cursorY) + 8;

  // --- Team statistics ---------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Statistiche squadra — Totale partita', PAGE_MARGIN, cursorY);
  cursorY += 3;

  const team = stats.team;
  const teamRows: readonly [string, string][] = [
    [STAT_LABELS.pointsScored.long, formatCount(team.pointsScored)],
    [STAT_LABELS.pointsConceded.long, formatCount(team.pointsConceded)],
    [STAT_LABELS.errors.long, formatCount(team.errors)],
    [STAT_LABELS.opponentPoints.long, formatCount(team.opponentPoints)],
    [STAT_LABELS.attackEfficiency.long, formatPercent1(team.attackEfficiency)],
    [STAT_LABELS.aces.long, formatCount(team.aces)],
    [STAT_LABELS.serveErrors.long, formatCount(team.serveErrors)],
    [STAT_LABELS.receptionPositivity.long, formatPercent1(team.receptionPositivity)],
    [STAT_LABELS.blockPoints.long, formatCount(team.blockPoints)],
    [STAT_LABELS.timeoutsUsed.long, formatCount(team.timeoutsUsed)],
    [STAT_LABELS.substitutionsUsed.long, formatCount(team.substitutionsUsed)],
  ];
  runTable({
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    theme: 'striped',
    head: [['Statistica', 'Valore']],
    body: teamRows.map(([label, value]) => [label, value]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    columnStyles: { 1: { halign: 'right' } },
  });
  cursorY = finalYOf(doc, cursorY) + 8;

  // --- Per-player table (whole match) -------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Statistiche giocatori — Totale partita', PAGE_MARGIN, cursorY);
  cursorY += 3;

  runTable({
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    theme: 'grid',
    head: [['N.', 'Giocatore', 'Ruolo', 'Punti', 'Att%', 'Muri', 'Ace', 'Err.', 'Ric%']],
    body: stats.players.map((player) => [
      player.isKnownPlayer ? String(rosterShirt(match, player.playerId) ?? '') : '',
      player.isKnownPlayer ? rosterName(match, player.playerId) : `Sconosciuto (${player.playerId})`,
      player.isKnownPlayer ? rosterRole(match, player.playerId) : '',
      formatCount(player.points),
      formatPercent1(player.attackEfficiency),
      formatCount(player.blockPoints),
      formatCount(player.aces),
      formatCount(player.errors),
      formatPercent1(player.receptionPositivity),
    ]),
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    didParseCell: (data) => {
      // Keep numeric columns visually aligned right, name/role left.
      if (data.column.index >= 3) data.cell.styles.halign = 'right';
    },
  });
  cursorY = finalYOf(doc, cursorY) + 8;

  // --- Per-set trend (§6) --------------------------------------------------------------------
  if (cursorY > 250) {
    doc.addPage();
    cursorY = PAGE_MARGIN;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Andamento per set', PAGE_MARGIN, cursorY);
  cursorY += 3;

  runTable({
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    theme: 'striped',
    head: [['Set', 'Punti fatti', 'Punti subiti', 'Eff. attacco', 'Ric. positività', 'Errori']],
    body: stats.perSetTeam.map((teamSet, index) => [
      `Set ${String(index + 1)}`,
      formatCount(teamSet.pointsScored),
      formatCount(teamSet.pointsConceded),
      formatPercent1(teamSet.attackEfficiency),
      formatPercent1(teamSet.receptionPositivity),
      formatCount(teamSet.errors),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
  });
  cursorY = finalYOf(doc, cursorY) + 8;

  // --- Notes -----------------------------------------------------------------------------
  if (match.info.notes.trim().length > 0) {
    if (cursorY > 260) {
      doc.addPage();
      cursorY = PAGE_MARGIN;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Note', PAGE_MARGIN, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(match.info.notes, PAGE_WIDTH - PAGE_MARGIN * 2) as string[];
    doc.text(lines, PAGE_MARGIN, cursorY);
  }

  drawFooter(doc, generatedOn);

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
