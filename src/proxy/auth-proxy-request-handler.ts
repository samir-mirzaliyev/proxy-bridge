import { AuthCookieStore } from '../cookies/auth-cookie-store';
import { shouldClearCookies } from '../request/auth/should-clear-cookies.util';
import { shouldRefreshRequest } from '../request/auth/should-refresh-request';
import { TokenRefreshCoordinator } from '../request/auth/token-refresh-coordinator';
import { BackendRequestClient } from '../request/backend/backend-request-client';
import { buildBackendPath } from '../request/backend/build-backend-path.util';
import { getRequestBody } from '../request/body/get-request-body.util';
import { TokenRefreshService } from '../request/auth/token-refresh-service';
import { createProxyResponse } from '../response/create-proxy-response';
import { parseBackendResponse } from '../response/parse-backend-response';
import { extractTokens } from '../tokens/extract-tokens.util';
import { shouldStoreTokens } from '../tokens/should-store-tokens.util';

import type {
  HttpMethod,
  NormalizedProxyConfig,
  ProxyContext,
  ProxyRequest,
  TokenRefreshResult,
} from '../types';

export class AuthProxyRequestHandler {
  private readonly cookieStore: AuthCookieStore;
  private readonly backendClient: BackendRequestClient;
  private readonly refreshService: TokenRefreshService;
  private readonly refreshCoordinator = new TokenRefreshCoordinator();

  constructor(private readonly config: NormalizedProxyConfig) {
    this.cookieStore = new AuthCookieStore(config);
    this.backendClient = new BackendRequestClient(config);
    this.refreshService = new TokenRefreshService(config, this.cookieStore);
  }

  async handle({
    request,
    context,
    method,
  }: {
    request: ProxyRequest;
    context: ProxyContext;
    method: HttpMethod;
  }): Promise<Response> {
    const { proxy = [] } = await context.params;
    const backendPath = buildBackendPath(proxy);
    const body = await getRequestBody(request, method);
    const accessToken = await this.cookieStore.getAccessToken();
    const refreshToken = await this.cookieStore.getRefreshToken();

    let backendResponse = await this.backendClient.send({
      request,
      method,
      backendPath,
      body,
      accessToken,
    });
    let refreshResult: TokenRefreshResult | undefined;

    if (shouldRefreshRequest({ response: backendResponse, backendPath, config: this.config })) {
      refreshResult = refreshToken
        ? await this.refreshCoordinator.refresh(refreshToken, () =>
            this.refreshService.refresh({ request, currentAccessToken: accessToken }),
          )
        : { attempted: false };

      if (refreshResult?.tokens?.accessToken) {
        backendResponse = await this.backendClient.send({
          request,
          method,
          backendPath,
          body,
          accessToken: refreshResult.tokens.accessToken,
        });
      }
    }

    const parsedResponse = await parseBackendResponse(backendResponse, this.config, backendPath);
    const response = createProxyResponse({
      backendResponse,
      parsedResponse,
      config: this.config,
    });

    if (refreshResult?.tokens?.accessToken) {
      this.cookieStore.setTokens(response, refreshResult.tokens);
    }

    if (shouldStoreTokens(backendPath, this.config)) {
      this.cookieStore.setTokens(
        response,
        extractTokens(parsedResponse.payload, this.config.extractTokens),
      );
    }

    if (shouldClearCookies({ backendPath, refreshResult, config: this.config })) {
      this.cookieStore.clear(response);
    }

    return response;
  }
}
