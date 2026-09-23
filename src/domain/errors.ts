export type DomainErrorCode =
  | 'NO_LIVE_SET'
  | 'SET_NOT_DECIDED'
  | 'SET_ALREADY_LIVE'
  | 'MATCH_CLOSED'
  | 'MATCH_ALREADY_WON'
  | 'INVALID_LINEUP'
  | 'INVALID_OUTCOME'
  | 'PLAYER_NOT_ON_COURT'
  | 'PLAYER_ALREADY_ON_COURT'
  | 'PLAYER_UNAVAILABLE'
  | 'PLAYER_NOT_IN_ROSTER'
  | 'EVENT_NOT_FOUND'
  | 'SETTINGS_LOCKED';

/** Domain failures carry a code; the Italian message is added by the presentation layer. */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
