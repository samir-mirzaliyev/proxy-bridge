import type { HttpMethod, ProxyRequest } from '../../types';

export async function getRequestBody(request: ProxyRequest, method: HttpMethod) {
  if (method === 'GET' || method === 'DELETE') {
    return undefined;
  }

  return request.arrayBuffer();
}
