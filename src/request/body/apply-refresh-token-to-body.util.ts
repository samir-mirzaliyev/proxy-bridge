import { resolveForwardedRefreshTokenDelivery } from '../auth/resolve-refresh-token-delivery.util';

import type { NormalizedProxyConfig, RefreshTokenBodyResult } from '../../types';

/**
 * Parses a forwarded body as a JSON object. An empty body counts as `{}` — a `POST` sent without
 * one still arrives here as a zero-length buffer. Anything that is not a JSON object (multipart,
 * urlencoded, a bare array or scalar, binary) yields `undefined`, which keeps that body untouched.
 */
function parseJsonObject(body: ArrayBuffer): Record<string, unknown> | undefined {
  if (body.byteLength === 0) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Merges the refresh token into the forwarded body when `tokens.refresh.send` places it there for
 * this backend path, re-serializing the result as JSON.
 *
 * Only a JSON object body — or an empty one — is rewritten. A body the proxy cannot parse as a JSON
 * object is forwarded byte for byte with no token attached, because merging would mean discarding
 * the caller's payload; the same goes for `GET`/`DELETE`, which have no body to merge into. The
 * returned `isMerged` is the single answer both this rewrite and the `Content-Type` header depend
 * on, so the two can never disagree.
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
}): RefreshTokenBodyResult {
  if (!refreshToken || body === undefined) {
    return { body, isMerged: false };
  }

  const delivery = resolveForwardedRefreshTokenDelivery(backendPath, config);

  if (!delivery || delivery.in !== 'body') {
    return { body, isMerged: false };
  }

  const parsedBody = parseJsonObject(body);

  if (!parsedBody) {
    return { body, isMerged: false };
  }

  const merged = { ...parsedBody, [delivery.key]: refreshToken };

  return { body: new TextEncoder().encode(JSON.stringify(merged)).buffer, isMerged: true };
}
