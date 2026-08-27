import { buildBackendUrl } from '../backend/build-backend-url.util';
import { AuthCookieStore } from '../../cookies/auth-cookie-store';
import { extractTokens } from '../../tokens/extract-tokens.util';
import { applyAccessToken } from '../headers/apply-access-token.util';
import { applyTokenPlacement } from '../headers/apply-token-placement.util';
import { resolveRefreshTokenDelivery } from './resolve-refresh-token-delivery.util';

import type { NormalizedProxyConfig, ProxyRequest, TokenRefreshResult } from '../../types';

function createDefaultRefreshRequest({
  request,
  refreshToken,
  currentAccessToken,
  config,
}: {
  request: ProxyRequest;
  refreshToken: string;
  currentAccessToken?: string;
  config: NormalizedProxyConfig;
}): RequestInit {
  const backendPath = config.endpoints.refresh;
  const headers = new Headers({
    ...config.headers.default,
    ...config.headers.override,
  });
  const init: RequestInit = {
    method: 'POST',
    headers,
    cache: 'no-store',
  };

  applyAccessToken({
    headers,
    request,
    backendPath,
    accessToken: currentAccessToken,
    config,
  });

  // Normalization always produces a row for endpoints.refresh, so this is never undefined.
  const delivery = resolveRefreshTokenDelivery(backendPath, config)!;

  if (delivery.in !== 'body') {
    applyTokenPlacement(headers, delivery, refreshToken);
    return init;
  }

  headers.set('Content-Type', 'application/json');

  return {
    ...init,
    body: JSON.stringify({ [delivery.key]: refreshToken }),
  };
}

export class TokenRefreshService {
  constructor(
    private readonly config: NormalizedProxyConfig,
    private readonly cookieStore: AuthCookieStore,
  ) {}

  async refresh({
    request,
    currentAccessToken,
  }: {
    request: ProxyRequest;
    currentAccessToken?: string;
  }): Promise<TokenRefreshResult> {
    const refreshToken = await this.cookieStore.getRefreshToken();

    if (!refreshToken) {
      return { attempted: false };
    }

    const context = { request, refreshToken, currentAccessToken, config: this.config };
    const response = await fetch(
      buildBackendUrl({
        request,
        backendPath: this.config.endpoints.refresh,
        config: this.config,
      }),
      this.config.autoRefresh.buildRequest?.(context) ?? createDefaultRefreshRequest(context),
    );

    if (!response.ok) {
      return { attempted: true };
    }

    const payload = await response.json().catch(() => null);

    return { attempted: true, tokens: extractTokens(payload, this.config.extractTokens) };
  }
}
