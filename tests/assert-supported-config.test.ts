import { describe, expect, it } from 'vitest';

import { assertSupportedConfig } from '../src/config/assert-supported-config.util';

describe('assertSupportedConfig', () => {
  it('accepts a 1.0 config', () => {
    expect(() =>
      assertSupportedConfig({
        tokens: { access: {}, refresh: {} },
        endpoints: { refresh: 'auth/refresh', logout: 'auth/logout', issuesTokens: [] },
      }),
    ).not.toThrow();
  });

  it('names the replacement for every removed key', () => {
    const removed: [string, string][] = [
      ['cookies', 'tokens.access.cookie'],
      ['auth', 'endpoints'],
      ['refresh', 'autoRefresh'],
      ['defaultHeaders', 'headers.default'],
      ['overrideHeaders', 'headers.override'],
      ['stripRequestHeaders', 'headers.stripRequest'],
      ['stripResponseHeaders', 'headers.stripResponse'],
      ['responseCacheControl', 'response.cacheControl'],
      ['sanitizeTokenResponse', 'response.sanitizeTokens'],
      ['buildRefreshRequest', 'autoRefresh.buildRequest'],
    ];

    removed.forEach(([key, replacement]) => {
      expect(() => assertSupportedConfig({ [key]: {} })).toThrow(new RegExp(replacement));
    });
  });

  it('reports every removed key at once', () => {
    expect(() => assertSupportedConfig({ cookies: {}, auth: {}, overrideHeaders: {} })).toThrow(
      /cookies[\s\S]*auth[\s\S]*overrideHeaders/,
    );
  });
});
