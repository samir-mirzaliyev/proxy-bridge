import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { resolveSanitizedPayload } from '../src/response/sanitize/resolve-sanitized-payload';

function createConfig(sanitizeTokenResponse?: boolean | 'auth-endpoints' | 'all-json') {
  return normalizeConfig({
    backendBaseUrl: 'https://backend.test',
    cookies: {
      access: { name: 'access_token' },
      refresh: { name: 'refresh_token' },
    },
    auth: {
      refreshEndpoint: 'auth/refresh',
      logoutEndpoint: 'auth/logout',
      tokenEndpointPatterns: [/^auth\/login$/],
    },
    sanitizeTokenResponse,
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
