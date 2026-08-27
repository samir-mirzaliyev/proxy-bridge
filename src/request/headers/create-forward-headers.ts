import { applyAccessToken } from './apply-access-token.util';
import { applyTokenPlacement } from './apply-token-placement.util';
import { resolveForwardedRefreshTokenDelivery } from '../auth/resolve-refresh-token-delivery.util';

import type { NormalizedProxyConfig, ProxyRequest } from '../../types';

function applyRefreshToken({
  headers,
  backendPath,
  refreshToken,
  config,
}: {
  headers: Headers;
  backendPath: string;
  refreshToken?: string;
  config: NormalizedProxyConfig;
}) {
  if (!refreshToken) {
    return;
  }

  const delivery = resolveForwardedRefreshTokenDelivery(backendPath, config);

  if (!delivery) {
    return;
  }

  applyTokenPlacement(headers, delivery, refreshToken);
}

export function createForwardHeaders({
  request,
  backendPath,
  accessToken,
  refreshToken,
  config,
}: {
  request: ProxyRequest;
  backendPath: string;
  accessToken?: string;
  refreshToken?: string;
  config: NormalizedProxyConfig;
}) {
  const headers = new Headers();
  const strippedHeaders = new Set(
    config.headers.stripRequest.map((header) => header.toLowerCase()),
  );

  request.headers.forEach((value, key) => {
    if (!strippedHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  Object.entries(config.headers.default).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  Object.entries(config.headers.override).forEach(([key, value]) => {
    headers.set(key, value);
  });

  applyRefreshToken({ headers, backendPath, refreshToken, config });
  applyAccessToken({ headers, request, backendPath, accessToken, config });

  return headers;
}
