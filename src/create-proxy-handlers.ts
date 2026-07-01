import { normalizeConfig } from './config/normalize-config.util';
import { AuthProxyRequestHandler } from './proxy/auth-proxy-request-handler';

import type { HttpMethod, ProxyConfig, ProxyContext, ProxyHandler, ProxyRequest } from './types';

function createHandler(method: HttpMethod, handler: AuthProxyRequestHandler): ProxyHandler {
  return (request: ProxyRequest, context: ProxyContext) =>
    handler.handle({
      request,
      context,
      method,
    });
}

export function createProxyHandlers(config: ProxyConfig) {
  const handler = new AuthProxyRequestHandler(normalizeConfig(config));

  return {
    GET: createHandler('GET', handler),
    POST: createHandler('POST', handler),
    PUT: createHandler('PUT', handler),
    PATCH: createHandler('PATCH', handler),
    DELETE: createHandler('DELETE', handler),
  };
}
