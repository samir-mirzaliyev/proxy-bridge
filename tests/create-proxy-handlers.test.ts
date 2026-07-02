import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { createProxyHandlers } from '../src/create-proxy-handlers';

describe('createProxyHandlers', () => {
  it('creates route handlers for supported HTTP methods', () => {
    const handlers = createProxyHandlers(
      normalizeConfig({
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
