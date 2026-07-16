import { buildBackendUrl } from '../backend/build-backend-url.util';
import { AuthCookieStore } from '../../cookies/auth-cookie-store';
import { extractTokens } from '../../tokens/extract-tokens.util';

import type { NormalizedProxyConfig, ProxyRequest, TokenRefreshResult } from '../../types';

function applyCurrentAccessToken({
  headers,
  request,
  currentAccessToken,
  config,
}: {
  headers: Headers;
  request: ProxyRequest;
  currentAccessToken?: string;
  config: NormalizedProxyConfig;
}) {
  const authHeader = config.auth.authHeader;

  if (!currentAccessToken || authHeader === false) {
    return;
  }

  if (authHeader) {
    new Headers(
      authHeader({
        accessToken: currentAccessToken,
        request,
        backendPath: config.auth.refreshEndpoint,
        config,
      }),
    ).forEach((value, key) => {
      headers.set(key, value);
    });
    return;
  }

  headers.set('Authorization', `Bearer ${currentAccessToken}`);
}

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
  const headers = new Headers({
    ...config.defaultHeaders,
    ...config.overrideHeaders,
  });
  const init: RequestInit = {
    method: 'POST',
    headers,
    cache: 'no-store',
  };

  applyCurrentAccessToken({ headers, request, currentAccessToken, config });

  if (config.refresh.tokenTransport === 'header') {
    headers.set(config.refresh.tokenHeaderName, refreshToken);
    return init;
  }

  if (config.refresh.tokenTransport === 'cookie') {
    headers.set('Cookie', `${config.refresh.tokenCookieName}=${encodeURIComponent(refreshToken)}`);
    return init;
  }

  headers.set('Content-Type', 'application/json');

  return {
    ...init,
    body: JSON.stringify({ [config.refresh.tokenBodyKey]: refreshToken }),
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

    const response = await fetch(
      buildBackendUrl({
        request,
        backendPath: this.config.auth.refreshEndpoint,
        config: this.config,
      }),
      this.config.refresh.buildRequest || this.config.buildRefreshRequest
        ? (this.config.refresh.buildRequest ?? this.config.buildRefreshRequest)?.({
            request,
            refreshToken,
            currentAccessToken,
            config: this.config,
          })
        : createDefaultRefreshRequest({
            request,
            refreshToken,
            currentAccessToken,
            config: this.config,
          }),
    );

    if (!response.ok) {
      return { attempted: true };
    }

    const payload = await response.json().catch(() => null);
    return { attempted: true, tokens: extractTokens(payload, this.config.extractTokens) };
  }
}
