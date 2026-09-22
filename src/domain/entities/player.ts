import type { Id, IsoTimestamp, SchemaVersion } from './common';

export type PlayerRole = 'setter' | 'outside' | 'opposite' | 'middle' | 'libero' | 'unknown';

export const PLAYER_ROLES: readonly PlayerRole[] = [
  'setter',
  'outside',
  'opposite',
  'middle',
  'libero',
  'unknown',
] as const;

export interface Player {
  readonly id: Id;
  /** 0..99 inclusive. Uniqueness inside a roster is validated, not enforced by the type. */
  readonly shirtNumber: number;
  /** Full name as typed, 1..60 chars, trimmed. */
  readonly name: string;
  /** Compact label for the action pad and the court, 1..12 chars. */
  readonly shortName: string;
  readonly role: PlayerRole;
  readonly isLibero: boolean;
  /** false = injured or not dressed; cannot enter a lineup nor a substitution. */
  readonly isAvailable: boolean;
}

/** Persisted root: a roster saved for reuse across matches. */
export interface RosterTemplate {
  readonly schemaVersion: SchemaVersion;
  readonly id: Id;
  readonly name: string;
  readonly teamName: string;
  readonly players: readonly Player[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}
