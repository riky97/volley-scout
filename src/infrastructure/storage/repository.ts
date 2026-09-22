import type { AppSettings, Id, Match, RosterTemplate, TeamSide } from '@domain/index';
import { DEFAULT_APP_SETTINGS, setsWonFrom } from '@domain/index';
import type { StorageAdapter } from '@application/ports/storage';
import type { ParseErrorCode } from './schemas';
import { parseAppSettings, parseJson, parseMatch, parseRosterTemplate } from './schemas';

const MATCHES_DIR = 'matches';
const TEMPLATES_DIR = 'templates';
const SETTINGS_FILE = 'settings.json';

export type LoadOutcome<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'missing' }
  /** The file existed but could not be used; it has been quarantined, never deleted. */
  | { readonly kind: 'corrupt'; readonly code: ParseErrorCode; readonly detail: string };

export interface ArchiveEntry {
  readonly id: Id;
  readonly date: string;
  readonly ourTeamName: string;
  readonly opponentTeamName: string;
  readonly competition: string;
  readonly status: Match['status'];
  readonly setsWon: Readonly<Record<TeamSide, number>>;
  readonly updatedAt: string;
}

function matchPath(id: Id): string {
  return `${MATCHES_DIR}/${sanitiseId(id)}.json`;
}

function templatePath(id: Id): string {
  return `${TEMPLATES_DIR}/${sanitiseId(id)}.json`;
}

/** Ids come from crypto.randomUUID(), but a hand-edited file must never build a path. */
export function sanitiseId(id: Id): string {
  return id.replace(/[^A-Za-z0-9-_]/gu, '_').slice(0, 64);
}

function quarantineSuffix(now: Date): string {
  return now.toISOString().replace(/[^0-9]/gu, '').slice(0, 14);
}

export class LocalRepository {
  constructor(private readonly storage: StorageAdapter) {}

  async saveMatch(match: Match): Promise<void> {
    await this.storage.write(matchPath(match.id), JSON.stringify(match));
  }

  async loadMatch(id: Id): Promise<LoadOutcome<Match>> {
    return await this.loadDocument(matchPath(id), parseMatch);
  }

  async deleteMatch(id: Id): Promise<void> {
    await this.storage.remove(matchPath(id));
  }

  async listMatches(): Promise<readonly ArchiveEntry[]> {
    const files = await this.storage.list(MATCHES_DIR);
    const entries: ArchiveEntry[] = [];
    for (const file of files) {
      const raw = await this.storage.read(`${MATCHES_DIR}/${file}`);
      if (raw === null) continue;
      const json = parseJson(raw);
      if (!json.ok) continue;
      const parsed = parseMatch(json.value);
      if (!parsed.ok) continue;
      const match = parsed.value;
      entries.push({
        id: match.id,
        date: match.info.date,
        ourTeamName: match.info.ourTeam.name,
        opponentTeamName: match.info.opponentTeam.name,
        competition: match.info.competition,
        status: match.status,
        setsWon: setsWonFrom(match.sets),
        updatedAt: match.updatedAt,
      });
    }
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** The most recent match that is still playable, used by the "Riprendi partita" entry point. */
  async findResumableMatch(): Promise<Match | null> {
    const entries = await this.listMatches();
    const candidate = entries.find(
      (entry) => entry.status === 'live' || entry.status === 'setup',
    );
    if (candidate === undefined) return null;
    const loaded = await this.loadMatch(candidate.id);
    return loaded.kind === 'ok' ? loaded.value : null;
  }

  async saveTemplate(template: RosterTemplate): Promise<void> {
    await this.storage.write(templatePath(template.id), JSON.stringify(template));
  }

  async deleteTemplate(id: Id): Promise<void> {
    await this.storage.remove(templatePath(id));
  }

  async listTemplates(): Promise<readonly RosterTemplate[]> {
    const files = await this.storage.list(TEMPLATES_DIR);
    const templates: RosterTemplate[] = [];
    for (const file of files) {
      const raw = await this.storage.read(`${TEMPLATES_DIR}/${file}`);
      if (raw === null) continue;
      const json = parseJson(raw);
      if (!json.ok) continue;
      const parsed = parseRosterTemplate(json.value);
      if (parsed.ok) templates.push(parsed.value);
    }
    return templates.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.storage.write(SETTINGS_FILE, JSON.stringify(settings));
  }

  /** Settings are never blocking: a corrupt file falls back to the defaults. */
  async loadSettings(): Promise<AppSettings> {
    const outcome = await this.loadDocument(SETTINGS_FILE, parseAppSettings);
    return outcome.kind === 'ok' ? outcome.value : DEFAULT_APP_SETTINGS;
  }

  async dataLocation(): Promise<string> {
    return await this.storage.location();
  }

  private async loadDocument<T>(
    path: string,
    parse: (raw: unknown) => { ok: true; value: T } | { ok: false; code: ParseErrorCode; detail: string },
  ): Promise<LoadOutcome<T>> {
    const raw = await this.storage.read(path);
    if (raw === null) return { kind: 'missing' };

    const json = parseJson(raw);
    if (!json.ok) {
      await this.storage.quarantine(path, quarantineSuffix(new Date()));
      return { kind: 'corrupt', code: json.code, detail: json.detail };
    }

    const parsed = parse(json.value);
    if (!parsed.ok) {
      await this.storage.quarantine(path, quarantineSuffix(new Date()));
      return { kind: 'corrupt', code: parsed.code, detail: parsed.detail };
    }

    return { kind: 'ok', value: parsed.value };
  }
}
