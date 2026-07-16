# ProxyBridge

Reusable Next.js App Router proxy for token-based backend APIs.

The package is useful when the browser should not store or read auth tokens.
Requests go through a Next.js route handler, tokens are stored in `httpOnly`
cookies, and the proxy forwards authenticated requests to the backend.

```txt
Browser -> Next.js /api/[...proxy] -> Backend API
```

## What It Does

- Stores access and refresh tokens in `httpOnly` cookies.
- Forwards client API requests to your backend.
- Adds the access token to backend requests.
- Refreshes the access token when the backend returns an auth error.
- Retries the failed request after a successful refresh.
- Clears cookies on logout, or when a refresh is attempted and fails — not on a plain `401` for a request that had no refresh token.
- Removes token values from auth responses before returning data to the browser.

## Installation

```bash
npm install proxy-bridge
```

For local development:

```bash
npm install ./proxy-bridge
```

## Basic Usage

Create a shared ProxyBridge instance:

```ts
// src/proxy-bridge.ts
import { createProxyBridge } from 'proxy-bridge';

export const proxyBridge = createProxyBridge({
  appUrl: process.env.APP_URL!,
  backendBaseUrl: 'https://backend.example.com/v1',
  cookies: {
    access: {
      name: 'access_token',
      maxAge: 60 * 60,
    },
    refresh: {
      name: 'refresh_token',
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  auth: {
    refreshEndpoint: 'auth/refresh',
    logoutEndpoint: 'auth/logout',
    tokenEndpointPatterns: [/^auth\/login$/, /^auth\/refresh$/],
  },
});
```

Use it in a catch-all API route:

```ts
// src/app/api/[...proxy]/route.ts
import { proxyBridge } from '@/proxy-bridge';

export const { GET, POST, PUT, PATCH, DELETE } = proxyBridge.handlers;
```

Then call your API through the Next.js route:

```ts
await fetch('/api/users/me');
await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
```

Default URL mapping:

```txt
/api/users/me -> https://backend.example.com/v1/users/me
```

## CSR and SSR Usage

### CSR with TanStack Query

```ts
import { useQuery } from '@tanstack/react-query';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/users/me', {
        credentials: 'include',
      });

      return response.json();
    },
  });
}
```

### SSR

```ts
import { proxyBridge } from '@/proxy-bridge';

export async function getProfile() {
  const response = await proxyBridge.fetch('/users/me', {
    cache: 'no-store',
  });

  return response.json();
}
```

## createProxyBridge Parameters

### `appUrl`

The public URL of your Next.js application. It is used by `proxyBridge.fetch`
when making SSR requests to your internal proxy route.

```ts
appUrl: 'https://app.example.com'
```

Default: no default, required.

### `routePrefix`

The internal route prefix where your catch-all proxy route is mounted.

```ts
routePrefix: '/api'
```

Default: `'/api'`

### `backendBaseUrl`

Backend API base URL.

```ts
backendBaseUrl: 'https://backend.example.com'
```

Required by default. Optional if `buildBackendUrl` is provided.

Default: `undefined`

### `cookies`

Cookie configuration for access and refresh tokens.

```ts
cookies: {
  access: {
    name: 'access_token',
    maxAge: 3600,
  },
  refresh: {
    name: 'refresh_token',
    maxAge: 604800,
  },
}
```

Cookie options:

```ts
{
  name: string;
  maxAge?: number;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}
```

Defaults:

```ts
{
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}
```

### `auth`

Auth endpoint and access-token forwarding configuration.

```ts
auth: {
  refreshEndpoint: 'auth/refresh',
  logoutEndpoint: 'auth/logout',
  tokenEndpointPatterns: [/^auth\/login$/],
}
```

Options:

```ts
{
  refreshEndpoint: string;
  logoutEndpoint: string;
  tokenEndpointPatterns: RegExp[];
  authHeader?: false | ((context) => HeadersInit);
}
```

Defaults:

```ts
authHeader: ({ accessToken }) => ({
  Authorization: `Bearer ${accessToken}`,
})
```

Custom access token header:

```ts
auth: {
  refreshEndpoint: 'auth/refresh',
  logoutEndpoint: 'auth/logout',
  tokenEndpointPatterns: [/^auth\/login$/],
  authHeader: ({ accessToken }) => ({
    'X-Access-Token': accessToken,
  }),
}
```

Disable access token forwarding:

```ts
authHeader: false
```

### `refresh`

Controls when and how refresh token requests are sent.

```ts
refresh: {
  statusCodes: [401],
  tokenTransport: 'body',
  tokenBodyKey: 'refreshToken',
}
```

Options:

```ts
{
  statusCodes?: number[];
  tokenTransport?: 'body' | 'header' | 'cookie';
  tokenBodyKey?: string;
  tokenHeaderName?: string;
  tokenCookieName?: string;
  buildRequest?: (context) => RequestInit;
}
```

Defaults:

```ts
{
  statusCodes: [401],
  tokenTransport: 'body',
  tokenBodyKey: 'refreshToken',
  tokenHeaderName: 'X-Refresh-Token',
  tokenCookieName: cookies.refresh.name,
}
```

Refresh on multiple status codes:

```ts
refresh: {
  statusCodes: [401, 419],
}
```

Send refresh token in a header:

```ts
refresh: {
  tokenTransport: 'header',
  tokenHeaderName: 'X-Refresh-Token',
}
```

Send refresh token as a cookie header:

```ts
refresh: {
  tokenTransport: 'cookie',
  tokenCookieName: 'refresh_token',
}
```

Use a fully custom refresh request:

```ts
refresh: {
  buildRequest: ({ refreshToken }) => ({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: refreshToken }),
    cache: 'no-store',
  }),
}
```

### `defaultHeaders`

Headers added only when the incoming request does not already contain them.

```ts
defaultHeaders: {
  'Accept-Language': 'az',
}
```

Default: `{}`

### `overrideHeaders`

Headers that always override incoming request headers.

```ts
overrideHeaders: {
  'Accept-Language': 'az',
}
```

Default: `{}`

### `stripRequestHeaders`

Request headers that should not be forwarded to the backend.

```ts
stripRequestHeaders: ['cookie', 'host']
```

Default: hop-by-hop headers plus browser cookies.

### `stripResponseHeaders`

Response headers that should not be returned to the browser.

```ts
stripResponseHeaders: ['set-cookie']
```

Default: hop-by-hop headers plus `set-cookie`.

### `responseCacheControl`

`Cache-Control` value stamped on every proxied response. Because the proxy
serves per-user, authenticated data, responses must not be cached by the browser
or intermediaries — a cached copy can be replayed on a back/forward navigation
without revalidation and show stale data. When set, the proxy also drops the
`etag`, `last-modified`, `expires`, `pragma`, and `age` headers so no cached copy
can be revalidated into use.

```ts
responseCacheControl: 'no-store'
```

Default: `'no-store'`. Set to `false` to forward the backend's own
`Cache-Control` (and cache validators) unchanged.

### `extractTokens`

Custom token extractor for backend responses.

Default supported response shapes:

```ts
{
  accessToken: string;
  refreshToken: string;
}
```

or:

```ts
{
  data: {
    accessToken: string;
    refreshToken: string;
  }
}
```

Custom example:

```ts
extractTokens: (payload) => {
  const response = payload as {
    tokens?: {
      access?: string;
      refresh?: string;
    };
  };

  return {
    accessToken: response.tokens?.access,
    refreshToken: response.tokens?.refresh,
  };
}
```

Default: built-in extractor.

### `sanitizeTokenResponse`

Controls whether token values are removed from JSON responses.

```ts
sanitizeTokenResponse: 'auth-endpoints'
```

Options:

```ts
false | true | 'auth-endpoints' | 'all-json' | ((context) => unknown)
```

Defaults:

```ts
'auth-endpoints'
```

Meaning:

- `auth-endpoints`: sanitize only endpoints matching `tokenEndpointPatterns`
- `all-json`: sanitize all JSON responses
- `true`: same as `all-json`
- `false`: do not sanitize
- function: use custom sanitizer

### `buildBackendUrl`

Custom backend URL builder.

Use this when the default URL format is not enough.

```ts
buildBackendUrl: ({ request, backendPath }) => {
  const url = new URL(`https://gateway.example.com/internal/${backendPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url;
}
```

Default:

```ts
`${backendBaseUrl}/${backendPath}`
```

### `buildRefreshRequest`

Top-level custom refresh request builder.

```ts
buildRefreshRequest: ({ refreshToken }) => ({
  method: 'POST',
  body: JSON.stringify({ refreshToken }),
  cache: 'no-store',
})
```

Prefer `refresh.buildRequest` for new code.

Default: `undefined`

## Notes

- The main public API is `createProxyBridge`.
- The package is designed for Next.js App Router route handlers.
- Tokens are stored in `httpOnly` cookies by default.
- Access token forwarding defaults to `Authorization: Bearer <token>`.
- Refresh requests default to `401` responses.
- Concurrent refresh calls are locked, so multiple failed requests share one refresh request.
