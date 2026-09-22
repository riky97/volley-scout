import { create } from 'zustand';
import type { AppSettings } from '@domain/index';
import { DEFAULT_APP_SETTINGS } from '@domain/index';
import { repository } from './matchStore';

export interface SettingsStoreState {
  readonly settings: AppSettings;
  readonly isLoaded: boolean;
  readonly dataLocation: string;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  reset: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,
  isLoaded: false,
  dataLocation: '',

  load: async () => {
    const [settings, dataLocation] = await Promise.all([
      repository.loadSettings(),
      repository.dataLocation(),
    ]);
    set({ settings, dataLocation, isLoaded: true });
  },

  update: async (patch) => {
    const next: AppSettings = { ...get().settings, ...patch };
    set({ settings: next });
    await repository.saveSettings(next);
  },

  reset: async () => {
    set({ settings: DEFAULT_APP_SETTINGS });
    await repository.saveSettings(DEFAULT_APP_SETTINGS);
  },
}));
