import type { NormalizedProxyConfig } from '../../types';

export function shouldRefreshRequest({
  response,
  backendPath,
  config,
}: {
  response: Response;
  backendPath: string;
  config: NormalizedProxyConfig;
}) {
  if (backendPath === config.auth.refreshEndpoint) {
    return false;
  }

  return config.refresh.statusCodes.includes(response.status);
}
