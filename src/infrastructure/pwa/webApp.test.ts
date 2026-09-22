import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage } from './webApp';

interface StorageManagerStub {
  persist: () => Promise<boolean>;
  persisted: () => Promise<boolean>;
}

function stubStorage(stub: StorageManagerStub | undefined): void {
  Object.defineProperty(navigator, 'storage', {
    value: stub,
    configurable: true,
  });
}

afterEach(() => {
  stubStorage(undefined);
  vi.restoreAllMocks();
});

describe('requestPersistentStorage', () => {
  it('asks the browser to keep the data when it is not persisted yet', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    stubStorage({ persist, persisted: () => Promise.resolve(false) });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does not ask again once the browser already persists the data', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    stubStorage({ persist, persisted: () => Promise.resolve(true) });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('reports a refusal instead of claiming the data is safe', async () => {
    stubStorage({ persist: () => Promise.resolve(false), persisted: () => Promise.resolve(false) });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('survives a browser without the storage API', async () => {
    stubStorage(undefined);

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('survives a browser that throws instead of answering', async () => {
    stubStorage({
      persist: () => Promise.reject(new Error('denied')),
      persisted: () => Promise.resolve(false),
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});
