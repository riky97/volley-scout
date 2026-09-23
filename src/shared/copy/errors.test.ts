import { describe, expect, it } from 'vitest';
import { DomainError } from '@domain/errors';
import { DOMAIN_ERROR_MESSAGES, messageForError, messageForErrorCode } from './errors';

describe('domain error messages', () => {
  it('gives every code a message of its own', () => {
    const messages = Object.values(DOMAIN_ERROR_MESSAGES);
    expect(new Set(messages).size).toBe(messages.length);
    expect(messages.every((message) => message.length > 0)).toBe(true);
  });

  it('resolves a thrown DomainError', () => {
    expect(messageForError(new DomainError('SET_NOT_DECIDED'))).toBe(
      DOMAIN_ERROR_MESSAGES.SET_NOT_DECIDED,
    );
  });

  it('falls back for anything that is not a domain error', () => {
    expect(messageForError(new Error('boom'))).toBe('Si è verificato un errore imprevisto.');
  });

  it('resolves a bare code, which the stores keep instead of the exception', () => {
    // Passing the code to messageForError silently yielded the generic fallback, so every
    // domain error on the live screen read "errore imprevisto".
    expect(messageForErrorCode('SET_NOT_DECIDED')).toBe(DOMAIN_ERROR_MESSAGES.SET_NOT_DECIDED);
    expect(messageForError('SET_NOT_DECIDED')).toBe('Si è verificato un errore imprevisto.');
  });
});
