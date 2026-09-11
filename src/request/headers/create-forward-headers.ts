import { applyAccessToken } from './apply-access-token.util';
import { applyTokenPlacement } from './apply-token-placement.util';
import { resolveForwardedRefreshTokenDelivery } from '../auth/resolve-refresh-token-delivery.util';

import type { NormalizedProxyConfig, ProxyRequest } from '../../types';

function applyRefreshToken({
  headers,
  backendPath,
  refreshToken,
  isRefreshTokenInBody,
  config,
}: {
  headers: Headers;
  backendPath: string;
  refreshToken?: string;
  isRefreshTokenInBody: boolean;
  config: NormalizedProxyConfig;
}) {
  if (!refreshToken) {
    return;
  }

  const delivery = resolveForwardedRefreshTokenDelivery(backendPath, config);

  if (!delivery) {
    return;
  }

  if (delivery.in === 'body') {
    // `applyRefreshTokenToBody` owns the decision and has already run. It re-serializes the body as
    // JSON when it merges, so the content type has to follow — and when it declined to merge
    // (no body, or one that is not a JSON object) nothing here may claim otherwise.
    if (isRefreshTokenInBody) {
      headers.set('Content-Type', 'application/json');
    }

    return;
  }

  applyTokenPlacement(headers, delivery, refreshToken);
}

export function createForwardHeaders({
  request,
  backendPath,
  accessToken,
  refreshToken,
  isRefreshTokenInBody = false,
  config,
}: {
  request: ProxyRequest;
  backendPath: string;
  accessToken?: string;
  refreshToken?: string;
  /** What `applyRefreshTokenToBody` decided for this request — see its `isMerged`. */
  isRefreshTokenInBody?: boolean;
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

  applyRefreshToken({ headers, backendPath, refreshToken, isRefreshTokenInBody, config });
  applyAccessToken({ headers, request, backendPath, accessToken, config });

  return headers;
}
