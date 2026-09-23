import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as WebAppModule from './webApp';

type WebApp = typeof WebAppModule;

/** Minimal stand-ins: only what `watchForUpdates` and `applyUpdate` touch. */
class FakeWorker extends EventTarget {
  state = 'installing';
  readonly postMessage = vi.fn();
  install(): void {
    this.state = 'installed';
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  readonly update = vi.fn(() => Promise.resolve());
  startInstall(): FakeWorker {
    const worker = new FakeWorker();
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
    return worker;
  }
}

const container = new EventTarget() as EventTarget & { controller: object | null };

function setController(controller: object | null): void {
  container.controller = controller;
}

async function loadWebApp(): Promise<WebApp> {
  vi.resetModules();
  return await import('./webApp');
}

function watch(webApp: WebApp, registration: FakeRegistration): void {
  webApp.watchForUpdates(registration as unknown as ServiceWorkerRegistration);
}

beforeEach(() => {
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
  setController({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('web app updates', () => {
  it('announces a new build once it has finished installing', async () => {
    const webApp = await loadWebApp();
    const registration = new FakeRegistration();
    const listener = vi.fn();
    webApp.subscribeToUpdate(listener);
    watch(webApp, registration);

    const worker = registration.startInstall();
    expect(webApp.isUpdateReady()).toBe(false);

    worker.install();
    expect(webApp.isUpdateReady()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('picks up a build that was already waiting when the app opened', async () => {
    const webApp = await loadWebApp();
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    watch(webApp, registration);

    expect(webApp.isUpdateReady()).toBe(true);
  });

  it('does not call a first install an update', async () => {
    setController(null);
    const webApp = await loadWebApp();
    const registration = new FakeRegistration();
    watch(webApp, registration);

    registration.startInstall().install();
    expect(webApp.isUpdateReady()).toBe(false);
  });

  it('looks for a new build when the app comes back to the foreground', async () => {
    const webApp = await loadWebApp();
    const registration = new FakeRegistration();
    watch(webApp, registration);

    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalled();
  });

  it('asks the waiting build to take over only when told to', async () => {
    const webApp = await loadWebApp();
    const registration = new FakeRegistration();
    watch(webApp, registration);
    const worker = registration.startInstall();
    worker.install();

    expect(worker.postMessage).not.toHaveBeenCalled();
    webApp.applyUpdate();
    expect(worker.postMessage).toHaveBeenCalledWith('SKIP_WAITING');
  });
});
