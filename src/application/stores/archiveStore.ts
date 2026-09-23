import { create } from 'zustand';
import type { Id, Match, Player, RosterTemplate } from '@domain/index';
import { createRosterTemplate } from '@domain/index';
import type { ArchiveEntry } from '@infrastructure/storage';
import { repository, useMatchStore } from './matchStore';
import { newId, nowIso } from '../clock';
import type { RosterMerge } from '../services/mergeRosters';
import { mergeRosters } from '../services/mergeRosters';
import type { MatchImportDecision } from '../services/matchImport';
import { decideMatchImport } from '../services/matchImport';

export interface ArchiveStoreState {
  readonly matches: readonly ArchiveEntry[];
  readonly templates: readonly RosterTemplate[];
  readonly isLoading: boolean;
  refresh: () => Promise<void>;
  deleteMatch: (id: Id) => Promise<void>;
  saveTemplate: (name: string, teamName: string, players: readonly Player[]) => Promise<void>;
  updateTemplate: (template: RosterTemplate, players: readonly Player[]) => Promise<void>;
  deleteTemplate: (id: Id) => Promise<void>;
  /** Saves the rosters of a backup that are new or newer than the local copy. */
  importTemplates: (rosters: readonly RosterTemplate[]) => Promise<RosterMerge>;
  /**
   * Saves an exported match unless this device holds a newer copy. When that match is the one
   * loaded (Home resumes the last unfinished match, so it often is), the loaded copy is replaced
   * too. `busy` means a save of the loaded match is still in flight and nothing was written.
   */
  importMatch: (match: Match) => Promise<MatchImportDecision | 'busy'>;
}

export const useArchiveStore = create<ArchiveStoreState>((set, get) => ({
  matches: [],
  templates: [],
  isLoading: false,

  refresh: async () => {
    set({ isLoading: true });
    const [matches, templates] = await Promise.all([
      repository.listMatches(),
      repository.listTemplates(),
    ]);
    set({ matches, templates, isLoading: false });
  },

  deleteMatch: async (id) => {
    await repository.deleteMatch(id);
    set({ matches: get().matches.filter((entry) => entry.id !== id) });
  },

  saveTemplate: async (name, teamName, players) => {
    const template = createRosterTemplate({
      id: newId(),
      name,
      teamName,
      players,
      timestamp: nowIso(),
    });
    await repository.saveTemplate(template);
    await get().refresh();
  },

  updateTemplate: async (template, players) => {
    await repository.saveTemplate({ ...template, players, updatedAt: nowIso() });
    await get().refresh();
  },

  deleteTemplate: async (id) => {
    await repository.deleteTemplate(id);
    set({ templates: get().templates.filter((template) => template.id !== id) });
  },

  importTemplates: async (rosters) => {
    // Merge against what is on disk, not against a list that may not have loaded yet.
    const merge = mergeRosters(await repository.listTemplates(), rosters);
    for (const roster of merge.toSave) await repository.saveTemplate(roster);
    await get().refresh();
    return merge;
  },

  importMatch: async (match) => {
    const loaded = await repository.loadMatch(match.id);
    const decision = decideMatchImport(loaded.kind === 'ok' ? loaded.value : null, match);
    if (decision === 'unchanged') return decision;

    const matchState = useMatchStore.getState();
    const isOpen = matchState.match?.id === match.id;
    // A save in flight would land after the import and bring the older copy back.
    if (isOpen && (matchState.saveState === 'pending' || matchState.saveState === 'saving')) {
      return 'busy';
    }
    await repository.saveMatch(match);
    if (isOpen) await matchState.loadMatch(match.id);
    await get().refresh();
    return decision;
  },
}));
