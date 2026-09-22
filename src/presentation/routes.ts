/** Every route path in one place, so links never drift from the router. */
export const ROUTES = {
  home: '/',
  newMatch: '/partita/nuova',
  roster: '/partita/rosa',
  lineup: '/partita/sestetto',
  live: '/partita/live',
  stats: '/partita/statistiche',
  summary: '/partita/riepilogo',
  archive: '/archivio',
  settings: '/impostazioni',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
