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
  if (backendPath === config.endpoints.refresh) {
    return false;
  }

  return config.autoRefresh.on.includes(response.status);
}
