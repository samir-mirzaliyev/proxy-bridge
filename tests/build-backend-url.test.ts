import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { buildBackendUrl } from '../src/request/backend/build-backend-url.util';

describe('buildBackendUrl', () => {
  it('builds the default backend URL with api version and query params', () => {
    const request = new Request('https://app.test/api/users/me?tab=profile') as Request & {
      nextUrl: URL;
    };
    request.nextUrl = new URL(request.url);

    const url = buildBackendUrl({
      request,
      backendPath: 'users/me',
      config: normalizeConfig({
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
      }),
    });

    expect(url.toString()).toBe('https://backend.test/v1/users/me?tab=profile');
  });

  it('uses a custom backend URL builder when configured', () => {
    const request = new Request('https://app.test/api/users/me?tab=profile') as Request & {
      nextUrl: URL;
    };
    request.nextUrl = new URL(request.url);

    const url = buildBackendUrl({
      request,
      backendPath: 'users/me',
      config: normalizeConfig({
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
        buildBackendUrl: ({ backendPath }) => `https://gateway.test/internal/${backendPath}`,
      }),
    });

    expect(url.toString()).toBe('https://gateway.test/internal/users/me');
  });
});
