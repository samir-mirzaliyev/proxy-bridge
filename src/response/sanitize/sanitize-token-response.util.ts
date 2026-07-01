export function sanitizeTokenResponse<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sanitizeTokenResponse) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      if (key === 'accessToken' || key === 'refreshToken') {
        return [];
      }

      return [[key, sanitizeTokenResponse(entry)]];
    }),
  ) as T;
}
