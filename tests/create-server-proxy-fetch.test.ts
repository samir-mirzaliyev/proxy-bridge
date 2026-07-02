import { afterEach, describe, expect, it, vi } from 'vitest';

import { createServerProxyFetch } from '../src/server/create-server-proxy-fetch';

const cookieValue = vi.hoisted(() => ({ current: 'access_token=abc; refresh_token=def' }));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    toString: () => cookieValue.current,
  })),
}));

describe('createServerProxyFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cookieValue.current = 'access_token=abc; refresh_token=def';
  });

  it('fetches the internal proxy URL with current request cookies', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 1 }));
    const proxyFetch = createServerProxyFetch({
      appUrl: 'https://app.test',
      routePrefix: '/api',
    });

    await proxyFetch('/users/me', {
      cache: 'no-store',
      headers: {
        'Accept-Language': 'az',
      },
    });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = new Headers(init.headers);

    expect(url.toString()).toBe('https://app.test/api/users/me');
    expect(init.cache).toBe('no-store');
    expect(headers.get('Accept-Language')).toBe('az');
    expect(headers.get('Cookie')).toBe('access_token=abc; refresh_token=def');
  });

  it('overrides provided cookie headers with current request cookies', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));
    const proxyFetch = createServerProxyFetch({
      appUrl: 'https://app.test',
      routePrefix: '/api',
    });

    await proxyFetch('/users/me', {
      headers: {
        Cookie: 'access_token=stale',
      },
    });

    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);

    expect(headers.get('Cookie')).toBe('access_token=abc; refresh_token=def');
  });
});
