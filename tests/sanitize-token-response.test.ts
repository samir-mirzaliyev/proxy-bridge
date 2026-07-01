import { describe, expect, it } from 'vitest';

import { sanitizeTokenResponse } from '../src/response/sanitize/sanitize-token-response.util';

describe('sanitizeTokenResponse', () => {
  it('removes nested access and refresh tokens', () => {
    expect(
      sanitizeTokenResponse({
        data: {
          accessToken: 'access',
          refreshToken: 'refresh',
          user: {
            name: 'Samir',
            accessToken: 'nested',
          },
        },
      }),
    ).toEqual({
      data: {
        user: {
          name: 'Samir',
        },
      },
    });
  });
});
