import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { createProxyHandlers } from '../src/create-proxy-handlers';

describe('createProxyHandlers', () => {
  it('creates route handlers for supported HTTP methods', () => {
    const handlers = createProxyHandlers(
      normalizeConfig({
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
      }),
    );

    expect(handlers).toEqual({
      GET: expect.any(Function),
      POST: expect.any(Function),
      PUT: expect.any(Function),
      PATCH: expect.any(Function),
      DELETE: expect.any(Function),
    });
  });
});
