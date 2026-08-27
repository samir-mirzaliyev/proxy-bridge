import type { NormalizedProxyConfig, ProxyRequest } from '../../types';

function applyHeaders(headers: Headers, values: HeadersInit) {
  new Headers(values).forEach((value, key) => {
    headers.set(key, value);
  });
}

/**
 * Writes the access token into headers, for both proxied requests and the proxy's own refresh call.
 * Placement defaults are resolved during normalization, so there are none to apply here.
 */
export function applyAccessToken({
  headers,
  request,
  backendPath,
  accessToken,
  config,
}: {
  headers: Headers;
  request: ProxyRequest;
  backendPath: string;
  accessToken?: string;
  config: NormalizedProxyConfig;
}) {
  const send = config.tokens.access.send;

  // The inbound Authorization header is already dropped by the default `headers.stripRequest`.
  // This delete is the last line of defence for a config that replaces that list.
  if (!accessToken || send === false) {
    headers.delete('Authorization');
    return;
  }

  if (typeof send === 'function') {
    applyHeaders(headers, send({ accessToken, request, backendPath, config }));
    return;
  }

  headers.set(send.name, send.scheme === false ? accessToken : `${send.scheme} ${accessToken}`);
}
