import { AuthProxyRequestHandler } from './proxy/auth-proxy-request-handler';

import type {
  HttpMethod,
  NormalizedProxyConfig,
  ProxyContext,
  ProxyHandler,
  ProxyHandlers,
  ProxyRequest,
} from './types';

function createHandler(method: HttpMethod, handler: AuthProxyRequestHandler): ProxyHandler {
  return (request: ProxyRequest, context: ProxyContext) =>
    handler.handle({
      request,
      context,
      method,
    });
}

export function createProxyHandlers(config: NormalizedProxyConfig): ProxyHandlers {
  const handler = new AuthProxyRequestHandler(config);

  return {
    GET: createHandler('GET', handler),
    POST: createHandler('POST', handler),
    PUT: createHandler('PUT', handler),
    PATCH: createHandler('PATCH', handler),
    DELETE: createHandler('DELETE', handler),
  };
}
