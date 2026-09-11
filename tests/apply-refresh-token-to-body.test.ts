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
    const { body, isMerged } = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode(JSON.stringify({ email: 'a@b.com' })),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
    });

    expect(isMerged).toBe(true);
    expect(JSON.parse(decode(body)!)).toEqual({
      email: 'a@b.com',
      refreshToken: 'refresh-token',
    });
  });

  it('uses a custom key', () => {
    const { body, isMerged } = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode('{}'),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body', key: 'rt' }]),
    });

    expect(isMerged).toBe(true);
    expect(JSON.parse(decode(body)!)).toEqual({ rt: 'refresh-token' });
  });

  it('overwrites a key the caller already set', () => {
    const { body } = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode(JSON.stringify({ refreshToken: 'stale' })),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
    });

    expect(JSON.parse(decode(body)!)).toEqual({ refreshToken: 'refresh-token' });
  });

  it('treats an empty body as an empty object, so the key still reaches the backend', () => {
    const { body, isMerged } = applyRefreshTokenToBody({
      backendPath: 'profiles/generate-token',
      body: encode(''),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
    });

    expect(isMerged).toBe(true);
    expect(JSON.parse(decode(body)!)).toEqual({ refreshToken: 'refresh-token' });
  });

  it('forwards a body that is not valid JSON untouched rather than discarding it', () => {
    const body = encode('not json');

    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        body,
        refreshToken: 'refresh-token',
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toEqual({ body, isMerged: false });
  });

  it('forwards a JSON array untouched — there is no key to merge into', () => {
    const body = encode(JSON.stringify([1, 2, 3]));

    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        body,
        refreshToken: 'refresh-token',
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toEqual({ body, isMerged: false });
  });

  it('forwards a urlencoded body untouched', () => {
    const body = encode('email=a%40b.com&name=Test');

    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        body,
        refreshToken: 'refresh-token',
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toEqual({ body, isMerged: false });
  });

  it('forwards a multipart body untouched, byte for byte', () => {
    const multipart = [
      '------WebKitFormBoundary',
      'Content-Disposition: form-data; name="file"; filename="a.png"',
      'Content-Type: image/png',
      '',
      'PNG\r\n\n',
      '------WebKitFormBoundary--',
      '',
    ].join('\r\n');
    const body = encode(multipart);

    const result = applyRefreshTokenToBody({
      backendPath: 'profiles/upload',
      body,
      refreshToken: 'refresh-token',
      config: createConfig([{ to: /^profiles\//, in: 'body' }]),
    });

    expect(result).toEqual({ body, isMerged: false });
    expect(decode(result.body)).toBe(multipart);
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
    ).toEqual({ body, isMerged: false });
  });

  it('returns the body untouched when there is no refresh token', () => {
    const body = encode(JSON.stringify({ email: 'a@b.com' }));

    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        body,
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toEqual({ body, isMerged: false });
  });

  it('still merges for another path matched by a pattern that also matches endpoints.refresh', () => {
    const { body, isMerged } = applyRefreshTokenToBody({
      backendPath: 'auth/exchange',
      body: encode('{}'),
      refreshToken: 'refresh-token',
      config: createConfig([{ to: /^auth\//, in: 'body' }]),
    });

    expect(isMerged).toBe(true);
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
    ).toEqual({ body, isMerged: false });
  });

  it('leaves an undefined body (GET/DELETE) untouched and reports no merge', () => {
    expect(
      applyRefreshTokenToBody({
        backendPath: 'profiles/generate-token',
        refreshToken: 'refresh-token',
        config: createConfig([{ to: 'profiles/generate-token', in: 'body' }]),
      }),
    ).toEqual({ body: undefined, isMerged: false });
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
    ).toEqual({ body, isMerged: false });
  });
});
