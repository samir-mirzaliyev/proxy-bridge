import { describe, expect, it } from 'vitest';

import { defaultExtractTokens } from '../src/tokens/extract-tokens.util';

describe('defaultExtractTokens', () => {
  it('extracts tokens from a top-level response', () => {
    expect(
      defaultExtractTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    ).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('extracts tokens from a data response', () => {
    expect(
      defaultExtractTokens({
        data: {
          accessToken: 'access',
          refreshToken: 'refresh',
        },
      }),
    ).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('ignores non-string token values', () => {
    expect(
      defaultExtractTokens({
        data: {
          accessToken: 1,
          refreshToken: null,
        },
      }),
    ).toEqual({});
  });
});
