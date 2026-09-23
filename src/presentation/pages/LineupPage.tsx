import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CourtPosition, Id, Lineup, Player, TeamSide } from '@domain/index';
import { DEFAULT_MATCH_SETTINGS, firstServerOfSet } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import {
  COMMON_BUTTONS,
  HOME,
  LINEUP,
  NEW_MATCH,
  STEPS,
  messageForErrorCode,
} from '@shared/copy';
import { Button } from '@presentation/components/ui/Button';
import { EmptyState } from '@presentation/components/ui/EmptyState';
import { showToast } from '@presentation/components/ui/Toast';
import { StepIndicator } from '@presentation/components/roster/StepIndicator';
import { CourtLayout } from '@presentation/components/roster/CourtLayout';
import { PlayerChip } from '@presentation/components/roster/PlayerChip';
import { ROUTES } from '@presentation/routes';

type SlotMap = Record<CourtPosition, Id | null>;

function emptySlots(): SlotMap {
  return { P1: null, P2: null, P3: null, P4: null, P5: null, P6: null };
}

/** Pre-fills slots from the previous set's initial P1..P6 order, dropping players no longer available. */
function slotsFromPreviousLineup(lineup: Lineup | null, roster: readonly Player[]): SlotMap {
  const slots = emptySlots();
  if (lineup === null) return slots;
  const availableIds = new Set(roster.filter((player) => player.isAvailable).map((p) => p.id));
  const [p1, p2, p3, p4, p5, p6] = lineup;
  const ordered: ReadonlyArray<readonly [CourtPosition, Id]> = [
    ['P1', p1],
    ['P2', p2],
    ['P3', p3],
    ['P4', p4],
    ['P5', p5],
    ['P6', p6],
  ];
  for (const [position, playerId] of ordered) {
    if (availableIds.has(playerId)) slots[position] = playerId;
  }
  return slots;
}

/** Builds a type-safe Lineup tuple from the six named slots, or null while any is empty. */
function buildLineup(slots: SlotMap): Lineup | null {
  const { P1, P2, P3, P4, P5, P6 } = slots;
  if (P1 === null || P2 === null || P3 === null || P4 === null || P5 === null || P6 === null) {
    return null;
  }
  return [P1, P2, P3, P4, P5, P6];
}

export function LineupPage(): React.JSX.Element {
  const navigate = useNavigate();
  const match = useMatchStore((state) => state.match);
  const startSet = useMatchStore((state) => state.startSet);

  const setIndex = match?.sets.length ?? 0;
  const setNumber = setIndex + 1;
  const previousSet = match !== null && match.sets.length > 0 ? (match.sets.at(-1) ?? null) : null;
  const roster = match?.roster ?? [];

  const [slots, setSlots] = useState<SlotMap>(() =>
    slotsFromPreviousLineup(previousSet?.lineup ?? null, roster),
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id | null>(null);
  const [servingTeam, setServingTeam] = useState<TeamSide>(() =>
    firstServerOfSet(match?.settings ?? DEFAULT_MATCH_SETTINGS, setIndex),
  );

  const legendId = useId();
  const errorId = useId();

  if (match === null) {
    return (
      <div className="p-[var(--sp-6)]">
        <EmptyState
          title={HOME.emptyState.title}
          description={HOME.emptyState.body}
          action={
            <Button
              variant="primary"
              onClick={() => {
                void navigate(ROUTES.newMatch);
              }}
            >
              {HOME.emptyState.button}
            </Button>
          }
        />
      </div>
    );
  }

  const playersById = new Map(roster.map((player) => [player.id, player] as const));
  const placedIds = new Set(Object.values(slots).filter((id): id is Id => id !== null));
  const bench = roster.filter((player) => player.isAvailable && !placedIds.has(player.id));
  const filledCount = placedIds.size;
  const isComplete = filledCount === 6;

  function selectPosition(position: CourtPosition): void {
    if (selectedPlayerId !== null) {
      setSlots((prev) => ({ ...prev, [position]: selectedPlayerId }));
      setSelectedPlayerId(null);
      return;
    }
    if (slots[position] !== null) {
      setSlots((prev) => ({ ...prev, [position]: null }));
    }
  }

  function selectPlayer(id: Id): void {
    setSelectedPlayerId((prev) => (prev === id ? null : id));
  }

  function clearLineup(): void {
    setSlots(emptySlots());
    setSelectedPlayerId(null);
  }

  function handleConfirm(): void {
    const lineup = buildLineup(slots);
    if (lineup === null) return;
    startSet(lineup, servingTeam);
    const code = useMatchStore.getState().lastErrorCode;
    if (code !== null) {
      showToast(messageForErrorCode(code), 'error');
      return;
    }
    void navigate(ROUTES.live);
  }

  const confirmLabel = setIndex === 0 ? LINEUP.startMatch : LINEUP.startSet(setNumber);

  return (
    <div className="flex flex-col gap-[var(--sp-5)] p-[var(--sp-6)]">
      <header className="flex flex-col gap-[var(--sp-2)]">
        <div className="flex items-center justify-between">
          <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">
            {LINEUP.title(setNumber)}
          </h1>
          <span className="text-[var(--fs-small)] text-[var(--text-muted)]">{STEPS.label(3)}</span>
        </div>
        <StepIndicator steps={STEPS.names} current={2} />
      </header>

      <div className="grid grid-cols-1 gap-[var(--sp-5)] lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-[var(--sp-4)]">
          <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{LINEUP.court}</h2>
          <CourtLayout
            slots={slots}
            playersById={playersById}
            weAreServing={servingTeam === 'us'}
            onSelectPosition={selectPosition}
          />

          <fieldset className="flex flex-col gap-[var(--sp-2)]">
            <legend id={legendId} className="text-[var(--fs-body)] font-semibold text-[var(--text)]">
              {NEW_MATCH.firstServe}
            </legend>
            <div className="flex gap-[var(--sp-4)]" role="radiogroup" aria-labelledby={legendId}>
              <label className="flex min-h-[var(--hit-min)] items-center gap-[var(--sp-2)]">
                <input
                  type="radio"
                  name="serving-team"
                  checked={servingTeam === 'us'}
                  onChange={() => {
                    setServingTeam('us');
                  }}
                />
                {NEW_MATCH.serveUs}
              </label>
              <label className="flex min-h-[var(--hit-min)] items-center gap-[var(--sp-2)]">
                <input
                  type="radio"
                  name="serving-team"
                  checked={servingTeam === 'them'}
                  onChange={() => {
                    setServingTeam('them');
                  }}
                />
                {NEW_MATCH.serveThem}
              </label>
            </div>
            <p className="text-[var(--fs-small)] text-[var(--text-muted)]">
              {LINEUP.firstServe(servingTeam === 'us' ? 'Nostro' : 'Avversario')}
            </p>
          </fieldset>

          {!isComplete && (
            <p id={errorId} role="alert" className="text-[var(--fs-small)] text-[var(--outcome-error)]">
              {LINEUP.error.incomplete}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-[var(--sp-3)]">
          <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{LINEUP.available}</h2>
          {bench.length === 0 ? (
            <p className="text-[var(--fs-body)] text-[var(--text-muted)]">{LINEUP.emptyBench}</p>
          ) : (
            <div className="flex flex-wrap gap-[var(--sp-2)]">
              {bench.map((player) => (
                <PlayerChip
                  key={player.id}
                  player={player}
                  selected={selectedPlayerId === player.id}
                  onSelect={selectPlayer}
                />
              ))}
            </div>
          )}
          <p className="text-[var(--fs-small)] text-[var(--text-muted)]">{LINEUP.hint}</p>
        </section>
      </div>

      <footer className="flex items-center justify-between border-t border-[var(--border)] pt-[var(--sp-4)]">
        <Button
          variant="secondary"
          onClick={() => {
            void navigate(ROUTES.roster);
          }}
        >
          {COMMON_BUTTONS.back}
        </Button>
        <div className="flex gap-[var(--sp-3)]">
          <Button variant="ghost" onClick={clearLineup}>
            {LINEUP.clear}
          </Button>
          <Button
            variant="primary"
            disabled={!isComplete}
            aria-describedby={!isComplete ? errorId : undefined}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
}
