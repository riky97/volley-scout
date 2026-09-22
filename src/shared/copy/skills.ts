import type { Skill, EventOutcome } from '@domain/entities/event';

/** Italian label for every `Skill` (docs/03-ux-flows.md §9.4). */
export const SKILL_LABELS: Record<Skill, string> = {
  serve: 'Battuta',
  reception: 'Ricezione',
  attack: 'Attacco',
  block: 'Muro',
  dig: 'Difesa',
  set: 'Alzata',
};

/** Italian label for every `EventOutcome` (docs/03-ux-flows.md §9.4). */
export const OUTCOME_LABELS: Record<EventOutcome, string> = {
  point: 'Punto',
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
  error: 'Errore',
};

/**
 * Redundant non-colour markers — uppercase letter + shape glyph — mandated by
 * docs/03-ux-flows.md §6.4 so every outcome stays legible without relying on colour
 * (P4 "Colour is never the sole indicator").
 */
export const OUTCOME_SYMBOLS: Record<EventOutcome, string> = {
  point: 'P ▲',
  positive: '+ ●',
  neutral: '= ◆',
  negative: '− ■',
  error: 'E ✖',
};

/** Marker for the `opponent_point` rally-affecting event, which is not a `Skill`/`EventOutcome` pair. */
export const OPPONENT_POINT_SYMBOL = 'A ▼';
export const OPPONENT_POINT_LABEL = 'Punto avversario';
