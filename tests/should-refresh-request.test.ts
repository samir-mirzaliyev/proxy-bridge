import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { shouldRefreshRequest } from '../src/request/auth/should-refresh-request';

const config = normalizeConfig({
  backendBaseUrl: 'https://backend.test',
  tokens: {
    access: { cookie: { name: 'access_token' } },
    refresh: { cookie: { name: 'refresh_token' } },
  },
  endpoints: {
    refresh: 'auth/refresh',
    logout: 'auth/logout',
    issuesTokens: [],
  },
  autoRefresh: {
    on: [401, 419],
  },
});

describe('shouldRefreshRequest', () => {
  it('matches configured refresh status codes', () => {
    expect(
      shouldRefreshRequest({
        response: new Response(null, { status: 419 }),
        backendPath: 'users/me',
        config,
      }),
    ).toBe(true);
  });

  it('does not refresh the refresh endpoint itself', () => {
    expect(
      shouldRefreshRequest({
        response: new Response(null, { status: 401 }),
        backendPath: 'auth/refresh',
        config,
      }),
    ).toBe(false);
  });
});
