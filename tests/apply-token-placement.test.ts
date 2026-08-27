import { describe, expect, it } from 'vitest';

import { applyTokenPlacement } from '../src/request/headers/apply-token-placement.util';

describe('applyTokenPlacement', () => {
  it('writes the token into the configured header', () => {
    const headers = new Headers();

    applyTokenPlacement(headers, { to: 'auth/refresh', in: 'header', name: 'X-RT' }, 'token');

    expect(headers.get('X-RT')).toBe('token');
    expect(headers.get('Cookie')).toBeNull();
  });

  it('writes a single cookie and percent-encodes the value', () => {
    const headers = new Headers();

    applyTokenPlacement(headers, { to: 'auth/refresh', in: 'cookie', name: 'session' }, 'a b/c');

    expect(headers.get('Cookie')).toBe('session=a%20b%2Fc');
  });

  it('replaces an existing cookie header instead of appending to it', () => {
    const headers = new Headers({ Cookie: 'ss_v2=abc; access_token=stale' });

    applyTokenPlacement(
      headers,
      { to: 'auth/refresh', in: 'cookie', name: 'refresh_token' },
      'token',
    );

    expect(headers.get('Cookie')).toBe('refresh_token=token');
  });
});
