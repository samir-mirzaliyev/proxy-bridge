import type { AuthTokens } from '../types';

export function defaultExtractTokens(payload: unknown): AuthTokens {
  const responseData =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data?: unknown }).data
      : payload;

  if (!responseData || typeof responseData !== 'object') {
    return {};
  }

  const tokens = responseData as { accessToken?: unknown; refreshToken?: unknown };

  return {
    accessToken: typeof tokens.accessToken === 'string' ? tokens.accessToken : undefined,
    refreshToken: typeof tokens.refreshToken === 'string' ? tokens.refreshToken : undefined,
  };
}

export function extractTokens(payload: unknown, extractor = defaultExtractTokens) {
  return extractor(payload);
}
