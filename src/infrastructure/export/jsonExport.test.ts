import { describe, expect, it } from 'vitest';
import { makeMatch, playPoints, startedMatch } from '@test/factories';
import { buildJsonExport, importMatchJson } from './jsonExport';

describe('jsonExport', () => {
  it('round-trips a match: export then import returns an equal match', () => {
    const match = playPoints(startedMatch({ match: makeMatch() }), 'us', 3);
    const bytes = buildJsonExport(match);
    const text = new TextDecoder().decode(bytes);

    const result = importMatchJson(text);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.match).toEqual(match);
    }
  });

  it('returns a failure result instead of throwing on malformed JSON text', () => {
    const result = importMatchJson('{ this is not valid json');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_JSON');
    }
  });

  it('returns a failure result instead of throwing on well-formed JSON that fails the schema', () => {
    const result = importMatchJson(JSON.stringify({ hello: 'world' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_DATA');
    }
  });

  it('does not throw on arbitrary garbage input', () => {
    expect(() => importMatchJson('null')).not.toThrow();
    expect(() => importMatchJson('42')).not.toThrow();
    expect(() => importMatchJson('')).not.toThrow();
  });
});
