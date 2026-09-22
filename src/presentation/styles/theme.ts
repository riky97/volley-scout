import type { ThemeMode } from '@domain/entities/settings';

export type { ThemeMode };

/**
 * True when the OS/browser currently prefers a dark colour scheme.
 * Safe to call outside a browser environment (e.g. during SSR-less unit tests without jsdom
 * matchMedia); returns false when `window.matchMedia` is unavailable.
 */
export function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Applies a theme mode to the document by setting (or clearing) `data-theme` on `<html>`.
 * 'system' removes the attribute so `global.scss`'s `prefers-color-scheme` media query
 * takes over. Called at boot, before React mounts, to avoid a flash of the wrong theme,
 * and again whenever the operator changes the setting.
 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') {
    delete root.dataset.theme;
    return;
  }
  root.dataset.theme = mode;
}
