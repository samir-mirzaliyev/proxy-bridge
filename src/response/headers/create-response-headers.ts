import type { NormalizedProxyConfig } from '../../types';

export function createResponseHeaders({
  backendResponse,
  contentType,
  config,
}: {
  backendResponse: Response;
  contentType?: string;
  config: NormalizedProxyConfig;
}) {
  const headers = new Headers();
  const strippedHeaders = new Set(config.stripResponseHeaders.map((header) => header.toLowerCase()));

  backendResponse.headers.forEach((value, key) => {
    if (!strippedHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  if (contentType) {
    headers.set('content-type', contentType);
  }

  return headers;
}
