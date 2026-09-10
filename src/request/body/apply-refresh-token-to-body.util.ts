import { resolveForwardedRefreshTokenDelivery } from '../auth/resolve-refresh-token-delivery.util';

import type { NormalizedProxyConfig } from '../../types';

function parseJsonObject(body?: ArrayBuffer): Record<string, unknown> {
  if (!body || body.byteLength === 0) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Merges the refresh token into the forwarded body when `tokens.refresh.send` places it there for
 * this backend path. The existing body is parsed as JSON and re-serialized with the token added —
 * an unparsable or missing body is treated as `{}`, so the key still reaches the backend. Paths
 * without a `body` delivery (or without a body to begin with, e.g. GET/DELETE) are returned
 * untouched.
 */
export function applyRefreshTokenToBody({
  backendPath,
  body,
  refreshToken,
  config,
}: {
  backendPath: string;
  body?: ArrayBuffer;
  refreshToken?: string;
  config: NormalizedProxyConfig;
}): ArrayBuffer | undefined {
  if (!refreshToken || body === undefined) {
    return body;
  }

  const delivery = resolveForwardedRefreshTokenDelivery(backendPath, config);

  if (!delivery || delivery.in !== 'body') {
    return body;
  }

  const merged = { ...parseJsonObject(body), [delivery.key]: refreshToken };

  return new TextEncoder().encode(JSON.stringify(merged)).buffer;
}
