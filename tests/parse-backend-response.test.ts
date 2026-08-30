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

  it('returns a stream body for non-JSON responses instead of buffering it', async () => {
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
    expect(parsed.body).toBeInstanceOf(ReadableStream);
    expect(await new Response(parsed.body).text()).toBe('plain text');
  });

  it('returns a null body for non-JSON responses with no content', async () => {
    const parsed = await parseBackendResponse(
      new Response(null, { status: 204 }),
      createConfig(),
      'files/readme',
    );

    expect(parsed.payload).toBeNull();
    expect(parsed.body).toBeNull();
  });
});
