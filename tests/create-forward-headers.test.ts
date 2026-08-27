import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { createForwardHeaders } from '../src/request/headers/create-forward-headers';

import type { AccessTokenSender, RefreshTokenDelivery } from '../src/types';

function createRequest(cookieHeader?: string) {
  const request = new Request('https://example.com/api', {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  }) as Request & { nextUrl: URL };
  request.nextUrl = new URL(request.url);

  return request;
}

function createForwardConfig({
  send,
  accessToken,
  refreshCookieName = 'refresh_token',
}: {
  send?: RefreshTokenDelivery<'auth/refresh'>[];
  accessToken?: AccessTokenSender;
  refreshCookieName?: string;
} = {}) {
  return normalizeConfig({
    backendBaseUrl: 'https://backend.test',
    tokens: {
      access: { cookie: { name: 'access_token' }, send: accessToken },
      refresh: { cookie: { name: refreshCookieName }, send },
    },
    endpoints: {
      refresh: 'auth/refresh',
      logout: 'auth/logout',
      issuesTokens: [],
    },
  });
}

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

    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('uses a custom header name for the access token', () => {
    const headers = createForwardHeaders({
      request: createRequest(),
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: createForwardConfig({ accessToken: { in: 'header', name: 'X-Access-Token' } }),
    });

    expect(headers.get('X-Access-Token')).toBe('Bearer access-token');
  });

  it('never forwards a client-supplied Authorization header', () => {
    const request = new Request('https://example.com/api', {
      headers: { Authorization: 'Bearer spoofed-token' },
    }) as Request & { nextUrl: URL };
    request.nextUrl = new URL(request.url);

    // A custom header name means the access token no longer overwrites Authorization, so the
    // inbound one would otherwise survive and reach the backend.
    const headers = createForwardHeaders({
      request,
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: createForwardConfig({ accessToken: { in: 'header', name: 'X-Access-Token' } }),
    });

    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-Access-Token')).toBe('Bearer access-token');
  });

  it('still lets headers.override set Authorization explicitly', () => {
    const request = new Request('https://example.com/api', {
      headers: { Authorization: 'Bearer spoofed-token' },
    }) as Request & { nextUrl: URL };
    request.nextUrl = new URL(request.url);

    const headers = createForwardHeaders({
      request,
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: normalizeConfig({
        backendBaseUrl: 'https://backend.test',
        tokens: {
          access: {
            cookie: { name: 'access_token' },
            send: { in: 'header', name: 'X-Access-Token' },
          },
          refresh: { cookie: { name: 'refresh_token' } },
        },
        endpoints: { refresh: 'auth/refresh', logout: 'auth/logout', issuesTokens: [] },
        headers: { override: { Authorization: 'Bearer gateway-key' } },
      }),
    });

    expect(headers.get('Authorization')).toBe('Bearer gateway-key');
  });

  it('omits the scheme prefix when scheme is false', () => {
    const headers = createForwardHeaders({
      request: createRequest(),
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: createForwardConfig({
        accessToken: { in: 'header', name: 'X-Access-Token', scheme: false },
      }),
    });

    expect(headers.get('X-Access-Token')).toBe('access-token');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('uses custom auth headers when authHeader is configured', () => {
    const request = new Request('https://example.com/api') as Request & { nextUrl: URL };
    request.nextUrl = new URL(request.url);

    const headers = createForwardHeaders({
      request,
      backendPath: 'users/me',
      accessToken: 'access-token',
      config: createForwardConfig({
        accessToken: ({ accessToken }) => ({ 'X-Access-Token': accessToken }),
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
      config: createForwardConfig({ accessToken: false }),
    });

    expect(headers.get('Authorization')).toBeNull();
  });

  it('forwards only the refresh cookie on matching paths, never the inbound cookie jar', () => {
    const headers = createForwardHeaders({
      request: createRequest('ss_v2=abc.1.99.0; access_token=stale; view_preference=grid'),
      backendPath: 'profiles/generate-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      config: createForwardConfig({ send: [{ to: 'profiles/generate-token', in: 'cookie' }] }),
    });

    expect(headers.get('Cookie')).toBe('refresh_token=refresh-token');
  });

  it('does not forward the refresh token on non-matching paths', () => {
    const headers = createForwardHeaders({
      request: createRequest('ss_v2=abc.1.99.0'),
      backendPath: 'users/me',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      config: createForwardConfig({ send: [{ to: 'profiles/generate-token', in: 'cookie' }] }),
    });

    expect(headers.get('Cookie')).toBeNull();
  });

  it('does not forward the refresh token when forwarding is not configured', () => {
    const headers = createForwardHeaders({
      request: createRequest(),
      backendPath: 'profiles/generate-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      config: createForwardConfig(),
    });

    expect(headers.get('Cookie')).toBeNull();
  });

  it('does not forward the refresh token when there is none', () => {
    const headers = createForwardHeaders({
      request: createRequest(),
      backendPath: 'profiles/generate-token',
      accessToken: 'access-token',
      config: createForwardConfig({ send: [{ to: 'profiles/generate-token', in: 'cookie' }] }),
    });

    expect(headers.get('Cookie')).toBeNull();
  });

  it('uses the configured cookie name and percent-encodes the value', () => {
    const headers = createForwardHeaders({
      request: createRequest(),
      backendPath: 'profiles/generate-token',
      refreshToken: 'a b/c',
      config: createForwardConfig({
        send: [{ to: 'profiles/generate-token', in: 'cookie' }],
        refreshCookieName: 'session',
      }),
    });

    expect(headers.get('Cookie')).toBe('session=a%20b%2Fc');
  });

  it('sends the refresh token in a header when the header transport is configured', () => {
    const headers = createForwardHeaders({
      request: createRequest(),
      backendPath: 'profiles/generate-token',
      refreshToken: 'refresh-token',
      config: createForwardConfig({
        send: [{ to: 'profiles/generate-token', in: 'header', name: 'X-RT' }],
      }),
    });

    expect(headers.get('X-RT')).toBe('refresh-token');
    expect(headers.get('Cookie')).toBeNull();
  });

  it('lets an explicit authHeader override the forwarded refresh cookie', () => {
    const headers = createForwardHeaders({
      request: createRequest(),
      backendPath: 'profiles/generate-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      config: createForwardConfig({
        send: [{ to: 'profiles/generate-token', in: 'cookie' }],
        accessToken: ({ accessToken }) => ({
          Authorization: `Bearer ${accessToken}`,
          Cookie: 'custom=value',
        }),
      }),
    });

    expect(headers.get('Cookie')).toBe('custom=value');
  });
});
