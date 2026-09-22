import type { Id, IsoDate, IsoTimestamp } from './entities/common';
import { SCHEMA_VERSION } from './entities/common';
import type { Match } from './entities/match';
import type { Player, PlayerRole, RosterTemplate } from './entities/player';
import type { MatchSettings } from './entities/settings';

export interface CreateMatchInput {
  readonly id: Id;
  readonly ourTeamId: Id;
  readonly opponentTeamId: Id;
  readonly ourTeamName: string;
  readonly opponentTeamName: string;
  readonly date: IsoDate;
  readonly venue: string;
  readonly competition: string;
  readonly notes: string;
  readonly settings: MatchSettings;
  readonly roster: readonly Player[];
  readonly timestamp: IsoTimestamp;
}

export function createMatch(input: CreateMatchInput): Match {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: input.id,
    status: 'setup',
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
    closedAt: null,
    info: {
      ourTeam: { id: input.ourTeamId, name: input.ourTeamName, isOurTeam: true },
      opponentTeam: { id: input.opponentTeamId, name: input.opponentTeamName, isOurTeam: false },
      date: input.date,
      venue: input.venue,
      competition: input.competition,
      notes: input.notes,
    },
    settings: input.settings,
    roster: input.roster,
    sets: [],
    events: [],
  };
}

export interface CreatePlayerInput {
  readonly id: Id;
  readonly shirtNumber: number;
  readonly name: string;
  readonly shortName?: string;
  readonly role?: PlayerRole;
  readonly isLibero?: boolean;
  readonly isAvailable?: boolean;
}

/** Falls back to the last word of the full name, truncated to the court label length. */
export function deriveShortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '';
  const parts = trimmed.split(/\s+/u);
  const candidate = parts.length > 1 ? (parts.at(-1) ?? trimmed) : trimmed;
  return candidate.slice(0, 12);
}

export function createPlayer(input: CreatePlayerInput): Player {
  const isLibero = input.isLibero ?? false;
  return {
    id: input.id,
    shirtNumber: input.shirtNumber,
    name: input.name.trim(),
    shortName: (input.shortName ?? deriveShortName(input.name)).slice(0, 12),
    role: isLibero ? 'libero' : (input.role ?? 'unknown'),
    isLibero,
    isAvailable: input.isAvailable ?? true,
  };
}

export interface CreateRosterTemplateInput {
  readonly id: Id;
  readonly name: string;
  readonly teamName: string;
  readonly players: readonly Player[];
  readonly timestamp: IsoTimestamp;
}

export function createRosterTemplate(input: CreateRosterTemplateInput): RosterTemplate {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: input.id,
    name: input.name.trim(),
    teamName: input.teamName.trim(),
    players: input.players,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
  };
}

/** Players copied out of a template get fresh ids so later template edits never touch a match. */
export function copyPlayersWithNewIds(
  players: readonly Player[],
  newId: () => Id,
): readonly Player[] {
  return players.map((player) => ({ ...player, id: newId() }));
}

export function hasDuplicateShirtNumbers(players: readonly Player[]): boolean {
  const seen = new Set<number>();
  for (const player of players) {
    if (seen.has(player.shirtNumber)) return true;
    seen.add(player.shirtNumber);
  }
  return false;
}

export function duplicateShirtNumbers(players: readonly Player[]): readonly number[] {
  const counts = new Map<number, number>();
  for (const player of players) {
    counts.set(player.shirtNumber, (counts.get(player.shirtNumber) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([number]) => number);
}
