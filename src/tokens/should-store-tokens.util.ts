import type { NormalizedProxyConfig } from '../types';

export function shouldStoreTokens(backendPath: string, config: NormalizedProxyConfig) {
  return config.auth.tokenEndpointPatterns.some((pattern) => pattern.test(backendPath));
}
