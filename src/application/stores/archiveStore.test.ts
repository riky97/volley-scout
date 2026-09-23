import { beforeEach, describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { makeMatch } from '@test/factories';
import { useArchiveStore } from './archiveStore';
import { repository, useMatchStore } from './matchStore';

const OLDER = '2026-09-10T20:00:00.000+02:00';
const NEWER = '2026-09-12T20:00:00.000+02:00';

describe('archiveStore.importMatch', () => {
  const local = { ...makeMatch(), id: 'import-test', updatedAt: OLDER };

  beforeEach(async () => {
    await repository.deleteMatch(local.id);
    useMatchStore.setState({ match: null, saveState: 'idle' });
  });

  it('adds a match this device has never seen', async () => {
    await expect(useArchiveStore.getState().importMatch(local)).resolves.toBe('add');

    const saved = await repository.loadMatch(local.id);
    expect(saved.kind).toBe('ok');
  });

  it('keeps the local copy when the file is not newer', async () => {
    await repository.saveMatch(local);

    await expect(useArchiveStore.getState().importMatch(local)).resolves.toBe('unchanged');
  });

  it('replaces the loaded match when the file holds a newer copy', async () => {
    // Home resumes the last unfinished match, so the match being imported is often loaded.
    useMatchStore.getState().setMatch(local);
    await waitFor(() => {
      expect(useMatchStore.getState().saveState).toBe('idle');
    });
    const tabletCopy = { ...local, updatedAt: NEWER, info: { ...local.info, notes: 'dal tablet' } };

    await expect(useArchiveStore.getState().importMatch(tabletCopy)).resolves.toBe('update');

    expect(useMatchStore.getState().match?.info.notes).toBe('dal tablet');
  });

  it('writes nothing while the loaded match is still being saved', async () => {
    useMatchStore.getState().setMatch(local);
    await waitFor(() => {
      expect(useMatchStore.getState().saveState).toBe('idle');
    });
    useMatchStore.setState({ saveState: 'saving' });

    await expect(
      useArchiveStore.getState().importMatch({ ...local, updatedAt: NEWER }),
    ).resolves.toBe('busy');
    const saved = await repository.loadMatch(local.id);
    expect(saved.kind === 'ok' && saved.value.updatedAt).toBe(OLDER);
  });
});
