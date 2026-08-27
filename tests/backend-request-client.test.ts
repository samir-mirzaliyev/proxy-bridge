import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { BackendRequestClient } from '../src/request/backend/backend-request-client';

describe('BackendRequestClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards requests to the backend with auth headers, body, and query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));
    const request = new Request('https://app.test/api/users/me?tab=profile', {
      headers: {
        'Accept-Language': 'en',
      },
    }) as Request & { nextUrl: URL };
    request.nextUrl = new URL(request.url);
    const body = new TextEncoder().encode('payload').buffer;

    const client = new BackendRequestClient(
      normalizeConfig({
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
        headers: {
          override: { 'Accept-Language': 'az' },
        },
      }),
    );

    await client.send({
      request,
      method: 'POST',
      backendPath: 'users/me',
      body,
      accessToken: 'access-token',
    });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = new Headers(init.headers);

    expect(url.toString()).toBe('https://backend.test/v1/users/me?tab=profile');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(body);
    expect(init.cache).toBe('no-store');
    expect(headers.get('Accept-Language')).toBe('az');
    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('forwards the refresh token to the backend when configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));
    const request = new Request('https://app.test/api/profiles/generate-token') as Request & {
      nextUrl: URL;
    };
    request.nextUrl = new URL(request.url);

    const client = new BackendRequestClient(
      normalizeConfig({
        backendBaseUrl: 'https://backend.test/v1',
        tokens: {
          access: { cookie: { name: 'access_token' } },
          refresh: {
            cookie: { name: 'refresh_token' },
            send: [{ to: 'profiles/generate-token', in: 'cookie' }],
          },
        },
        endpoints: {
          refresh: 'auth/refresh',
          logout: 'auth/logout',
          issuesTokens: [],
        },
      }),
    );

    await client.send({
      request,
      method: 'POST',
      backendPath: 'profiles/generate-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];

    expect(new Headers(init.headers).get('Cookie')).toBe('refresh_token=refresh-token');
  });
});
