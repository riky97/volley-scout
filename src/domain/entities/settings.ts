import type { Id, SchemaVersion, TeamSide } from './common';
import { SCHEMA_VERSION } from './common';

export type BestOf = 3 | 5;

export interface MatchSettings {
  readonly bestOf: BestOf;
  /** Points to win a normal set, 1..99. */
  readonly pointsToWinSet: number;
  /** Points to win the deciding tie-break set, 1..99. */
  readonly pointsToWinTieBreak: number;
  readonly winByTwo: boolean;
  readonly startingServer: TeamSide;
  /** Cosmetic: which half of the court widget we are drawn on in set 1. */
  readonly startingSide: 'left' | 'right';
  /** Soft limits: warned about, never enforced. */
  readonly timeoutsPerSet: number;
  readonly substitutionsPerSet: number;
  /** When false the `set` skill is hidden from the action pad. */
  readonly trackSetSkill: boolean;
}

export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  bestOf: 5,
  pointsToWinSet: 25,
  pointsToWinTieBreak: 15,
  winByTwo: true,
  startingServer: 'us',
  startingSide: 'left',
  timeoutsPerSet: 2,
  substitutionsPerSet: 6,
  trackSetSkill: false,
};

export type ThemeMode = 'light' | 'dark' | 'system';

/** Persisted root: application preferences. */
export interface AppSettings {
  readonly schemaVersion: SchemaVersion;
  readonly theme: ThemeMode;
  readonly defaultTeamName: string;
  readonly defaultMatchSettings: MatchSettings;
  readonly confirmDestructiveActions: boolean;
  /** Append the event as soon as an outcome is chosen (the 2-click flow). */
  readonly autoConfirmActions: boolean;
  readonly keyboardShortcutsEnabled: boolean;
  readonly showSoftLimitWarnings: boolean;
  readonly lastOpenedMatchId: Id | null;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: SCHEMA_VERSION,
  theme: 'system',
  defaultTeamName: '',
  defaultMatchSettings: DEFAULT_MATCH_SETTINGS,
  confirmDestructiveActions: true,
  autoConfirmActions: true,
  keyboardShortcutsEnabled: true,
  showSoftLimitWarnings: true,
  lastOpenedMatchId: null,
};
