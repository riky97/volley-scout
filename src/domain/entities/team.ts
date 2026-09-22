import type { Id } from './common';

export interface Team {
  readonly id: Id;
  /** Free text as typed by the operator, 1..60 chars, trimmed. */
  readonly name: string;
  /** true for the scouted team; exactly one Team per Match has true. */
  readonly isOurTeam: boolean;
}
