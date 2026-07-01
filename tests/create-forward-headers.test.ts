import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { createForwardHeaders } from '../src/request/headers/create-forward-headers';

describe('createForwardHeaders', () => {
  it('overrides existing request headers with overrideHeaders', () => {
    const request = new Request('https://example.com/api', {
      headers: {
        'Accept-Language': 'en',
      },
    }) as Request & { nextUrl: URL };

    request.nextUrl = new URL(request.url);

    const headers = createForwardHeaders({
      request,
      backendPath: 'users/me',
      config: normalizeConfig({
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
        overrideHeaders: {
          'Accept-Language': 'az',
        },
      }),
    });

    expect(headers.get('Accept-Language')).toBe('az');
  });

  it('uses Bearer authorization by default when an access token is provided', () => {
    const request = new Request('https://example.com/api') as Request & { nextUrl: URL };
    request.nextUrl = new URL(request.url);

    const headers = createForwardHeaders({
      request,
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: normalizeConfig({
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
    });

    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('uses custom auth headers when authHeader is configured', () => {
    const request = new Request('https://example.com/api') as Request & { nextUrl: URL };
    request.nextUrl = new URL(request.url);

    const headers = createForwardHeaders({
      request,
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: normalizeConfig({
        backendBaseUrl: 'https://backend.test',
        cookies: {
          access: { name: 'access_token' },
          refresh: { name: 'refresh_token' },
        },
        auth: {
          refreshEndpoint: 'auth/refresh',
          logoutEndpoint: 'auth/logout',
          tokenEndpointPatterns: [],
          authHeader: ({ accessToken }) => ({ 'X-Access-Token': accessToken }),
        },
      }),
    });

    expect(headers.get('X-Access-Token')).toBe('access-token');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('does not forward authorization when authHeader is disabled', () => {
    const request = new Request('https://example.com/api', {
      headers: {
        Authorization: 'Bearer stale-token',
      },
    }) as Request & { nextUrl: URL };
    request.nextUrl = new URL(request.url);

    const headers = createForwardHeaders({
      request,
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: normalizeConfig({
        backendBaseUrl: 'https://backend.test',
        cookies: {
          access: { name: 'access_token' },
          refresh: { name: 'refresh_token' },
        },
        auth: {
          refreshEndpoint: 'auth/refresh',
          logoutEndpoint: 'auth/logout',
          tokenEndpointPatterns: [],
          authHeader: false,
        },
      }),
    });

    expect(headers.get('Authorization')).toBeNull();
  });
});
