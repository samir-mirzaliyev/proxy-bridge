import type { NormalizedProxyConfig, ProxyRequest } from '../../types';

function applyHeaders(headers: Headers, values: HeadersInit) {
  new Headers(values).forEach((value, key) => {
    headers.set(key, value);
  });
}

export function createForwardHeaders({
  request,
  backendPath,
  accessToken,
  config,
}: {
  request: ProxyRequest;
  backendPath: string;
  accessToken?: string;
  config: NormalizedProxyConfig;
}) {
  const headers = new Headers();
  const strippedHeaders = new Set(config.stripRequestHeaders.map((header) => header.toLowerCase()));

  request.headers.forEach((value, key) => {
    if (!strippedHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  Object.entries(config.defaultHeaders).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  Object.entries(config.overrideHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  const authHeader = config.auth.authHeader;

  if (accessToken && authHeader !== false) {
    if (authHeader) {
      applyHeaders(headers, authHeader({ accessToken, request, backendPath, config }));
      return headers;
    }

    headers.set('Authorization', `Bearer ${accessToken}`);
  } else {
    headers.delete('Authorization');
  }

  return headers;
}
