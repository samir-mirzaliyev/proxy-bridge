import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { resolveSanitizedPayload } from '../src/response/sanitize/resolve-sanitized-payload';

import type { SanitizeTokensMode } from '../src/types';

function createConfig(sanitizeTokenResponse?: SanitizeTokensMode) {
  return normalizeConfig({
    backendBaseUrl: 'https://backend.test',
    tokens: {
      access: { cookie: { name: 'access_token' } },
      refresh: { cookie: { name: 'refresh_token' } },
    },
    endpoints: {
      refresh: 'auth/refresh',
      logout: 'auth/logout',
      issuesTokens: [/^auth\/login$/],
    },
    response: { sanitizeTokens: sanitizeTokenResponse },
  });
}

describe('resolveSanitizedPayload', () => {
  it('sanitizes token fields only on auth endpoints by default', () => {
    const payload = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      name: 'Samir',
    };

    expect(
      resolveSanitizedPayload({
        payload,
        backendPath: 'auth/login',
        config: createConfig(),
      }),
    ).toEqual({ name: 'Samir' });

    expect(
      resolveSanitizedPayload({
        payload,
        backendPath: 'users/me',
        config: createConfig(),
      }),
    ).toEqual(payload);
  });

  it('can sanitize every JSON response', () => {
    expect(
      resolveSanitizedPayload({
        payload: { accessToken: 'access-token', name: 'Samir' },
        backendPath: 'users/me',
        config: createConfig('all-json'),
      }),
    ).toEqual({ name: 'Samir' });
  });

  it('can disable token sanitization', () => {
    const payload = { accessToken: 'access-token' };

    expect(
      resolveSanitizedPayload({
        payload,
        backendPath: 'auth/login',
        config: createConfig(false),
      }),
    ).toEqual(payload);
  });
});
