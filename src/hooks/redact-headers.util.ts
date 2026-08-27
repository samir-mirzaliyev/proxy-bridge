const CREDENTIAL_HEADERS = new Set(['authorization', 'cookie', 'set-cookie']);

const REDACTED = '<redacted>';

/**
 * Turns headers into a plain object with credential values masked, so hook output can be logged
 * safely. Header names are preserved, so `cookie: '<redacted>'` still answers "was it attached?".
 */
export function redactHeaders(headers: Headers): Record<string, string> {
  const redacted: Record<string, string> = {};

  headers.forEach((value, key) => {
    redacted[key] = CREDENTIAL_HEADERS.has(key.toLowerCase()) ? REDACTED : value;
  });

  return redacted;
}
