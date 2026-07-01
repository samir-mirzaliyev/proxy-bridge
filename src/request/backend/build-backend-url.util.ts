import type { NormalizedProxyConfig, ProxyRequest } from '../../types';

export function buildBackendUrl({
  request,
  backendPath,
  config,
}: {
  request: ProxyRequest;
  backendPath: string;
  config: NormalizedProxyConfig;
}) {
  if (config.buildBackendUrl) {
    return config.buildBackendUrl({
      request,
      backendBaseUrl: config.backendBaseUrl,
      backendPath,
    });
  }

  const { backendBaseUrl } = config;

  if (!backendBaseUrl) {
    throw new Error('backendBaseUrl is not configured');
  }

  const url = new URL(`${backendBaseUrl.replace(/\/$/, '')}/${backendPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url;
}
