import { useEffect, useRef } from 'react';
import type { EventOutcome, Skill, TeamSide } from '@domain/index';

export interface LiveShortcutHandlers {
  readonly enabled: boolean;
  readonly hasNumberBuffer: boolean;
  readonly trackSetSkill: boolean;
  readonly onDigit: (digit: string) => void;
  readonly onCommitNumber: () => void;
  readonly onBackspace: () => void;
  readonly onCourtPosition: (positionIndex: number) => void;
  readonly onSkill: (skill: Skill) => void;
  readonly onOutcome: (outcome: EventOutcome) => void;
  readonly onOurPoint: () => void;
  readonly onOpponentPoint: () => void;
  readonly onOurError: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onTimeout: (team: TeamSide) => void;
  readonly onSubstitution: () => void;
  readonly onToggleStats: () => void;
  readonly onEndSet: () => void;
  readonly onEscape: () => void;
  readonly onHelp: () => void;
}

const SKILL_KEYS: Record<string, Skill> = {
  b: 'serve',
  r: 'reception',
  a: 'attack',
  m: 'block',
  d: 'dig',
  z: 'set',
};

const OUTCOME_KEYS: Record<string, EventOutcome> = {
  p: 'point',
  '+': 'positive',
  n: 'neutral',
  '-': 'negative',
  e: 'error',
};

/** True while a text field has focus: the operator is typing, not scouting. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="dialog"]') !== null;
}

/**
 * Keyboard layer for the live screen (docs/03-ux-flows.md §5).
 * The shirt-number buffer has priority over every other single-key binding, so "1" "2" always
 * means player 12 and never a skill.
 */
export function useLiveShortcuts(handlers: LiveShortcutHandlers): void {
  const ref = useRef(handlers);

  // Keep the handler snapshot fresh without re-binding the document listener on every render.
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const current = ref.current;
      if (!current.enabled) return;
      if (isTypingTarget(event.target)) return;
      // A dialog keeps focus inside itself: its keys (Space on a button, Escape) are its own,
      // never a point or a skill recorded behind it.
      if (isInsideDialog(event.target)) return;

      const key = event.key;

      if (key === 'Escape') {
        current.onEscape();
        return;
      }
      if (key === '?') {
        event.preventDefault();
        current.onHelp();
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        const lower = key.toLowerCase();
        if (lower === 'z') {
          event.preventDefault();
          if (event.shiftKey) current.onRedo();
          else current.onUndo();
        } else if (key === 'Enter') {
          event.preventDefault();
          current.onEndSet();
        }
        return;
      }

      if (event.altKey) {
        const position = Number.parseInt(key, 10);
        if (position >= 1 && position <= 6) {
          event.preventDefault();
          current.onCourtPosition(position - 1);
        }
        return;
      }

      if (key >= '0' && key <= '9') {
        event.preventDefault();
        current.onDigit(key);
        return;
      }
      if (key === 'Enter') {
        event.preventDefault();
        current.onCommitNumber();
        return;
      }
      if (key === 'Backspace') {
        event.preventDefault();
        current.onBackspace();
        return;
      }
      // Any other key while digits are pending would silently drop the number.
      if (current.hasNumberBuffer) {
        current.onCommitNumber();
      }

      if (key === ' ') {
        event.preventDefault();
        current.onOurPoint();
        return;
      }

      const outcome = OUTCOME_KEYS[key];
      if (outcome !== undefined) {
        event.preventDefault();
        current.onOutcome(outcome);
        return;
      }

      const lower = key.toLowerCase();

      if (lower === 'x') {
        event.preventDefault();
        current.onOpponentPoint();
        return;
      }
      if (lower === 'q') {
        event.preventDefault();
        current.onOurError();
        return;
      }
      if (lower === 't') {
        event.preventDefault();
        current.onTimeout(event.shiftKey ? 'them' : 'us');
        return;
      }
      if (lower === 'c') {
        event.preventDefault();
        current.onSubstitution();
        return;
      }
      if (lower === 's') {
        event.preventDefault();
        current.onToggleStats();
        return;
      }

      const skill = SKILL_KEYS[lower];
      if (skill !== undefined && (skill !== 'set' || current.trackSetSkill)) {
        event.preventDefault();
        current.onSkill(skill);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
