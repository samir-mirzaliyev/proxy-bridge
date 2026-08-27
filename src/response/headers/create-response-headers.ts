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
  const strippedHeaders = new Set(config.headers.stripResponse.map((header) => header.toLowerCase()));

  backendResponse.headers.forEach((value, key) => {
    if (!strippedHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (config.response.cacheControl !== false) {
    for (const header of ['etag', 'last-modified', 'expires', 'pragma', 'age']) {
      headers.delete(header);
    }
    headers.set('cache-control', config.response.cacheControl);
  }

  return headers;
}
