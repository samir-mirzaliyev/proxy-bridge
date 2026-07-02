import { describe, expect, it } from 'vitest';

import { buildProxyFetchUrl } from '../src/server/build-proxy-fetch-url.util';

describe('buildProxyFetchUrl', () => {
  it.each([
    ['/users/me', 'https://app.test/api/users/me'],
    ['users/me', 'https://app.test/api/users/me'],
    ['/api/users/me', 'https://app.test/api/users/me'],
    ['auth/login', 'https://app.test/api/auth/login'],
  ])('builds internal proxy URLs from %s', (input, expected) => {
    expect(
      buildProxyFetchUrl({
        appUrl: 'https://app.test',
        routePrefix: '/api',
        input,
      }).toString(),
    ).toBe(expected);
  });

  it('supports custom route prefixes', () => {
    expect(
      buildProxyFetchUrl({
        appUrl: 'https://app.test',
        routePrefix: '/internal-api/',
        input: '/users/me',
      }).toString(),
    ).toBe('https://app.test/internal-api/users/me');
  });

  it.each(['https://external.test/users/me', 'http://external.test/users/me', '//external.test/users/me'])(
    'rejects external URLs',
    (input) => {
      expect(() =>
        buildProxyFetchUrl({
          appUrl: 'https://app.test',
          routePrefix: '/api',
          input,
        }),
      ).toThrow('proxyBridge.fetch only accepts internal proxy paths');
    },
  );
});
