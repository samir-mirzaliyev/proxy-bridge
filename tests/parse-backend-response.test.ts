import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { parseBackendResponse } from '../src/response/parse-backend-response';

function createConfig() {
  return normalizeConfig({
    backendBaseUrl: 'https://backend.test',
    tokens: {
      access: { cookie: { name: 'access_token' } },
      refresh: { cookie: { name: 'refresh_token' } },
    },
    endpoints: {
      refresh: 'auth/refresh',
      logout: 'auth/logout',
      issuesTokens: [/^auth\/login$/],
    },
  });
}

describe('parseBackendResponse', () => {
  it('parses JSON responses and returns sanitized body separately from original payload', async () => {
    const parsed = await parseBackendResponse(
      Response.json({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 1 },
      }),
      createConfig(),
      'auth/login',
    );

    expect(parsed.contentType).toBe('application/json');
    expect(JSON.parse(parsed.body as string)).toEqual({ user: { id: 1 } });
    expect(parsed.payload).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1 },
    });
  });

  it('returns ArrayBuffer bodies for non-JSON responses', async () => {
    const parsed = await parseBackendResponse(
      new Response('plain text', {
        headers: {
          'content-type': 'text/plain',
        },
      }),
      createConfig(),
      'files/readme',
    );

    expect(parsed.contentType).toBe('text/plain');
    expect(parsed.payload).toBeNull();
    expect(new TextDecoder().decode(parsed.body as ArrayBuffer)).toBe('plain text');
  });
});
