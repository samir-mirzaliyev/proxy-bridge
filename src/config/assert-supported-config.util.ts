const RENAMED_TOP_LEVEL_KEYS: Record<string, string> = {
  cookies: 'tokens.access.cookie / tokens.refresh.cookie',
  auth: 'endpoints / tokens.access.send / tokens.refresh.send',
  refresh: 'autoRefresh',
  defaultHeaders: 'headers.default',
  overrideHeaders: 'headers.override',
  stripRequestHeaders: 'headers.stripRequest',
  stripResponseHeaders: 'headers.stripResponse',
  responseCacheControl: 'response.cacheControl',
  sanitizeTokenResponse: 'response.sanitizeTokens',
  buildRefreshRequest: 'autoRefresh.buildRequest',
};

/**
 * Fails loudly when a 0.x config shape is passed. Silently ignoring the old keys would leave
 * `endpoints.issuesTokens` empty, so tokens would never be stored and auth would break without
 * any visible error.
 */
export function assertSupportedConfig(config: object) {
  const renamed = Object.keys(RENAMED_TOP_LEVEL_KEYS)
    .filter((key) => key in config)
    .map((key) => `  ${key} -> ${RENAMED_TOP_LEVEL_KEYS[key]}`);

  if (!renamed.length) {
    return;
  }

  throw new Error(
    [
      'proxy-bridge: this config uses the 0.x shape, which was removed in 1.0.0.',
      ...renamed,
      'See the "Migrating from 0.x" section of the README.',
    ].join('\n'),
  );
}
