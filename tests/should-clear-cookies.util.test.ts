import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { shouldClearCookies } from '../src/request/auth/should-clear-cookies.util';

const config = normalizeConfig({
  backendBaseUrl: 'https://backend.test',
  cookies: {
    access: { name: 'access_token' },
    refresh: { name: 'refresh_token' },
  },
  auth: {
    refreshEndpoint: 'auth/refresh',
    logoutEndpoint: 'auth/logout',
    tokenEndpointPatterns: [],
  },
});

describe('shouldClearCookies', () => {
  it('always clears on the logout endpoint', () => {
    expect(shouldClearCookies({ backendPath: 'auth/logout', config })).toBe(true);
  });

  it('does not clear when no refresh was attempted (unauthenticated request)', () => {
    expect(
      shouldClearCookies({ backendPath: 'users/me', refreshResult: { attempted: false }, config }),
    ).toBe(false);
    // Also covers the concurrent case: a request that never had a refresh token cannot clear.
    expect(shouldClearCookies({ backendPath: 'users/me', refreshResult: undefined, config })).toBe(
      false,
    );
  });

  it('clears when a refresh was attempted but yielded no tokens (dead session)', () => {
    expect(
      shouldClearCookies({ backendPath: 'users/me', refreshResult: { attempted: true }, config }),
    ).toBe(true);
  });

  it('does not clear when a refresh succeeded', () => {
    expect(
      shouldClearCookies({
        backendPath: 'users/me',
        refreshResult: { attempted: true, tokens: { accessToken: 'new-access-token' } },
        config,
      }),
    ).toBe(false);
  });
});
