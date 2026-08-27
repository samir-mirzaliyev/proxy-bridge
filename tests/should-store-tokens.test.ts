import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { shouldStoreTokens } from '../src/tokens/should-store-tokens.util';

describe('shouldStoreTokens', () => {
  it('matches backend paths against configured token endpoint patterns', () => {
    const config = normalizeConfig({
      backendBaseUrl: 'https://backend.test',
      tokens: {
        access: { cookie: { name: 'access_token' } },
        refresh: { cookie: { name: 'refresh_token' } },
      },
      endpoints: {
        refresh: 'auth/refresh',
        logout: 'auth/logout',
        issuesTokens: ['auth/login', /^profiles\/[^/]+\/activate$/],
      },
    });

    expect(shouldStoreTokens('auth/login', config)).toBe(true);
    expect(shouldStoreTokens('profiles/student/activate', config)).toBe(true);
    expect(shouldStoreTokens('auth/login/extra', config)).toBe(false);
    expect(shouldStoreTokens('users/me', config)).toBe(false);
  });
});
