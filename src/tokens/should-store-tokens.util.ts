import { matchesEndpointPattern } from '../config/endpoint-patterns.util';

import type { NormalizedProxyConfig } from '../types';

export function shouldStoreTokens(backendPath: string, config: NormalizedProxyConfig) {
  return matchesEndpointPattern(backendPath, config.endpoints.issuesTokens);
}
