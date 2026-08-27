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
  const mode = config.response.sanitizeTokens;
  const issuesTokens = shouldStoreTokens(backendPath, config);

  if (typeof mode === 'function') {
    return mode({ payload, backendPath, issuesTokens, config });
  }

  if (mode === false) {
    return payload;
  }

  if (mode === true || mode === 'all-json' || (mode === 'issuing-endpoints' && issuesTokens)) {
    return sanitizeTokenResponse(payload);
  }

  return payload;
}
