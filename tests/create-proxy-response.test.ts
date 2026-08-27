import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { createProxyResponse } from '../src/response/create-proxy-response';

describe('createProxyResponse', () => {
  it('creates a NextResponse with backend status and parsed body', async () => {
    const response = createProxyResponse({
      backendResponse: new Response('backend error', {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {
          'x-request-id': '123',
        },
      }),
      parsedResponse: {
        body: JSON.stringify({ message: 'Invalid' }),
        contentType: 'application/json',
        payload: { message: 'Invalid' },
      },
      config: normalizeConfig({
        backendBaseUrl: 'https://backend.test',
        tokens: {
          access: { cookie: { name: 'access_token' } },
          refresh: { cookie: { name: 'refresh_token' } },
        },
        endpoints: {
          refresh: 'auth/refresh',
          logout: 'auth/logout',
          issuesTokens: [],
        },
      }),
    });

    expect(response.status).toBe(422);
    expect(response.statusText).toBe('Unprocessable Entity');
    expect(response.headers.get('x-request-id')).toBe('123');
    await expect(response.json()).resolves.toEqual({ message: 'Invalid' });
  });

  it('sets an exact Content-Length from the re-serialized body byte length', () => {
    const body = JSON.stringify({ message: 'çığöş' });
    const response = createProxyResponse({
      backendResponse: new Response(null, { status: 200 }),
      parsedResponse: { body, contentType: 'application/json', payload: null },
      config: normalizeConfig({
        backendBaseUrl: 'https://backend.test',
        tokens: {
          access: { cookie: { name: 'access_token' } },
          refresh: { cookie: { name: 'refresh_token' } },
        },
        endpoints: {
          refresh: 'auth/refresh',
          logout: 'auth/logout',
          issuesTokens: [],
        },
      }),
    });

    // Multi-byte chars: byte length must come from the encoded bytes, not string length.
    expect(response.headers.get('content-length')).toBe(
      String(new TextEncoder().encode(body).byteLength),
    );
    expect(response.headers.get('transfer-encoding')).toBeNull();
  });
});
