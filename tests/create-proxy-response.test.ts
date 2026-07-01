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
        cookies: {
          access: { name: 'access_token' },
          refresh: { name: 'refresh_token' },
        },
        auth: {
          refreshEndpoint: 'auth/refresh',
          logoutEndpoint: 'auth/logout',
          tokenEndpointPatterns: [],
        },
      }),
    });

    expect(response.status).toBe(422);
    expect(response.statusText).toBe('Unprocessable Entity');
    expect(response.headers.get('x-request-id')).toBe('123');
    await expect(response.json()).resolves.toEqual({ message: 'Invalid' });
  });
});
