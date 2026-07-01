import { buildBackendUrl } from './build-backend-url.util';
import { createForwardHeaders } from '../headers/create-forward-headers';

import type { HttpMethod, NormalizedProxyConfig, ProxyRequest } from '../../types';

export class BackendRequestClient {
  constructor(private readonly config: NormalizedProxyConfig) {}

  send({
    request,
    method,
    backendPath,
    body,
    accessToken,
  }: {
    request: ProxyRequest;
    method: HttpMethod;
    backendPath: string;
    body?: ArrayBuffer;
    accessToken?: string;
  }) {
    return fetch(
      buildBackendUrl({
        request,
        backendPath,
        config: this.config,
      }),
      {
        method,
        headers: createForwardHeaders({ request, backendPath, accessToken, config: this.config }),
        body,
        cache: 'no-store',
      },
    );
  }
}
