import { matchesEndpointPattern } from '../../config/endpoint-patterns.util';

import type { NormalizedProxyConfig, NormalizedRefreshTokenDelivery } from '../../types';

type ForwardedRefreshTokenDelivery = Exclude<NormalizedRefreshTokenDelivery, { in: 'body' }>;

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
 * The same lookup for relayed requests, which can only carry headers — the proxy does not rewrite a
 * forwarded body, so a `body` row resolves to nothing here.
 */
export function resolveForwardedRefreshTokenDelivery(
  backendPath: string,
  config: NormalizedProxyConfig,
): ForwardedRefreshTokenDelivery | undefined {
  const delivery = resolveRefreshTokenDelivery(backendPath, config);

  return delivery && delivery.in !== 'body' ? delivery : undefined;
}
