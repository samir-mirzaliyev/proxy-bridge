import { normalizeConfig } from './config/normalize-config.util';
import { createProxyHandlers } from './create-proxy-handlers';
import { createServerProxyFetch } from './server/create-server-proxy-fetch';

import type { ProxyBridge, ProxyBridgeConfig } from './types';

export function createProxyBridge(config: ProxyBridgeConfig): ProxyBridge {
  const normalizedConfig = normalizeConfig(config);

  return {
    handlers: createProxyHandlers(normalizedConfig),
    fetch: createServerProxyFetch({
      appUrl: config.appUrl,
      routePrefix: config.routePrefix ?? '/api',
    }),
  };
}
