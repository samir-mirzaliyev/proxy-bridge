import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { resolveRefreshTokenDelivery } from '../src/request/auth/resolve-refresh-token-delivery.util';

import type { RefreshTokenDelivery } from '../src/types';

function createConfig(send?: RefreshTokenDelivery<'auth/refresh'>[]) {
  return normalizeConfig({
    backendBaseUrl: 'https://backend.test',
    tokens: {
      access: { cookie: { name: 'access_token' } },
      refresh: { cookie: { name: 'refresh_token' }, send },
    },
    endpoints: {
      refresh: 'auth/refresh',
      logout: 'auth/logout',
      issuesTokens: [],
    },
  });
}

describe('resolveRefreshTokenDelivery', () => {
  it('resolves the implicit body delivery for the refresh endpoint', () => {
    expect(resolveRefreshTokenDelivery('auth/refresh', createConfig())).toEqual({
      to: 'auth/refresh',
      in: 'body',
      key: 'refreshToken',
    });
  });

  it('returns undefined for a path no row matches', () => {
    expect(resolveRefreshTokenDelivery('users/me', createConfig())).toBeUndefined();
  });

  it('returns the first matching row', () => {
    const config = createConfig([
      { to: /^profiles\//, in: 'header', name: 'X-First' },
      { to: 'profiles/generate-token', in: 'cookie' },
    ]);

    expect(resolveRefreshTokenDelivery('profiles/generate-token', config)).toMatchObject({
      in: 'header',
      name: 'X-First',
    });
  });

  it('matches string rows exactly', () => {
    const config = createConfig([{ to: 'profiles/generate-token', in: 'cookie' }]);

    expect(resolveRefreshTokenDelivery('profiles/generate-token', config)).toMatchObject({
      in: 'cookie',
      name: 'refresh_token',
    });
    expect(resolveRefreshTokenDelivery('profiles/generate-token/extra', config)).toBeUndefined();
  });
});
