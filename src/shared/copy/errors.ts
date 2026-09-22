import type { DomainErrorCode } from '@domain/errors';
import { isDomainError } from '@domain/errors';

/**
 * One clear, recoverable Italian message per `DomainErrorCode` (docs/01-domain-model.md §6).
 * Domain code never contains Italian strings; the presentation layer maps codes here.
 */
export const DOMAIN_ERROR_MESSAGES: Record<DomainErrorCode, string> = {
  NO_LIVE_SET: 'Nessun set in corso.',
  SET_ALREADY_LIVE: "C'è già un set in corso.",
  MATCH_CLOSED: 'La partita è terminata: non è più possibile registrare azioni.',
  MATCH_ALREADY_WON: 'La partita è già stata vinta.',
  INVALID_LINEUP: 'Seleziona sei giocatori per iniziare.',
  INVALID_OUTCOME: 'Esito non previsto per questo fondamentale.',
  PLAYER_NOT_ON_COURT: 'Il giocatore selezionato non è in campo.',
  PLAYER_ALREADY_ON_COURT: 'Il giocatore selezionato è già in campo.',
  PLAYER_UNAVAILABLE: 'Il giocatore selezionato non è disponibile.',
  PLAYER_NOT_IN_ROSTER: 'Il giocatore non fa parte della rosa di questa partita.',
  EVENT_NOT_FOUND: "L'azione richiesta non è stata trovata.",
  SETTINGS_LOCKED: 'Formato bloccato a partita iniziata.',
};

const GENERIC_FALLBACK_MESSAGE = 'Si è verificato un errore imprevisto.';

/**
 * Resolves any thrown value to an Italian message: a known `DomainError` maps through
 * `DOMAIN_ERROR_MESSAGES`, anything else falls back to a generic message.
 */
export function messageForError(error: unknown): string {
  if (isDomainError(error)) {
    return DOMAIN_ERROR_MESSAGES[error.code];
  }
  return GENERIC_FALLBACK_MESSAGE;
}
