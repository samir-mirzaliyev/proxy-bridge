import { HOP_BY_HOP_HEADERS } from '../request/headers/request-header.constants';

import type { NormalizedProxyConfig, ProxyConfig } from '../types';

export function normalizeConfig(config: ProxyConfig): NormalizedProxyConfig {
  return {
    ...config,
    refresh: {
      statusCodes: config.refresh?.statusCodes ?? [401],
      tokenTransport: config.refresh?.tokenTransport ?? 'body',
      tokenBodyKey: config.refresh?.tokenBodyKey ?? 'refreshToken',
      tokenHeaderName: config.refresh?.tokenHeaderName ?? 'X-Refresh-Token',
      tokenCookieName: config.refresh?.tokenCookieName ?? config.cookies.refresh.name,
      buildRequest: config.refresh?.buildRequest,
    },
    defaultHeaders: config.defaultHeaders ?? {},
    overrideHeaders: config.overrideHeaders ?? {},
    stripRequestHeaders: config.stripRequestHeaders ?? Array.from(HOP_BY_HOP_HEADERS),
    stripResponseHeaders: config.stripResponseHeaders ?? [...Array.from(HOP_BY_HOP_HEADERS), 'set-cookie'],
  };
}
