/**
 * Generic, screen-agnostic Italian copy: app identity, buttons reused everywhere,
 * generic states. Screen-specific copy lives in `screens.ts`.
 */

export const APP_NAME = 'Volley Scout';
export const APP_TAGLINE = 'Raccolta dati partita, offline.';

/** Placeholder for a ratio whose denominator is zero (see docs/02-statistics.md §1 G7). */
export const NOT_AVAILABLE = 'N/D';

export const COMMON_BUTTONS = {
  save: 'Salva',
  cancel: 'Annulla',
  back: 'Indietro',
  next: 'Avanti',
  close: 'Chiudi',
  delete: 'Elimina',
  edit: 'Modifica',
  confirm: 'Conferma',
  retry: 'Riprova',
  add: 'Aggiungi',
  open: 'Apri',
  clearFilters: 'Azzera filtri',
  backToHome: 'Torna alla home',
  backToArchive: "Torna all'archivio",
} as const;

export const COMMON_STATES = {
  loading: 'Caricamento…',
  empty: 'Nessun dato disponibile.',
  unexpectedError: 'Si è verificato un errore imprevisto.',
  unexpectedErrorBody:
    "L'applicazione può continuare. Se il problema si ripete, riavvia il programma.",
} as const;
