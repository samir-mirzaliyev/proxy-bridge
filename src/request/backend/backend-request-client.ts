import { buildBackendUrl } from './build-backend-url.util';
import { invokeHook } from '../../hooks/invoke-hook.util';
import { createForwardHeaders } from '../headers/create-forward-headers';
import { applyRefreshTokenToBody } from '../body/apply-refresh-token-to-body.util';

import type { HttpMethod, NormalizedProxyConfig, ProxyRequest } from '../../types';

export class BackendRequestClient {
  constructor(private readonly config: NormalizedProxyConfig) {}

  async send({
    request,
    method,
    backendPath,
    body,
    accessToken,
    refreshToken,
    isRetry = false,
  }: {
    request: ProxyRequest;
    method: HttpMethod;
    backendPath: string;
    body?: ArrayBuffer;
    accessToken?: string;
    refreshToken?: string;
    isRetry?: boolean;
  }) {
    const url = buildBackendUrl({ request, backendPath, config: this.config });
    const { body: forwardedBody, isMerged } = applyRefreshTokenToBody({
      backendPath,
      body,
      refreshToken,
      config: this.config,
    });
    const headers = createForwardHeaders({
      request,
      backendPath,
      accessToken,
      refreshToken,
      isRefreshTokenInBody: isMerged,
      config: this.config,
    });

    invokeHook(this.config.hooks.onBackendRequest, () => ({
      method,
      url: url instanceof URL ? url : new URL(url),
      backendPath,
      headers,
      isRetry,
    }));

    const response = await fetch(url, { method, headers, body: forwardedBody, cache: 'no-store' });

    invokeHook(this.config.hooks.onBackendResponse, () => ({
      backendPath,
      status: response.status,
      isRetry,
    }));

    return response;
  }
}
