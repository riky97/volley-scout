import type { TeamStatistics } from '@domain/index';
import { STAT_LABELS } from '@shared/copy';
import { formatCount, formatPercent1 } from '@shared/format/number';

export interface TeamStatsPanelProps {
  readonly team: TeamStatistics;
}

interface Row {
  readonly label: string;
  readonly value: string;
}

function buildRows(team: TeamStatistics): readonly Row[] {
  return [
    { label: STAT_LABELS.pointsScored.long, value: formatCount(team.pointsScored) },
    { label: STAT_LABELS.pointsConceded.long, value: formatCount(team.pointsConceded) },
    { label: STAT_LABELS.errors.long, value: formatCount(team.errors) },
    { label: STAT_LABELS.opponentPoints.long, value: formatCount(team.opponentPoints) },
    { label: STAT_LABELS.attackEfficiency.long, value: formatPercent1(team.attackEfficiency) },
    { label: STAT_LABELS.aces.long, value: formatCount(team.aces) },
    { label: STAT_LABELS.serveErrors.long, value: formatCount(team.serveErrors) },
    { label: STAT_LABELS.receptionPositivity.long, value: formatPercent1(team.receptionPositivity) },
    { label: STAT_LABELS.blockPoints.long, value: formatCount(team.blockPoints) },
    { label: STAT_LABELS.timeoutsUsed.long, value: formatCount(team.timeoutsUsed) },
    { label: STAT_LABELS.substitutionsUsed.long, value: formatCount(team.substitutionsUsed) },
  ];
}

/** Compact key/value grid of the whole-match team statistics. */
export function TeamStatsPanel({ team }: TeamStatsPanelProps): React.JSX.Element {
  const rows = buildRows(team);
  return (
    <dl className="grid grid-cols-2 gap-x-[var(--sp-5)] gap-y-[var(--sp-2)] sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col">
          <dt className="text-[var(--fs-small)] text-[var(--text-muted)]">{row.label}</dt>
          <dd className="text-[var(--fs-body-lg)] font-semibold text-[var(--text)]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
