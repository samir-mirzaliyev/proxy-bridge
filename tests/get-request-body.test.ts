import { describe, expect, it } from 'vitest';

import { getRequestBody } from '../src/request/body/get-request-body.util';

describe('getRequestBody', () => {
  it('does not read bodies for GET and DELETE requests', async () => {
    const request = new Request('https://app.test/api/users', {
      method: 'GET',
    }) as Request & { nextUrl: URL };

    await expect(getRequestBody(request, 'GET')).resolves.toBeUndefined();
    await expect(getRequestBody(request, 'DELETE')).resolves.toBeUndefined();
  });

  it('returns an ArrayBuffer for writable request methods', async () => {
    const request = new Request('https://app.test/api/users', {
      method: 'POST',
      body: 'hello',
    }) as Request & { nextUrl: URL };

    const body = await getRequestBody(request, 'POST');

    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(body)).toBe('hello');
  });
});
