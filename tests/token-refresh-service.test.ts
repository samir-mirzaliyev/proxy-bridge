import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { AuthCookieStore } from '../src/cookies/auth-cookie-store';
import { TokenRefreshService } from '../src/request/auth/token-refresh-service';

import type { ProxyAutoRefreshConfig, RefreshTokenDelivery } from '../src/types';

function createRequest() {
  const request = new Request('https://app.test/api/users/me') as Request & { nextUrl: URL };
  request.nextUrl = new URL(request.url);
  return request;
}

function createService({
  send,
  autoRefresh,
}: {
  send?: RefreshTokenDelivery<'auth/refresh'>[];
  autoRefresh?: ProxyAutoRefreshConfig;
} = {}) {
  const config = normalizeConfig({
    backendBaseUrl: 'https://backend.test',
    tokens: {
      access: { cookie: { name: 'access_token' } },
      refresh: { cookie: { name: 'refresh_token' }, send },
    },
    endpoints: {
      refresh: 'auth/refresh',
      logout: 'auth/logout',
      issuesTokens: [],
    },
    autoRefresh,
  });
  const cookieStore = new AuthCookieStore(config);

  vi.spyOn(cookieStore, 'getRefreshToken').mockResolvedValue('refresh-token');

  return new TokenRefreshService(config, cookieStore);
}

describe('TokenRefreshService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the refresh token in the request body by default', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        accessToken: 'new-access-token',
      }),
    );

    await createService().refresh({ request: createRequest() });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(init.body).toBe(JSON.stringify({ refreshToken: 'refresh-token' }));
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('can send the refresh token in a custom header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        accessToken: 'new-access-token',
      }),
    );

    await createService({
      send: [{ to: 'auth/refresh', in: 'header', name: 'X-Custom-Refresh' }],
    }).refresh({ request: createRequest() });

    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);

    expect(headers.get('X-Custom-Refresh')).toBe('refresh-token');
  });

  it('can send the refresh token as a cookie header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        accessToken: 'new-access-token',
      }),
    );

    await createService({
      send: [{ to: 'auth/refresh', in: 'cookie', name: 'refresh_token' }],
    }).refresh({ request: createRequest() });

    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);

    expect(headers.get('Cookie')).toBe('refresh_token=refresh-token');
  });

  it('does not call the backend when the refresh token cookie is missing', async () => {
    const config = normalizeConfig({
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
    });
    const cookieStore = new AuthCookieStore(config);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));

    vi.spyOn(cookieStore, 'getRefreshToken').mockResolvedValue(undefined);

    await expect(
      new TokenRefreshService(config, cookieStore).refresh({ request: createRequest() }),
    ).resolves.toEqual({ attempted: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an attempted-but-failed refresh when the refresh response is not successful', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

    await expect(createService().refresh({ request: createRequest() })).resolves.toEqual({
      attempted: true,
    });
  });

  it('uses a custom refresh request builder when configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        accessToken: 'new-access-token',
      }),
    );

    await createService({
      autoRefresh: {
        buildRequest: ({ refreshToken }) => ({
          method: 'PUT',
          headers: { 'X-Refresh': refreshToken },
          cache: 'no-store',
        }),
      },
    }).refresh({ request: createRequest() });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);

    expect(init.method).toBe('PUT');
    expect(headers.get('X-Refresh')).toBe('refresh-token');
  });
});
