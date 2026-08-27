import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';

import type { ProxyConfig } from '../src/types';

function createConfig(overrides: Partial<ProxyConfig> = {}): ProxyConfig {
  return {
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
    ...overrides,
  };
}

describe('normalizeConfig', () => {
  it('fills optional config values with defaults', () => {
    const config = normalizeConfig(createConfig());

    expect(config.tokens.access.send).toEqual({
      in: 'header',
      name: 'Authorization',
      scheme: 'Bearer',
    });
    expect(config.autoRefresh).toMatchObject({ on: [401] });
    expect(config.headers.default).toEqual({});
    expect(config.headers.override).toEqual({});
    expect(config.headers.stripRequest).toContain('cookie');
    expect(config.headers.stripRequest).toContain('authorization');
    expect(config.headers.stripResponse).toContain('set-cookie');
    expect(config.response.cacheControl).toBe('no-store');
    expect(config.response.sanitizeTokens).toBe('issuing-endpoints');
    expect(config.hooks).toEqual({});
  });

  it('adds an implicit body delivery for the refresh endpoint', () => {
    const config = normalizeConfig(createConfig());

    expect(config.tokens.refresh.send).toEqual([
      { to: 'auth/refresh', in: 'body', key: 'refreshToken' },
    ]);
  });

  it('keeps an explicit refresh endpoint delivery instead of adding the implicit one', () => {
    const config = normalizeConfig(
      createConfig({
        tokens: {
          access: { cookie: { name: 'access_token' } },
          refresh: {
            cookie: { name: 'refresh_token' },
            send: [{ to: 'auth/refresh', in: 'cookie' }],
          },
        },
      }),
    );

    expect(config.tokens.refresh.send).toEqual([
      { to: 'auth/refresh', in: 'cookie', name: 'refresh_token' },
    ]);
  });

  it('inherits the cookie delivery name from the refresh cookie', () => {
    const config = normalizeConfig(
      createConfig({
        tokens: {
          access: { cookie: { name: 'access_token' } },
          refresh: {
            cookie: { name: 'session' },
            send: [{ to: 'profiles/generate-token', in: 'cookie' }],
          },
        },
      }),
    );

    expect(config.tokens.refresh.send[0]).toEqual({
      to: 'profiles/generate-token',
      in: 'cookie',
      name: 'session',
    });
  });

  it('rejects a body delivery for anything but the refresh endpoint', () => {
    expect(() =>
      normalizeConfig(
        createConfig({
          tokens: {
            access: { cookie: { name: 'access_token' } },
            refresh: {
              cookie: { name: 'refresh_token' },
              // The type guards this too; this covers a widened `endpoints.refresh`.
              send: [{ to: 'profiles/generate-token' as 'auth/refresh', in: 'body' }],
            },
          },
        }),
      ),
    ).toThrow(/only valid for endpoints\.refresh/);
  });

  it('strips stateful regex flags from both pattern lists', () => {
    const config = normalizeConfig(
      createConfig({
        tokens: {
          access: { cookie: { name: 'access_token' } },
          refresh: {
            cookie: { name: 'refresh_token' },
            send: [{ to: /^profiles\/generate-token$/y, in: 'cookie' }],
          },
        },
        endpoints: {
          refresh: 'auth/refresh',
          logout: 'auth/logout',
          issuesTokens: [/^auth\/login$/g],
        },
      }),
    );

    expect((config.endpoints.issuesTokens[0] as RegExp).flags).toBe('');
    expect((config.tokens.refresh.send[0]?.to as RegExp).flags).toBe('');
  });

  it('preserves provided optional config values', () => {
    const buildRequest = () => ({ method: 'POST' });
    const config = normalizeConfig(
      createConfig({
        autoRefresh: { on: [401, 419], buildRequest },
        headers: {
          default: { 'Accept-Language': 'az' },
          override: { 'X-App': 'web' },
          stripRequest: ['host'],
          stripResponse: ['server'],
        },
        response: { cacheControl: 'private, max-age=0', sanitizeTokens: 'all-json' },
      }),
    );

    expect(config.autoRefresh).toMatchObject({ on: [401, 419], buildRequest });
    expect(config.headers.default).toEqual({ 'Accept-Language': 'az' });
    expect(config.headers.override).toEqual({ 'X-App': 'web' });
    expect(config.headers.stripRequest).toEqual(['host']);
    expect(config.headers.stripResponse).toEqual(['server']);
    expect(config.response.cacheControl).toBe('private, max-age=0');
    expect(config.response.sanitizeTokens).toBe('all-json');
  });
});
