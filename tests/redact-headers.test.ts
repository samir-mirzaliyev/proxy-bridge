import { describe, expect, it } from 'vitest';

import { redactHeaders } from '../src/hooks/redact-headers.util';

describe('redactHeaders', () => {
  it('masks credential values but keeps their header names', () => {
    const headers = new Headers({
      Authorization: 'Bearer secret-access-token',
      Cookie: 'refresh_token=secret-refresh-token',
      'Accept-Language': 'az',
    });

    expect(redactHeaders(headers)).toEqual({
      authorization: '<redacted>',
      cookie: '<redacted>',
      'accept-language': 'az',
    });
  });

  it('returns an empty object for empty headers', () => {
    expect(redactHeaders(new Headers())).toEqual({});
  });
});
