import { z } from 'zod';
import type { AppSettings, Match, RosterTemplate } from '@domain/index';
import { SCHEMA_VERSION } from '@domain/index';

/**
 * Validation of everything read from disk or imported by the user.
 * The schemas mirror the domain types; anything that does not parse is treated as corrupt data
 * rather than crashing the app.
 */

const idSchema = z.string().min(1).max(200);
const timestampSchema = z.string().min(1).max(40);
const scoreSchema = z.object({ us: z.number().int().min(0), them: z.number().int().min(0) });
const teamSideSchema = z.enum(['us', 'them']);

const playerRoleSchema = z.enum(['setter', 'outside', 'opposite', 'middle', 'libero', 'unknown']);

export const playerSchema = z.object({
  id: idSchema,
  shirtNumber: z.number().int().min(0).max(99),
  name: z.string().min(1).max(60),
  shortName: z.string().min(1).max(12),
  role: playerRoleSchema,
  isLibero: z.boolean(),
  isAvailable: z.boolean(),
});

const teamSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(60),
  isOurTeam: z.boolean(),
});

const matchSettingsSchema = z.object({
  bestOf: z.union([z.literal(3), z.literal(5)]),
  pointsToWinSet: z.number().int().min(1).max(99),
  pointsToWinTieBreak: z.number().int().min(1).max(99),
  winByTwo: z.boolean(),
  startingServer: teamSideSchema,
  startingSide: z.enum(['left', 'right']),
  timeoutsPerSet: z.number().int().min(0).max(10),
  substitutionsPerSet: z.number().int().min(0).max(20),
  trackSetSkill: z.boolean(),
});

const lineupSchema = z.tuple([idSchema, idSchema, idSchema, idSchema, idSchema, idSchema]);

const skillSchema = z.enum(['serve', 'reception', 'attack', 'block', 'dig', 'set']);
const outcomeSchema = z.enum(['point', 'positive', 'neutral', 'negative', 'error']);

const eventBase = {
  id: idSchema,
  timestamp: timestampSchema,
  setIndex: z.number().int().min(0),
  sequence: z.number().int().min(0),
};

const rallyFields = {
  scoreBefore: scoreSchema,
  scoreAfter: scoreSchema,
  servingBefore: teamSideSchema,
  servingAfter: teamSideSchema,
  rotationBefore: z.number().int().min(0).max(5),
  rotationAfter: z.number().int().min(0).max(5),
};

export const scoutEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...eventBase,
    ...rallyFields,
    type: z.literal('rally'),
    playerId: idSchema,
    skill: skillSchema,
    outcome: outcomeSchema,
    isTerminal: z.boolean(),
    pointTo: teamSideSchema.nullable(),
    comment: z.string().max(200),
  }),
  z.object({
    ...eventBase,
    ...rallyFields,
    type: z.literal('opponent_point'),
    pointTo: z.literal('them'),
    comment: z.string().max(200),
  }),
  z.object({
    ...eventBase,
    ...rallyFields,
    type: z.literal('our_point'),
    pointTo: z.literal('us'),
    comment: z.string().max(200),
  }),
  z.object({
    ...eventBase,
    type: z.literal('timeout'),
    team: teamSideSchema,
    atScore: scoreSchema,
  }),
  z.object({
    ...eventBase,
    type: z.literal('substitution'),
    playerOutId: idSchema,
    playerInId: idSchema,
    lineupSlot: z.number().int().min(0).max(5),
    atScore: scoreSchema,
  }),
  z.object({
    ...eventBase,
    type: z.literal('set_start'),
    lineup: lineupSchema,
    servingTeam: teamSideSchema,
    target: z.number().int().min(1).max(99),
  }),
  z.object({
    ...eventBase,
    type: z.literal('set_end'),
    winner: teamSideSchema,
    finalScore: scoreSchema,
    setsAfter: z.object({ us: z.number().int().min(0), them: z.number().int().min(0) }),
    endsMatch: z.boolean(),
  }),
  z.object({
    ...eventBase,
    type: z.literal('note'),
    text: z.string().min(1).max(500),
    atScore: scoreSchema,
  }),
]);

const setStateSchema = z.object({
  index: z.number().int().min(0),
  status: z.enum(['pending', 'live', 'finished']),
  ourPoints: z.number().int().min(0),
  theirPoints: z.number().int().min(0),
  winner: teamSideSchema.nullable(),
  servingTeam: teamSideSchema,
  rotationOffset: z.number().int().min(0).max(5),
  lineup: lineupSchema.nullable(),
  timeoutsUsed: z.object({ us: z.number().int().min(0), them: z.number().int().min(0) }),
  substitutionsUsed: z.number().int().min(0),
  startedAt: timestampSchema.nullable(),
  endedAt: timestampSchema.nullable(),
  isTieBreak: z.boolean(),
  target: z.number().int().min(0).max(99),
});

export const matchSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: idSchema,
  status: z.enum(['setup', 'live', 'finished', 'abandoned']),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  closedAt: timestampSchema.nullable(),
  info: z.object({
    ourTeam: teamSchema,
    opponentTeam: teamSchema,
    date: z.string().min(1).max(20),
    venue: z.string().max(80),
    competition: z.string().max(80),
    notes: z.string().max(2000),
  }),
  settings: matchSettingsSchema,
  roster: z.array(playerSchema),
  sets: z.array(setStateSchema),
  events: z.array(scoutEventSchema),
});

export const rosterTemplateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: idSchema,
  name: z.string().min(1).max(60),
  teamName: z.string().max(60),
  players: z.array(playerSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** Every saved roster in one file, so a reinstalled web app can get them all back at once. */
export const rosterBackupSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  kind: z.literal('volley-scout-rosters'),
  exportedAt: timestampSchema,
  rosters: z.array(rosterTemplateSchema),
});

export const appSettingsSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  theme: z.enum(['light', 'dark', 'system']),
  defaultTeamName: z.string().max(60),
  defaultMatchSettings: matchSettingsSchema,
  confirmDestructiveActions: z.boolean(),
  autoConfirmActions: z.boolean(),
  keyboardShortcutsEnabled: z.boolean(),
  showSoftLimitWarnings: z.boolean(),
  lastOpenedMatchId: idSchema.nullable(),
});

/**
 * Compile-time guard against schema drift: if a domain type gains a required field that the
 * schema does not parse, these assignments stop compiling instead of failing at runtime.
 */
const assertMatchShape: (value: z.infer<typeof matchSchema>) => Match = (value) => value;
const assertTemplateShape: (value: z.infer<typeof rosterTemplateSchema>) => RosterTemplate = (
  value,
) => value;
const assertSettingsShape: (value: z.infer<typeof appSettingsSchema>) => AppSettings = (value) =>
  value;
void assertMatchShape;
void assertTemplateShape;
void assertSettingsShape;

export type ParseErrorCode = 'INVALID_JSON' | 'INVALID_DATA';

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: ParseErrorCode; readonly detail: string };

function parseWith<T>(
  schema: z.ZodType<unknown>,
  raw: unknown,
  cast: (value: unknown) => T,
): ParseResult<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const detail = first === undefined ? 'unknown' : `${first.path.join('.')}: ${first.message}`;
    return { ok: false, code: 'INVALID_DATA', detail };
  }
  return { ok: true, value: cast(result.data) };
}

export function parseMatch(raw: unknown): ParseResult<Match> {
  return parseWith(matchSchema, raw, (value) => value as Match);
}

export function parseRosterTemplate(raw: unknown): ParseResult<RosterTemplate> {
  return parseWith(rosterTemplateSchema, raw, (value) => value as RosterTemplate);
}

export function parseRosterBackup(raw: unknown): ParseResult<readonly RosterTemplate[]> {
  return parseWith(rosterBackupSchema, raw, (value) =>
    (value as z.infer<typeof rosterBackupSchema>).rosters.map((roster) => roster as RosterTemplate),
  );
}

export function parseAppSettings(raw: unknown): ParseResult<AppSettings> {
  return parseWith(appSettingsSchema, raw, (value) => value as AppSettings);
}

export function parseJson(text: string): ParseResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return {
      ok: false,
      code: 'INVALID_JSON',
      detail: error instanceof Error ? error.message : 'parse failed',
    };
  }
}
