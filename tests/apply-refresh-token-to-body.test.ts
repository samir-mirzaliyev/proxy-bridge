import { describe, expect, it } from 'vitest';

import { applyRefreshTokenToBody } from '../src/request/body/apply-refresh-token-to-body.util';
import { normalizeConfig } from '../src/config/normalize-config.util';

import type { RefreshTokenDelivery } from '../src/types';

function encode(value: string) {
  return new TextEncoder().encode(value).buffer;
}

function decode(body?: ArrayBuffer) {
  return body ? new TextDecoder().decode(body) : body;
}

function createConfig(send?: RefreshTokenDelivery[]) {
  return normalizeConfig({
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
  });
}

describe('applyRefreshTokenToBody', () => {
  it('merges the refresh token into an existing JSON body', () => {
    const body = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode(JSON.stringify({ email: 'a@b.com' })),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
    });

    expect(JSON.parse(decode(body)!)).toEqual({
      email: 'a@b.com',
      refreshToken: 'refresh-token',
    });
  });

  it('uses a custom key', () => {
    const body = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode('{}'),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body', key: 'rt' }]),
    });

    expect(JSON.parse(decode(body)!)).toEqual({ rt: 'refresh-token' });
  });

  it('falls back to an empty object when the body is missing', () => {
    const body = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode(''),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
    });

    expect(JSON.parse(decode(body)!)).toEqual({ refreshToken: 'refresh-token' });
  });

  it('falls back to an empty object when the body is not valid JSON', () => {
    const body = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode('not json'),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
    });

    expect(JSON.parse(decode(body)!)).toEqual({ refreshToken: 'refresh-token' });
  });

  it('falls back to an empty object when the body is a JSON array', () => {
    const body = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode(JSON.stringify([1, 2, 3])),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
    });

    expect(JSON.parse(decode(body)!)).toEqual({ refreshToken: 'refresh-token' });
  });

  it('returns the body untouched for a non-matching path', () => {
    const body = encode(JSON.stringify({ email: 'a@b.com' }));

    expect(
      applyRefreshTokenToBody({
        backendPath: 'users/me',
        body,
        refreshToken: 'refresh-token',
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toBe(body);
  });

  it('returns the body untouched when there is no refresh token', () => {
    const body = encode(JSON.stringify({ email: 'a@b.com' }));

    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        body,
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toBe(body);
  });

  it('still merges for another path matched by a pattern that also matches endpoints.refresh', () => {
    const body = applyRefreshTokenToBody({
      backendPath: 'auth/exchange',
      body: encode('{}'),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: /^auth\//, in: 'body' }]),
    });

    expect(JSON.parse(decode(body)!)).toEqual({ refreshToken: 'refresh-token' });
  });

  it('does not merge into the refresh endpoint itself (built separately by TokenRefreshService)', () => {
    const body = encode('');

    expect(
      applyRefreshTokenToBody({
        backendPath: 'auth/refresh',
        body,
        refreshToken: 'refresh-token',
        config: createConfig(),
      }),
    ).toBe(body);
  });

  it('leaves an undefined body (GET/DELETE) untouched', () => {
    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        refreshToken: 'refresh-token',
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toBeUndefined();
  });

  it('does not affect a header or cookie delivery', () => {
    const body = encode(JSON.stringify({ email: 'a@b.com' }));

    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        body,
        refreshToken: 'refresh-token',
        config: createConfig([{ to: 'profiles/generate-token', in: 'cookie' }]),
      }),
    ).toBe(body);
  });
});
