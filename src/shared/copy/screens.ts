/**
 * Per-screen Italian copy: titles, labels, empty/loading states, dialogs, toasts and
 * validation messages. Source: docs/03-ux-flows.md §2 (screen inventory), §3 (wireframes)
 * and §9 (copy sheet, normative). Where §9 is silent, natural formal-neutral Italian was
 * written in the same style — those additions are called out in the handoff notes.
 */

export const NAV = {
  home: 'Home',
  newMatch: 'Nuova partita',
  archive: 'Archivio partite',
  settings: 'Impostazioni',
} as const;

export const STEPS = {
  label: (n: number) => `Passo ${n} di 3`,
  names: ['Dati partita', 'Rosa', 'Sestetto'] as const,
} as const;

// ---------------------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------------------

export const HOME = {
  title: 'Volley Scout',
  subtitle: 'Raccolta dati partita, offline.',
  resumeCard: {
    title: 'Partita in corso',
    // {our}/{their} team names, {date}, {setIndex}, {score} are runtime substitutions.
    subtitle: '{our} – {their} · {date} · Set {setIndex} · {score}',
    resumeButton: 'Riprendi partita',
  },
  newMatchCard: {
    title: 'Nuova partita',
    body: 'Configura squadre, rosa e sestetto.',
    button: 'Nuova partita',
  },
  rosterCard: {
    title: 'Gestione rose',
    body: (n: number) => (n === 1 ? '1 rosa salvata' : `${String(n)} rose salvate`),
    button: 'Gestisci rose',
  },
  archiveCard: {
    title: 'Archivio partite',
    body: (n: number) => `${n} partite salvate`,
    button: 'Apri archivio',
  },
  settingsCard: {
    title: 'Impostazioni',
    body: 'Tema, formato e preferenze.',
    button: 'Apri impostazioni',
  },
  emptyState: {
    title: 'Nessuna partita registrata',
    body: 'Crea la prima partita per iniziare a raccogliere i dati.',
    button: 'Nuova partita',
  },
  loading: 'Caricamento dati…',
  error: {
    title: 'Impossibile leggere i dati salvati.',
    retry: 'Riprova',
  },
} as const;

// ---------------------------------------------------------------------------------------
// Nuova partita
// ---------------------------------------------------------------------------------------

export const NEW_MATCH = {
  title: 'Nuova partita',
  matchDataTitle: 'Dati partita',
  startTitle: 'Inizio',
  homeTeam: 'Squadra di casa',
  awayTeam: 'Squadra ospite',
  date: 'Data',
  time: 'Ora',
  competition: 'Competizione',
  venue: 'Luogo',
  ourSide: 'La nostra squadra è:',
  sideHome: 'Casa',
  sideAway: 'Ospite',
  format: 'Formato',
  bestOf5: 'Al meglio dei 5',
  bestOf3: 'Al meglio dei 3',
  pointsPerSet: 'Punti per set',
  tieBreakPoints: 'Punti al tie-break',
  winByTwo: 'Vittoria con due punti di scarto',
  firstServe: 'Primo servizio',
  serveUs: 'Nostro',
  serveThem: 'Avversario',
  ourCourt: 'Nostro campo',
  left: 'Sinistra',
  right: 'Destra',
  notes: 'Note',
} as const;

// ---------------------------------------------------------------------------------------
// Gestione roster
// ---------------------------------------------------------------------------------------

export const ROSTER = {
  title: 'Rosa',
  players: (n: number) => `Giocatori (${n})`,
  addPlayer: 'Aggiungi giocatore',
  newPlayer: 'Nuovo giocatore',
  savePlayer: 'Salva giocatore',
  shirtNumber: 'Numero',
  fullName: 'Nome e cognome',
  role: 'Ruolo',
  isLibero: 'Libero',
  isAvailable: 'Disponibile',
  template: 'Modello roster',
  loadTemplate: 'Carica modello',
  saveTemplate: 'Salva modello',
  deleteTemplate: 'Elimina modello',
  columns: {
    number: 'N.',
    name: 'Nome',
    role: 'Ruolo',
    libero: 'Libero',
    available: 'Disponibile',
  },
  emptyState: {
    title: 'Nessun giocatore in rosa',
    body: 'Aggiungi i giocatori uno a uno oppure carica un modello salvato.',
    primaryButton: 'Aggiungi giocatore',
    secondaryButton: 'Carica modello',
  },
  loadingTemplates: 'Caricamento modelli…',
  error: {
    duplicateShirtNumber: 'Numero di maglia già assegnato.',
    templateSaveFailed: 'Impossibile salvare il modello.',
  },
} as const;

export const ROSTER_MANAGER = {
  title: 'Gestione rose',
  subtitle: 'Prepara la rosa una volta sola e richiamala quando crei una partita.',
  newRoster: 'Nuova rosa',
  rosterName: 'Nome della rosa',
  rosterNamePlaceholder: 'Es. Prima squadra 2026',
  teamName: 'Nome della squadra',
  playersCount: (n: number) => (n === 1 ? '1 giocatore' : `${String(n)} giocatori`),
  updatedAt: (date: string) => `Aggiornata il ${date}`,
  edit: 'Modifica',
  save: 'Salva rosa',
  saved: 'Rosa salvata.',
  deleted: 'Rosa eliminata.',
  editTitle: 'Modifica rosa',
  createTitle: 'Nuova rosa',
  emptyState: {
    title: 'Nessuna rosa salvata',
    body: 'Crea una rosa per riusarla in ogni partita senza reinserire i giocatori.',
    button: 'Nuova rosa',
  },
  error: {
    nameRequired: 'Dai un nome alla rosa.',
    noPlayers: 'Aggiungi almeno un giocatore.',
    duplicateShirtNumber: 'Ci sono numeri di maglia ripetuti.',
  },
  confirmDelete: {
    title: 'Eliminare la rosa?',
    body: (name: string) => `"${name}" verrà eliminata definitivamente. Le partite già registrate non cambiano.`,
    confirm: 'Elimina',
  },
} as const;

// ---------------------------------------------------------------------------------------
// Configurazione sestetto
// ---------------------------------------------------------------------------------------

export const LINEUP = {
  title: (setIndex: number) => `Sestetto iniziale — Set ${setIndex}`,
  court: 'Campo (vista dalla panchina)',
  available: 'Giocatori disponibili',
  emptySlot: 'Posizione libera',
  position: (n: number) => `Posizione ${n}`,
  hint: 'Tocca un giocatore, poi una posizione libera.',
  clear: 'Svuota sestetto',
  startMatch: 'Inizia partita',
  startSet: (n: number) => `Inizia set ${n}`,
  editLineup: 'Modifica sestetto',
  firstServe: (side: 'Nostro' | 'Avversario') => `Primo servizio: ${side}`,
  emptyBench: 'Nessun giocatore disponibile',
  error: {
    incomplete: 'Seleziona sei giocatori per iniziare.',
  },
} as const;

// ---------------------------------------------------------------------------------------
// Scout live
// ---------------------------------------------------------------------------------------

export const LIVE = {
  title: 'Scout live',
  setInProgress: (n: number) => `Set ${n} · in corso`,
  setsWon: (n: number) => `Set vinti: ${n}`,
  serving: 'Al servizio',
  court: (rotation: number) => `Campo — rotazione ${rotation}`,
  action: 'Azione',
  step1: '1 · Giocatore',
  step2: '2 · Fondamentale',
  step3: '3 · Esito',
  cancelSelection: 'Annulla selezione',
  numberBuffer: (digits: string) => `Numero: ${digits}`,
  recentEvents: 'Ultime azioni',
  allEvents: 'Tutte',
  noEvents: 'Nessuna azione registrata.',
  padHint: "Seleziona un giocatore, poi il fondamentale, poi l'esito.",
  undo: 'Annulla azione',
  redo: 'Ripristina azione',
  nothingToUndo: 'Niente da annullare',
  expressOurPoint: 'Punto nostro',
  expressTheirPoint: 'Punto avversario',
  expressOurError: 'Errore nostro',
  timeout: 'Time-out',
  timeoutUs: 'Nostro',
  timeoutThem: 'Avversario',
  timeoutsCount: (us: number, them: number) => `Time-out  N ${us} · A ${them}`,
  substitution: 'Cambio',
  substitutionsCount: (us: number) => `Cambi  N ${us}`,
  endSet: 'Termina set',
  endMatch: 'Termina partita',
  abandonMatch: 'Termina partita',
  stats: 'Statistiche',
  restoring: 'Ripristino della partita…',
  saveFailedBanner: 'Salvataggio non riuscito. I dati restano in memoria.',
  retrySave: 'Riprova salvataggio',
  outcomeNotAllowedTooltip: 'Esito non previsto per questo fondamentale.',
  substitutionOut: 'Esce',
  substitutionIn: 'Entra',
  substitutionTitle: 'Cambio giocatore',
} as const;

// ---------------------------------------------------------------------------------------
// Statistiche live
// ---------------------------------------------------------------------------------------

export const STATS = {
  title: 'Statistiche live',
  team: 'Squadra',
  players: 'Giocatori',
  totalMatch: 'Totale partita',
  set: (n: number) => `Set ${n}`,
  pointsScored: 'Punti fatti',
  ourErrors: 'Errori nostri',
  opponentPoints: 'Punti avversario',
  attackEfficiency: 'Efficienza attacco',
  receptionPositivity: 'Positività ricezione',
  sortBy: 'Ordina per',
  emptyState: 'Nessun dato disponibile per questo set.',
  error: 'Impossibile calcolare le statistiche.',
  columns: {
    number: 'N.',
    player: 'Giocatore',
    role: 'Ruolo',
    points: 'Punti',
    attack: 'Att.',
    block: 'Muri',
    ace: 'Ace',
    errors: 'Err.',
    receptionPositive: 'Ric. pos.',
    duration: 'Durata',
  },
} as const;

// ---------------------------------------------------------------------------------------
// Riepilogo finale
// ---------------------------------------------------------------------------------------

export const SUMMARY = {
  title: 'Riepilogo partita',
  result: (our: string, a: number, b: number, their: string) => `${our} ${a} – ${b} ${their}`,
  setsTable: 'Set',
  us: 'Noi',
  them: 'Loro',
  playerStats: (scope: string) => `Statistiche giocatori — ${scope}`,
  trend: 'Andamento per set',
  noEventsInSet: 'Nessuna azione registrata in questo set.',
  loading: 'Caricamento partita…',
  error: {
    loadFailed: 'Impossibile aprire la partita.',
    backToArchive: "Torna all'archivio",
  },
  exportPdf: 'Esporta PDF',
  exportXlsx: 'Esporta XLSX',
  exportJson: 'Esporta JSON',
  exportRunning: 'Esportazione in corso…',
  exportFailed: 'Esportazione non riuscita.',
} as const;

// ---------------------------------------------------------------------------------------
// Archivio partite
// ---------------------------------------------------------------------------------------

export const ARCHIVE = {
  title: 'Archivio partite',
  importJson: 'Importa JSON',
  search: 'Cerca',
  season: 'Stagione',
  result: 'Esito',
  all: 'Tutti',
  count: (n: number) => (n === 1 ? '1 partita' : `${n} partite`),
  columns: {
    date: 'Data',
    match: 'Partita',
    score: 'Risultato',
    status: 'Stato',
  },
  status: {
    finished: 'Terminata',
    live: 'In corso',
    setup: 'Da configurare',
    abandoned: 'Interrotta',
    corrupt: 'File danneggiato',
  },
  restore: 'Ripristina',
  emptyState: {
    title: 'Archivio vuoto',
    body: 'Le partite terminate compaiono qui.',
    button: 'Nuova partita',
  },
  filteredEmptyState: 'Nessun risultato per questa ricerca.',
  loading: 'Caricamento archivio…',
  error: {
    readFailed: "Impossibile leggere l'archivio.",
    importFailed: 'File non valido. Importazione annullata.',
  },
} as const;

// ---------------------------------------------------------------------------------------
// Impostazioni
// ---------------------------------------------------------------------------------------

export const SETTINGS = {
  title: 'Impostazioni',
  appearance: 'Aspetto',
  theme: 'Tema',
  themeLight: 'Chiaro',
  themeDark: 'Scuro',
  themeSystem: 'Come il sistema',
  defaults: 'Valori predefiniti',
  ourTeamName: 'Nome della nostra squadra',
  dataCollection: 'Raccolta dati',
  trackSets: 'Registra le alzate',
  confirmEndMatch: 'Chiedi conferma prima di terminare la partita',
  confirmUndo: "Chiedi conferma prima di annullare un'azione",
  shortcutsEnabled: 'Scorciatoie da tastiera attive',
  data: 'Dati',
  dataFolder: 'Cartella dati',
  openFolder: 'Apri cartella',
  manageTemplates: 'Gestisci modelli roster',
  shortcuts: 'Scorciatoie da tastiera',
  showShortcuts: 'Mostra',
  formatLockedHint: 'Formato bloccato a partita iniziata.',
  saveFailed: 'Impossibile salvare le impostazioni.',
} as const;

// ---------------------------------------------------------------------------------------
// Dialogs (shared across screens)
// ---------------------------------------------------------------------------------------

export const DIALOGS = {
  resumeConflict: {
    title: 'Partita in corso',
    body: "Esiste già una partita non terminata. Creandone una nuova, quella in corso resterà nell'archivio come non terminata.",
    cancel: 'Annulla',
    confirm: 'Crea comunque',
  },
  setEnd: {
    title: (n: number) => `Set ${n} terminato`,
    body: (our: string, a: number, b: number, their: string, x: number, y: number) =>
      `${our} ${a} – ${b} ${their}. Set vinti: ${x} – ${y}. Il prossimo set inizia con il sestetto attuale.`,
    editLineup: 'Modifica sestetto',
    startNextSet: (n: number) => `Inizia set ${n}`,
  },
  matchEnd: {
    title: 'Fine partita',
    body: (our: string, x: number, y: number, their: string) =>
      `${our} ${x} – ${y} ${their}. La partita è terminata.`,
    stayHere: 'Resta qui',
    goToSummary: 'Vai al riepilogo',
  },
  confirmEndMatch: {
    title: 'Terminare la partita?',
    body: (our: string, x: number, y: number, their: string) =>
      `${our} ${x} – ${y} ${their}. Dopo la conferma non sarà più possibile registrare azioni.`,
    cancel: 'Annulla',
    confirm: 'Termina partita',
  },
  confirmUndo: {
    title: "Annullare l'ultima azione?",
    body: (eventDescription: string) => `Verrà rimossa: ${eventDescription}.`,
    cancel: 'Annulla',
    confirm: 'Annulla azione',
  },
  confirmDeleteEvent: {
    title: "Eliminare l'azione?",
    body: "L'azione verrà rimossa e punteggio e rotazione saranno ricalcolati.",
    cancel: 'Annulla',
    confirm: 'Elimina',
  },
  confirmDeletePlayer: {
    title: 'Eliminare il giocatore?',
    body: (shirt: number, name: string) => `${shirt} ${name} verrà rimosso dalla rosa di questa partita.`,
    cancel: 'Annulla',
    confirm: 'Elimina',
  },
  confirmDeleteMatch: {
    title: 'Eliminare la partita?',
    body: (our: string, their: string, date: string) =>
      `${our} – ${their} del ${date} verrà eliminata definitivamente. L'operazione non può essere annullata.`,
    cancel: 'Annulla',
    confirm: 'Elimina',
  },
  confirmDeleteTemplate: {
    title: 'Eliminare il modello?',
    body: (name: string) => `Il modello «${name}» verrà eliminato definitivamente.`,
    cancel: 'Annulla',
    confirm: 'Elimina',
  },
  confirmQuit: {
    title: 'Chiudere Volley Scout?',
    body: 'La partita in corso resta salvata e potrai riprenderla alla prossima apertura.',
    bodyUnsaved:
      'Ci sono modifiche non ancora salvate: verranno salvate prima della chiusura.',
    bodyFailed:
      'Chiusura non riuscita. Chiudi la finestra dal Task Manager oppure riprova; la partita resta salvata.',
    cancel: 'Annulla',
    confirm: 'Sì, chiudi',
  },
  confirmAbandon: {
    title: 'Terminare la partita?',
    body:
      "La partita verrà chiusa subito, con il punteggio attuale, e segnata come interrotta. Potrai rivederla o eliminarla dall'archivio.",
    cancel: 'Annulla',
    confirm: 'Sì, termina',
  },
  unsavedOnClose: {
    title: "Chiudere l'applicazione?",
    body: 'Sono presenti modifiche non ancora salvate. Chiudendo ora potrebbero andare perse.',
    cancel: 'Annulla',
    confirm: 'Chiudi comunque',
  },
  recovery: {
    title: 'Ripristino dati',
    body: 'Il file di una partita non è leggibile. È stato messo da parte per sicurezza. È possibile continuare senza quella partita.',
    continue: 'Continua',
    openFolder: 'Apri cartella dati',
  },
  substitution: {
    title: 'Cambio giocatore',
    body: 'Seleziona il giocatore che esce e quello che entra.',
    cancel: 'Annulla',
    confirm: 'Conferma cambio',
  },
  timeout: {
    title: 'Time-out',
    body: 'Di quale squadra è il time-out?',
    us: 'Nostro',
    them: 'Avversario',
  },
  shortcuts: {
    title: 'Scorciatoie da tastiera',
    close: 'Chiudi',
  },
} as const;

// ---------------------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------------------

export const TOASTS = {
  matchSaved: 'Partita salvata.',
  settingsSaved: 'Impostazioni salvate.',
  templateSaved: 'Modello salvato.',
  playerAdded: 'Giocatore aggiunto.',
  eventUndone: 'Azione annullata.',
  eventUndoneAction: 'Ripristina',
  eventDeleted: 'Azione eliminata.',
  eventDeletedAction: 'Ripristina',
  exportDone: 'File esportato.',
  exportDoneAction: 'Apri cartella',
  importDone: 'Partita importata.',
  timeoutLimit: 'Time-out già esauriti per questo set.',
  substitutionLimit: 'Limite di cambi raggiunto per questo set.',
  noSetRunning: 'Nessun set in corso.',
  matchFinished: 'La partita è terminata.',
  nothingToUndo: 'Nessuna azione da annullare.',
  saveFailed: 'Salvataggio non riuscito. I dati restano in memoria.',
  saveFailedAction: 'Riprova',
  exportFailed: 'Esportazione non riuscita.',
  exportFailedAction: 'Riprova',
  importFailed: 'File non valido. Importazione annullata.',
  templateSaveFailed: 'Impossibile salvare il modello.',
  templateSaveFailedAction: 'Riprova',
  settingsSaveFailed: 'Impossibile salvare le impostazioni.',
} as const;

// ---------------------------------------------------------------------------------------
// Validation and error messages
// ---------------------------------------------------------------------------------------

export const VALIDATION = {
  required: 'Campo obbligatorio.',
  teamNameRequired: 'Inserisci il nome della squadra.',
  teamNamesEqual: 'Le due squadre devono avere nomi diversi.',
  dateRequired: 'Inserisci la data della partita.',
  dateInvalid: 'Data non valida.',
  playerNameRequired: 'Inserisci nome e cognome.',
  shirtRequired: 'Inserisci il numero di maglia.',
  shirtRange: 'Il numero di maglia deve essere compreso tra 1 e 99.',
  shirtDuplicate: 'Numero di maglia già assegnato.',
  rosterTooSmall: 'Servono almeno sei giocatori per iniziare.',
  lineupIncomplete: 'Seleziona sei giocatori per iniziare.',
  pointsRange: 'I punti per set devono essere compresi tra 15 e 30.',
  templateNameRequired: 'Assegna un nome al modello.',
  templateNameDuplicate: 'Esiste già un modello con questo nome.',
  outcomeNotAvailable: 'Esito non previsto per questo fondamentale.',
  outcomeNotAvailableFor: (skill: string) => `Esito non disponibile per ${skill}.`,
  playerNotFound: (shirtNumber: number) => `Nessun giocatore con il numero ${shirtNumber}.`,
  readStorage: 'Impossibile leggere i dati salvati.',
  readArchive: "Impossibile leggere l'archivio.",
  openMatch: 'Impossibile aprire la partita.',
  computeStats: 'Impossibile calcolare le statistiche.',
  unexpected: 'Si è verificato un errore imprevisto.',
  unexpectedBody: "L'applicazione può continuare. Se il problema si ripete, riavvia il programma.",
} as const;

// ---------------------------------------------------------------------------------------
// Empty and loading states (screen-agnostic reuse)
// ---------------------------------------------------------------------------------------

export const EMPTY_STATES = {
  noMatches: {
    title: 'Nessuna partita registrata',
    body: 'Crea la prima partita per iniziare a raccogliere i dati.',
  },
  archive: {
    title: 'Archivio vuoto',
    body: 'Le partite terminate compaiono qui.',
  },
  filtered: 'Nessun risultato per questa ricerca.',
  roster: {
    title: 'Nessun giocatore in rosa',
    body: 'Aggiungi i giocatori uno a uno oppure carica un modello salvato.',
  },
  bench: 'Nessun giocatore disponibile',
} as const;

export const LOADING_STATES = {
  data: 'Caricamento dati…',
  match: 'Caricamento partita…',
  restoring: 'Ripristino della partita…',
  exporting: 'Esportazione in corso…',
} as const;
