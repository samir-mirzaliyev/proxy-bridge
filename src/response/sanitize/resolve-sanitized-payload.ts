import { shouldStoreTokens } from '../../tokens/should-store-tokens.util';
import { sanitizeTokenResponse } from './sanitize-token-response.util';

import type { NormalizedProxyConfig } from '../../types';

export function resolveSanitizedPayload({
  payload,
  backendPath,
  config,
}: {
  payload: unknown;
  backendPath: string;
  config: NormalizedProxyConfig;
}) {
  const mode = config.sanitizeTokenResponse ?? 'auth-endpoints';
  const isAuthEndpoint = shouldStoreTokens(backendPath, config);

  if (typeof mode === 'function') {
    return mode({ payload, backendPath, isAuthEndpoint, config });
  }

  if (mode === false) {
    return payload;
  }

  if (mode === true || mode === 'all-json' || (mode === 'auth-endpoints' && isAuthEndpoint)) {
    return sanitizeTokenResponse(payload);
  }

  return payload;
}
