import { NextResponse } from 'next/server';

import { createResponseHeaders } from './headers/create-response-headers';

import type { NormalizedProxyConfig, ParsedBackendResponse } from '../types';

export function createProxyResponse({
  backendResponse,
  parsedResponse,
  config,
}: {
  backendResponse: Response;
  parsedResponse: ParsedBackendResponse;
  config: NormalizedProxyConfig;
}) {
  return new NextResponse(parsedResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: createResponseHeaders({
      backendResponse,
      contentType: parsedResponse.contentType,
      config,
    }),
  });
}
