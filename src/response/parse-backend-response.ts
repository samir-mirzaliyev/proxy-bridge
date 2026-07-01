import { resolveSanitizedPayload } from './sanitize/resolve-sanitized-payload';

import type { NormalizedProxyConfig, ParsedBackendResponse } from '../types';

export async function parseBackendResponse(
  response: Response,
  config: NormalizedProxyConfig,
  backendPath: string,
): Promise<ParsedBackendResponse> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);
    const sanitizedPayload = resolveSanitizedPayload({ payload, backendPath, config });

    return {
      body: JSON.stringify(sanitizedPayload),
      contentType: 'application/json',
      payload,
    };
  }

  return {
    body: await response.arrayBuffer(),
    contentType,
    payload: null,
  };
}
