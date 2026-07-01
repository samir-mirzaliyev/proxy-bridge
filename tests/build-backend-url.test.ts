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
        cookies: {
          access: { name: 'access_token' },
          refresh: { name: 'refresh_token' },
        },
        auth: {
          refreshEndpoint: 'auth/refresh',
          logoutEndpoint: 'auth/logout',
          tokenEndpointPatterns: [],
        },
        buildBackendUrl: ({ backendPath }) => `https://gateway.test/internal/${backendPath}`,
      }),
    });

    expect(url.toString()).toBe('https://gateway.test/internal/users/me');
  });
});
