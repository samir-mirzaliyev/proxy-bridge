import type { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { AuthProxyRequestHandler } from '../src/proxy/auth-proxy-request-handler';

const cookieValues = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieValues.get(name);
      return value ? { name, value } : undefined;
    },
  })),
}));

function createRequest(url: string, init?: RequestInit) {
  const request = new Request(url, init) as Request & { nextUrl: URL };
  request.nextUrl = new URL(request.url);
  return request;
}

function createHandler() {
  return new AuthProxyRequestHandler(
    normalizeConfig({
      backendBaseUrl: 'https://backend.test/v1',
      cookies: {
        access: { name: 'access_token' },
        refresh: { name: 'refresh_token' },
      },
      auth: {
        refreshEndpoint: 'auth/refresh',
        logoutEndpoint: 'auth/logout',
        tokenEndpointPatterns: [/^auth\/login$/, /^auth\/refresh$/],
      },
    }),
  );
}

describe('AuthProxyRequestHandler', () => {
  afterEach(() => {
    cookieValues.clear();
    vi.restoreAllMocks();
  });

  it('stores tokens from token endpoints and returns sanitized JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: { id: 1 },
        },
      }),
    );

    const response = await createHandler().handle({
      request: createRequest('https://app.test/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@test.dev' }),
      }),
      context: {
        params: Promise.resolve({ proxy: ['auth', 'login'] }),
      },
      method: 'POST',
    });

    await expect(response.json()).resolves.toEqual({
      data: {
        user: { id: 1 },
      },
    });
    const nextResponse = response as NextResponse;

    expect(nextResponse.cookies.get('access_token')?.value).toBe('access-token');
    expect(nextResponse.cookies.get('refresh_token')?.value).toBe('refresh-token');
  });

  it('refreshes tokens and retries the original request after a refresh status', async () => {
    cookieValues.set('access_token', 'old-access-token');
    cookieValues.set('refresh_token', 'refresh-token');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      )
      .mockResolvedValueOnce(Response.json({ id: 1 }));

    const response = await createHandler().handle({
      request: createRequest('https://app.test/api/users/me'),
      context: {
        params: Promise.resolve({ proxy: ['users', 'me'] }),
      },
      method: 'GET',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[2]?.[0] as URL).toString()).toBe(
      'https://backend.test/v1/users/me',
    );
    expect(new Headers((fetchMock.mock.calls[2]?.[1] as RequestInit).headers).get('Authorization')).toBe(
      'Bearer new-access-token',
    );
    await expect(response.json()).resolves.toEqual({ id: 1 });
    const nextResponse = response as NextResponse;

    expect(nextResponse.cookies.get('access_token')?.value).toBe('new-access-token');
    expect(nextResponse.cookies.get('refresh_token')?.value).toBe('new-refresh-token');
  });

  it('does not clear cookies on a 401 when no refresh token is present (unauthenticated)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 401 }));

    const response = await createHandler().handle({
      request: createRequest('https://app.test/api/users/me'),
      context: {
        params: Promise.resolve({ proxy: ['users', 'me'] }),
      },
      method: 'GET',
    });

    // Only the initial backend call ran — no refresh attempt without a refresh token.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
    const nextResponse = response as NextResponse;

    // No cookie-delete headers must be emitted for a plain unauthenticated 401.
    expect(nextResponse.cookies.get('access_token')).toBeUndefined();
    expect(nextResponse.cookies.get('refresh_token')).toBeUndefined();
  });

  it('clears cookies when a refresh was attempted but failed (expired session)', async () => {
    cookieValues.set('access_token', 'old-access-token');
    cookieValues.set('refresh_token', 'refresh-token');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    const response = await createHandler().handle({
      request: createRequest('https://app.test/api/users/me'),
      context: {
        params: Promise.resolve({ proxy: ['users', 'me'] }),
      },
      method: 'GET',
    });

    // Initial call + failed refresh attempt, no retry.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const nextResponse = response as NextResponse;

    expect(nextResponse.cookies.get('access_token')?.value).toBe('');
    expect(nextResponse.cookies.get('refresh_token')?.value).toBe('');
  });

  it('always clears cookies on the logout endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));

    const response = await createHandler().handle({
      request: createRequest('https://app.test/api/auth/logout', { method: 'POST' }),
      context: {
        params: Promise.resolve({ proxy: ['auth', 'logout'] }),
      },
      method: 'POST',
    });

    const nextResponse = response as NextResponse;

    expect(nextResponse.cookies.get('access_token')?.value).toBe('');
    expect(nextResponse.cookies.get('refresh_token')?.value).toBe('');
  });
});
