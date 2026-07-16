import { NextResponse } from 'next/server';

import { createResponseHeaders } from './headers/create-response-headers';

import type { NormalizedProxyConfig, ParsedBackendResponse } from '../types';

function getBodyByteLength(body: ParsedBackendResponse['body']): number | undefined {
  if (typeof body === 'string') {
    return new TextEncoder().encode(body).byteLength;
  }

  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }

  return undefined;
}

export function createProxyResponse({
  backendResponse,
  parsedResponse,
  config,
}: {
  backendResponse: Response;
  parsedResponse: ParsedBackendResponse;
  config: NormalizedProxyConfig;
}) {
  const headers = createResponseHeaders({
    backendResponse,
    contentType: parsedResponse.contentType,
    config,
  });

  const contentLength = getBodyByteLength(parsedResponse.body);

  if (contentLength !== undefined) {
    headers.set('content-length', String(contentLength));
  }

  return new NextResponse(parsedResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers,
  });
}
