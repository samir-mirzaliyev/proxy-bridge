import { matchesEndpointPattern } from '../../config/endpoint-patterns.util';

import type { NormalizedProxyConfig, NormalizedRefreshTokenDelivery } from '../../types';

/** Returns the first `tokens.refresh.send` row matching the backend path, if any. */
export function resolveRefreshTokenDelivery(
  backendPath: string,
  config: NormalizedProxyConfig,
): NormalizedRefreshTokenDelivery | undefined {
  return config.tokens.refresh.send.find((delivery) =>
    matchesEndpointPattern(backendPath, [delivery.to]),
  );
}

/**
 * The same lookup for relayed requests. A `body` row targeting `endpoints.refresh` resolves to
 * nothing here — that request is built by `TokenRefreshService` itself, never relayed. A `body`
 * row targeting any other endpoint resolves normally; the relay path merges the token into the
 * forwarded JSON body instead of a header (see `applyRefreshTokenToBody`).
 */
export function resolveForwardedRefreshTokenDelivery(
  backendPath: string,
  config: NormalizedProxyConfig,
): NormalizedRefreshTokenDelivery | undefined {
  const delivery = resolveRefreshTokenDelivery(backendPath, config);

  if (!delivery) {
    return undefined;
  }

  const isRefreshEndpointRequest = backendPath === config.endpoints.refresh;

  return delivery.in === 'body' && isRefreshEndpointRequest ? undefined : delivery;
}
