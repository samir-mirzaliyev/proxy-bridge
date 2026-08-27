import type { NormalizedRefreshTokenDelivery } from '../../types';

type HeaderPlacement = Exclude<NormalizedRefreshTokenDelivery, { in: 'body' }>;

/**
 * Writes a token into headers. The `Cookie` header is built from scratch rather than appended to —
 * the inbound cookie header is stripped before this runs, so only this one cookie reaches the
 * backend.
 */
export function applyTokenPlacement(headers: Headers, placement: HeaderPlacement, token: string) {
  if (placement.in === 'header') {
    headers.set(placement.name, token);
    return;
  }

  headers.set('Cookie', `${placement.name}=${encodeURIComponent(token)}`);
}
