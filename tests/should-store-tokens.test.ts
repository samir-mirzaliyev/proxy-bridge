import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { shouldStoreTokens } from '../src/tokens/should-store-tokens.util';

describe('shouldStoreTokens', () => {
  it('matches backend paths against configured token endpoint patterns', () => {
    const config = normalizeConfig({
      backendBaseUrl: 'https://backend.test',
      cookies: {
        access: { name: 'access_token' },
        refresh: { name: 'refresh_token' },
      },
      auth: {
        refreshEndpoint: 'auth/refresh',
        logoutEndpoint: 'auth/logout',
        tokenEndpointPatterns: [/^auth\/login$/, /^profiles\/[^/]+\/activate$/],
      },
    });

    expect(shouldStoreTokens('auth/login', config)).toBe(true);
    expect(shouldStoreTokens('profiles/student/activate', config)).toBe(true);
    expect(shouldStoreTokens('users/me', config)).toBe(false);
  });
});
