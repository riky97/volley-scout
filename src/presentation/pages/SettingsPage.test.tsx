import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppSettings } from '@domain/index';
import { DEFAULT_APP_SETTINGS } from '@domain/index';
import { version } from '../../../package.json';
import { SettingsPage } from './SettingsPage';

const settingsStoreState = vi.hoisted(() => ({
  settings: undefined as unknown as AppSettings,
  dataLocation: 'C:\\Users\\Test\\volley-scout',
  update: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@application/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: typeof settingsStoreState) => unknown) =>
    selector(settingsStoreState),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    settingsStoreState.settings = DEFAULT_APP_SETTINGS;
    vi.clearAllMocks();
  });

  it('shows the read-only data folder location', () => {
    render(<SettingsPage />);
    expect(screen.getByText('C:\\Users\\Test\\volley-scout')).toBeInTheDocument();
  });

  it('shows the installed version, so the operator can tell an update went through', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Versione')).toBeInTheDocument();
    expect(screen.getByText(version)).toBeInTheDocument();
  });

  it('saves the theme through the settings store when a radio option is chosen', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('radio', { name: 'Scuro' }));

    expect(settingsStoreState.update).toHaveBeenCalledWith({ theme: 'dark' });
  });
});
