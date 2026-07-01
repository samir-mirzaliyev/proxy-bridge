import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';
import { createResponseHeaders } from '../src/response/headers/create-response-headers';

describe('createResponseHeaders', () => {
  it('forwards allowed backend headers and strips configured headers', () => {
    const backendResponse = new Response('ok', {
      headers: {
        'content-type': 'text/plain',
        'x-request-id': '123',
        'set-cookie': 'access_token=value',
      },
    });

    const headers = createResponseHeaders({
      backendResponse,
      contentType: 'application/json',
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

    expect(headers.get('x-request-id')).toBe('123');
    expect(headers.get('set-cookie')).toBeNull();
    expect(headers.get('content-type')).toBe('application/json');
  });
});
