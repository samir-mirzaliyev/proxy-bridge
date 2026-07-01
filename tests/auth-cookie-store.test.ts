import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { AuthCookieStore } from '../src/cookies/auth-cookie-store';

const cookieValues = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieValues.get(name);
      return value ? { name, value } : undefined;
    },
  })),
}));

function createStore() {
  return new AuthCookieStore(
    normalizeConfig({
      backendBaseUrl: 'https://backend.test',
      cookies: {
        access: {
          name: 'access_token',
          maxAge: 3600,
        },
        refresh: {
          name: 'refresh_token',
          sameSite: 'strict',
        },
      },
      auth: {
        refreshEndpoint: 'auth/refresh',
        logoutEndpoint: 'auth/logout',
        tokenEndpointPatterns: [],
      },
    }),
  );
}

describe('AuthCookieStore', () => {
  afterEach(() => {
    cookieValues.clear();
  });

  it('reads access and refresh tokens from cookies', async () => {
    cookieValues.set('access_token', 'access-token');
    cookieValues.set('refresh_token', 'refresh-token');
    const store = createStore();

    await expect(store.getAccessToken()).resolves.toBe('access-token');
    await expect(store.getRefreshToken()).resolves.toBe('refresh-token');
  });

  it('sets provided tokens on the response', () => {
    const store = createStore();
    const response = NextResponse.json({ ok: true });

    store.setTokens(response, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(response.cookies.get('access_token')?.value).toBe('access-token');
    expect(response.cookies.get('refresh_token')?.value).toBe('refresh-token');
  });

  it('clears auth cookies from the response', () => {
    const store = createStore();
    const response = NextResponse.json({ ok: true });

    store.clear(response);

    expect(response.cookies.get('access_token')?.value).toBe('');
    expect(response.cookies.get('refresh_token')?.value).toBe('');
  });
});
