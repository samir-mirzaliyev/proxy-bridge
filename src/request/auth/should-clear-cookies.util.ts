import type { NormalizedProxyConfig, TokenRefreshResult } from '../../types';

export function shouldClearCookies({
  backendPath,
  refreshResult,
  config,
}: {
  backendPath: string;
  refreshResult?: TokenRefreshResult;
  config: NormalizedProxyConfig;
}): boolean {
  if (backendPath === config.auth.logoutEndpoint) {
    return true;
  }

  return refreshResult?.attempted === true && !refreshResult.tokens?.accessToken;
}
