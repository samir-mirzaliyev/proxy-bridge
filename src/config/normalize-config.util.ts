import { assertSupportedConfig } from './assert-supported-config.util';
import { normalizeEndpointPatterns } from './endpoint-patterns.util';
import { HOP_BY_HOP_HEADERS } from '../request/headers/request-header.constants';

import type {
  AccessTokenSender,
  NormalizedAccessTokenSender,
  NormalizedProxyConfig,
  NormalizedRefreshTokenDelivery,
  ProxyConfig,
  RefreshTokenDelivery,
} from '../types';

const DEFAULT_REFRESH_BODY_KEY = 'refreshToken';
const DEFAULT_REFRESH_HEADER_NAME = 'X-Refresh-Token';
const DEFAULT_ACCESS_HEADER_NAME = 'Authorization';
const DEFAULT_ACCESS_SCHEME = 'Bearer';

function normalizeAccessTokenSender(send?: AccessTokenSender): NormalizedAccessTokenSender {
  if (send === false || typeof send === 'function') {
    return send;
  }

  return {
    in: 'header',
    name: send?.name ?? DEFAULT_ACCESS_HEADER_NAME,
    scheme: send?.scheme ?? DEFAULT_ACCESS_SCHEME,
  };
}

function normalizeDelivery(
  delivery: RefreshTokenDelivery,
  cookieName: string,
): NormalizedRefreshTokenDelivery {
  const [to] = normalizeEndpointPatterns([delivery.to]);

  if (delivery.in === 'body') {
    return { to, in: 'body', key: delivery.key ?? DEFAULT_REFRESH_BODY_KEY };
  }

  if (delivery.in === 'header') {
    return { to, in: 'header', name: delivery.name ?? DEFAULT_REFRESH_HEADER_NAME };
  }

  return { to, in: 'cookie', name: delivery.name ?? cookieName };
}

function normalizeRefreshDeliveries(config: ProxyConfig): NormalizedRefreshTokenDelivery[] {
  const configured = config.tokens.refresh.send ?? [];
  const refreshEndpoint = config.endpoints.refresh;
  const cookieName = config.tokens.refresh.cookie.name;
  const deliveries = configured.map((delivery) => normalizeDelivery(delivery, cookieName));
  const hasRefreshEndpoint = configured.some((delivery) => delivery.to === refreshEndpoint);

  if (hasRefreshEndpoint) {
    return deliveries;
  }

  return [...deliveries, { to: refreshEndpoint, in: 'body', key: DEFAULT_REFRESH_BODY_KEY }];
}

export function normalizeConfig(config: ProxyConfig): NormalizedProxyConfig {
  assertSupportedConfig(config);

  return {
    backendBaseUrl: config.backendBaseUrl,
    extractTokens: config.extractTokens,
    buildBackendUrl: config.buildBackendUrl,
    tokens: {
      access: {
        cookie: config.tokens.access.cookie,
        send: normalizeAccessTokenSender(config.tokens.access.send),
      },
      refresh: {
        cookie: config.tokens.refresh.cookie,
        send: normalizeRefreshDeliveries(config),
      },
    },
    endpoints: {
      refresh: config.endpoints.refresh,
      logout: config.endpoints.logout,
      issuesTokens: normalizeEndpointPatterns(config.endpoints.issuesTokens),
    },
    autoRefresh: {
      on: config.autoRefresh?.on ?? [401],
      buildRequest: config.autoRefresh?.buildRequest,
    },
    headers: {
      default: config.headers?.default ?? {},
      override: config.headers?.override ?? {},
      stripRequest: config.headers?.stripRequest ?? [
        ...Array.from(HOP_BY_HOP_HEADERS),
        'authorization',
      ],
      stripResponse: config.headers?.stripResponse ?? [
        ...Array.from(HOP_BY_HOP_HEADERS),
        'set-cookie',
      ],
    },
    response: {
      cacheControl: config.response?.cacheControl ?? 'no-store',
      sanitizeTokens: config.response?.sanitizeTokens ?? 'issuing-endpoints',
    },
    hooks: config.hooks ?? {},
  };
}
