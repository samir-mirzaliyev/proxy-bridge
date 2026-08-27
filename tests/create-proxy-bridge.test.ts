import { describe, expect, it } from 'vitest';

import { createProxyBridge } from '../src/create-proxy-bridge';

function createBridge() {
  return createProxyBridge({
    appUrl: 'https://app.test',
    backendBaseUrl: 'https://backend.test/v1',
    tokens: {
      access: { cookie: { name: 'access_token' } },
      refresh: { cookie: { name: 'refresh_token' } },
    },
    endpoints: {
      refresh: 'auth/refresh',
      logout: 'auth/logout',
      issuesTokens: [],
    },
  });
}

describe('createProxyBridge', () => {
  it('creates route handlers and server fetch facade', () => {
    const bridge = createBridge();

    expect(bridge.handlers).toEqual({
      GET: expect.any(Function),
      POST: expect.any(Function),
      PUT: expect.any(Function),
      PATCH: expect.any(Function),
      DELETE: expect.any(Function),
    });
    expect(bridge.fetch).toEqual(expect.any(Function));
  });

  it('rejects a 0.x config instead of silently ignoring it', () => {
    const legacyConfig = {
      appUrl: 'https://app.test',
      backendBaseUrl: 'https://backend.test/v1',
      cookies: {
        access: { name: 'access_token' },
        refresh: { name: 'refresh_token' },
      },
      auth: {
        refreshEndpoint: 'auth/refresh',
        logoutEndpoint: 'auth/logout',
        tokenEndpointPatterns: ['auth/login'],
      },
    };

    expect(() => createProxyBridge(legacyConfig as never)).toThrow(/0\.x shape/);
    expect(() => createProxyBridge(legacyConfig as never)).toThrow(/tokens\.access\.cookie/);
  });
});
