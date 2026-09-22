import clsx from 'clsx';
import type { EventOutcome, Id, Player, Skill } from '@domain/index';
import { ALLOWED_OUTCOMES, OUTCOMES, SKILLS, isAllowedOutcome } from '@domain/index';
import { LIVE, OUTCOME_LABELS, OUTCOME_SYMBOLS, SKILL_LABELS } from '@shared/copy';
import styles from './ActionPad.module.scss';

export interface ActionPadProps {
  readonly players: readonly Player[];
  readonly onCourtIds: readonly Id[];
  readonly selectedPlayerId: Id | null;
  readonly selectedSkill: Skill | null;
  readonly numberBuffer: string;
  readonly trackSetSkill: boolean;
  readonly onSelectPlayer: (playerId: Id) => void;
  readonly onSelectSkill: (skill: Skill) => void;
  readonly onSelectOutcome: (outcome: EventOutcome) => void;
  readonly onCancel: () => void;
}

/**
 * Three ordered steps, player then skill then outcome, committed as soon as the outcome is
 * picked. Invalid combinations stay visible but disabled so the button geometry never moves
 * under the operator's finger mid-match.
 */
export function ActionPad({
  players,
  onCourtIds,
  selectedPlayerId,
  selectedSkill,
  numberBuffer,
  trackSetSkill,
  onSelectPlayer,
  onSelectSkill,
  onSelectOutcome,
  onCancel,
}: ActionPadProps): React.JSX.Element {
  const visibleSkills = SKILLS.filter((skill) => skill !== 'set' || trackSetSkill);
  const allowed: readonly EventOutcome[] =
    selectedSkill === null ? OUTCOMES : ALLOWED_OUTCOMES[selectedSkill];

  return (
    <section className={styles.pad} aria-label={LIVE.action}>
      <header className={styles.header}>
        <h2 className={styles.title}>{LIVE.action}</h2>
        {numberBuffer.length > 0 && (
          <span className={styles.buffer} role="status">
            {LIVE.numberBuffer(numberBuffer)}
          </span>
        )}
        {/* Always rendered, so choosing a player never shifts the buttons under the cursor. */}
        <button
          type="button"
          className={styles.cancel}
          disabled={selectedPlayerId === null && selectedSkill === null}
          onClick={onCancel}
        >
          {LIVE.cancelSelection}
        </button>
      </header>

      <p className={styles.hint}>{LIVE.padHint}</p>

      <div className={styles.step}>
        <h3 className={styles.stepTitle} id="pad-step-player">
          {LIVE.step1}
        </h3>
        <div className={styles.players} role="group" aria-labelledby="pad-step-player">
          {players.map((player) => {
            const isSelected = player.id === selectedPlayerId;
            const isOnCourt = onCourtIds.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                className={clsx(
                  styles.player,
                  isSelected && styles.selected,
                  !isOnCourt && styles.bench,
                )}
                aria-pressed={isSelected}
                onClick={() => {
                  onSelectPlayer(player.id);
                }}
              >
                <span className={styles.shirt}>{player.shirtNumber}</span>
                <span className={styles.playerName}>{player.shortName}</span>
                {isSelected && <span aria-hidden="true">✔</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.step}>
        <h3 className={styles.stepTitle} id="pad-step-skill">
          {LIVE.step2}
        </h3>
        <div className={styles.skills} role="group" aria-labelledby="pad-step-skill">
          {visibleSkills.map((skill) => {
            const isSelected = skill === selectedSkill;
            return (
              <button
                key={skill}
                type="button"
                className={clsx(styles.skill, isSelected && styles.selected)}
                aria-pressed={isSelected}
                disabled={selectedPlayerId === null}
                onClick={() => {
                  onSelectSkill(skill);
                }}
              >
                {SKILL_LABELS[skill]}
                {isSelected && <span aria-hidden="true"> ✔</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.step}>
        <h3 className={styles.stepTitle} id="pad-step-outcome">
          {LIVE.step3}
        </h3>
        <div className={styles.outcomes} role="group" aria-labelledby="pad-step-outcome">
          {OUTCOMES.map((outcome) => {
            const enabled =
              selectedPlayerId !== null &&
              selectedSkill !== null &&
              isAllowedOutcome(selectedSkill, outcome);
            return (
              <button
                key={outcome}
                type="button"
                className={clsx(styles.outcome, styles[outcome])}
                disabled={!enabled}
                title={
                  selectedSkill !== null && !allowed.includes(outcome)
                    ? LIVE.outcomeNotAllowedTooltip
                    : undefined
                }
                onClick={() => {
                  onSelectOutcome(outcome);
                }}
              >
                <span className={styles.outcomeSymbol} aria-hidden="true">
                  {OUTCOME_SYMBOLS[outcome]}
                </span>
                <span>{OUTCOME_LABELS[outcome]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
