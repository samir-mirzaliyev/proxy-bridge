import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { createResponseHeaders } from '../src/response/headers/create-response-headers';

describe('createResponseHeaders', () => {
  it('forwards allowed backend headers and strips configured headers', () => {
    const backendResponse = new Response('ok', {
      headers: {
        'content-type': 'text/plain',
        'x-request-id': '123',
        'set-cookie': 'access_token=value',
      },
    });

    const headers = createResponseHeaders({
      backendResponse,
      contentType: 'application/json',
      config: normalizeConfig({
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
    });

    expect(headers.get('x-request-id')).toBe('123');
    expect(headers.get('set-cookie')).toBeNull();
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('stamps a no-store cache-control by default and drops cache validators', () => {
    const backendResponse = new Response('ok', {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=600',
        etag: 'W/"abc"',
        'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
      },
    });

    const headers = createResponseHeaders({
      backendResponse,
      config: normalizeConfig({
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
    });

    expect(headers.get('cache-control')).toBe('no-store');
    expect(headers.get('etag')).toBeNull();
    expect(headers.get('last-modified')).toBeNull();
  });

  it('forwards backend cache-control when responseCacheControl is false', () => {
    const backendResponse = new Response('ok', {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=600',
      },
    });

    const headers = createResponseHeaders({
      backendResponse,
      config: normalizeConfig({
        backendBaseUrl: 'https://backend.test',
        response: { cacheControl: false },
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

    expect(headers.get('cache-control')).toBe('public, max-age=600');
  });
});
