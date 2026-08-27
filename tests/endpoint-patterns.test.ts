import { describe, expect, it } from 'vitest';

import {
  matchesEndpointPattern,
  normalizeEndpointPatterns,
} from '../src/config/endpoint-patterns.util';

describe('normalizeEndpointPatterns', () => {
  it('strips the stateful g and y flags while preserving the rest', () => {
    const [caseInsensitive] = normalizeEndpointPatterns([/^auth\/login$/giy]) as RegExp[];

    expect(caseInsensitive.flags).toBe('i');
    expect(caseInsensitive.source).toBe('^auth\\/login$');
  });

  it('returns flagless patterns and strings untouched', () => {
    const pattern = /^auth\/login$/;
    const patterns = normalizeEndpointPatterns([pattern, 'auth/logout']);

    expect(patterns[0]).toBe(pattern);
    expect(patterns[1]).toBe('auth/logout');
  });

  it('keeps a global pattern from matching on every other call', () => {
    const [pattern] = normalizeEndpointPatterns([/auth\/login/g]) as RegExp[];

    expect(pattern.test('auth/login')).toBe(true);
    expect(pattern.test('auth/login')).toBe(true);
  });
});

describe('matchesEndpointPattern', () => {
  it('compares string patterns for equality and tests regular expressions', () => {
    const patterns = ['auth/login', /^profiles\/[^/]+\/activate$/];

    expect(matchesEndpointPattern('auth/login', patterns)).toBe(true);
    expect(matchesEndpointPattern('profiles/12/activate', patterns)).toBe(true);
    expect(matchesEndpointPattern('auth/login/extra', patterns)).toBe(false);
    expect(matchesEndpointPattern('users/me', patterns)).toBe(false);
  });

  it('returns false for an empty pattern list', () => {
    expect(matchesEndpointPattern('auth/login', [])).toBe(false);
  });
});
