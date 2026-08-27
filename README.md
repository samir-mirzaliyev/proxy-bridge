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
- Forwards the refresh token to the specific endpoints that need it, and to no others.
- Strips the client's `cookie` and `authorization` headers, so the proxy is the only source of
  credentials the backend sees.
- Emits lifecycle hooks so you can see what the proxy sends without patching `fetch`.

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
  tokens: {
    access: { cookie: { name: 'access_token', maxAge: 60 * 60 } },
    refresh: { cookie: { name: 'refresh_token', maxAge: 60 * 60 * 24 * 7 } },
  },
  endpoints: {
    refresh: 'auth/refresh',
    logout: 'auth/logout',
    issuesTokens: ['auth/login', 'auth/refresh'],
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

Every option, with its default:

```ts
createProxyBridge({
  // Where the app and the backend live
  appUrl: 'https://app.example.com',            // required
  backendBaseUrl: 'https://api.example.com/v1',
  routePrefix: '/api',                          // default '/api'

  // Tokens: where each is stored, and how it reaches the backend
  tokens: {
    access: {
      cookie: { name: 'access_token', maxAge: 86400 },                 // required
      send: { in: 'header', name: 'Authorization', scheme: 'Bearer' }, // default
    },
    refresh: {
      cookie: { name: 'refresh_token', maxAge: 2592000 },              // required
      send: [{ to: 'profiles/generate-token', in: 'cookie' }],
      // 'auth/refresh' not listed -> { in: 'body', key: 'refreshToken' }
    },
  },

  // Which endpoints are special
  endpoints: {
    refresh: 'auth/refresh',                                   // required
    logout: 'auth/logout',                                     // required
    issuesTokens: ['auth/login', /^auth\/oauth\/[^/]+$/],      // required
  },

  // The refresh the proxy performs on its own
  autoRefresh: {
    on: [401],                    // default
    buildRequest: undefined,
  },

  // Headers
  headers: {
    default: {},
    override: { 'Accept-Language': 'az' },
    stripRequest: [/* hop-by-hop, plus 'cookie' and 'authorization' */],
    stripResponse: [/* hop-by-hop, plus 'set-cookie' */],
  },

  // Response handling
  response: {
    cacheControl: 'no-store',              // default
    sanitizeTokens: 'issuing-endpoints',   // default
  },

  // Observability
  hooks: {
    onBackendRequest: ({ backendPath, headers, isRetry }) => {},
    onBackendResponse: ({ backendPath, status, isRetry }) => {},
    onRefresh: ({ backendPath, outcome }) => {},
    onTokensStored: ({ backendPath, source, hasAccessToken, hasRefreshToken }) => {},
    onCookiesCleared: ({ backendPath, reason }) => {},
  },

  // Escape hatches
  extractTokens: undefined,
  buildBackendUrl: undefined,
});
```

### Endpoint patterns

`endpoints.issuesTokens` and `tokens.refresh.send[].to` accept strings and regular expressions. A
string must equal the backend path exactly; use a regular expression for anything else:

```ts
issuesTokens: [
  'auth/login',              // matches only 'auth/login'
  /^auth\/oauth\/[^/]+$/,    // matches 'auth/oauth/google'
]
```

Patterns are tested against the backend path only — the catch-all segments joined with `/`, with no
leading slash and no query string. `/api/auth/login?next=/home` is matched as `auth/login`.

The `g` and `y` flags are stripped during normalization. Those flags make `RegExp.test` advance
`lastIndex`, and pattern objects live for the lifetime of the process, so a stateful pattern would
otherwise match on every other request.

### Token placement

Wherever a token has to be put into a request, the same shape describes it — the answer to "where"
is always `in`:

```ts
{ in: 'header', name: 'X-Refresh-Token' }
{ in: 'cookie', name: 'refresh_token' }
{ in: 'body',   key:  'refreshToken' }     // only tokens.refresh.send accepts this
```

Fields that do not apply to a placement are not part of its type, so `{ in: 'body', name: 'x' }`
does not compile.


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

### `tokens`

Where each token is stored, and how it reaches the backend.

```ts
tokens: {
  access: {
    cookie: { name: 'access_token', maxAge: 3600 },
    send: { in: 'header', name: 'Authorization', scheme: 'Bearer' },
  },
  refresh: {
    cookie: { name: 'refresh_token', maxAge: 604800 },
    send: [{ to: 'profiles/generate-token', in: 'cookie' }],
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

Cookie defaults:

```ts
{
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}
```

#### `tokens.access.send`

Default: `{ in: 'header', name: 'Authorization', scheme: 'Bearer' }`.

Use a different header, without a scheme prefix:

```ts
send: { in: 'header', name: 'X-Access-Token', scheme: false }
```

Never send the access token:

```ts
send: false
```

Full control:

```ts
send: ({ accessToken }) => ({ 'X-Access-Token': accessToken })
```

#### `tokens.refresh.send`

Which endpoints receive the refresh token, and where it is placed for each.

```ts
send: [
  { to: 'auth/refresh', in: 'body', key: 'refreshToken' },
  { to: 'profiles/generate-token', in: 'cookie' },
]
```

Rules:

- **First match wins.** `to` is matched like any other endpoint pattern — a string must equal the
  backend path exactly, a regular expression is tested against it.
- **The refresh endpoint is implicit.** When `endpoints.refresh` is not listed, it gets
  `{ in: 'body', key: 'refreshToken' }`. Most configs never write this row.
- **Listing an endpoint enables forwarding for it.** Any row other than `endpoints.refresh` makes
  the proxy attach the refresh token to relayed requests for that path.
- **`body` is only valid for `endpoints.refresh`.** The proxy builds that request itself; a relayed
  request can only carry extra headers. The type rejects this, and normalization rejects it again
  in case `endpoints.refresh` is not a literal.
- **`name` defaults to `tokens.refresh.cookie.name`** for a `cookie` row, and to `X-Refresh-Token`
  for a `header` row.
- Only the refresh token is sent. The inbound `Cookie` header is stripped first and rebuilt from
  scratch, so the rest of the browser's cookie jar never reaches the backend.
- If a client calls the refresh endpoint directly, that request is relayed and its row is a `body`
  row, so no token is attached. The proxy's own automatic refresh does not go through this path.

**When you need a forwarding row.** Only when the backend cannot determine the current session's
expiry on its own. A backend that keeps server-side session state can look the session up from the
access token. A backend whose refresh token is self-contained — a JWT carrying its own `exp` — must
receive the token to inherit its remaining lifetime.

**Keep the list narrow.** Without a proxy you would scope a refresh cookie with
`Path=/auth/refresh`; behind a proxy that attribute resolves against your app, not the backend, so
this list is what replaces it. A catch-all like `[{ to: /.*/, in: 'cookie' }]` hands the credential
to every service behind the proxy — and to every access log that dumps request headers.

**There is no `body` placement for relayed requests.** Injecting into the body means parsing,
merging and re-serializing the forwarded `ArrayBuffer`, which would corrupt multipart and binary
payloads, and `GET`/`DELETE` requests have no body at all. If your backend reads the refresh token
from a JSON body on a relayed endpoint, use `{ in: 'header' }` and read the header instead.

### `endpoints`

Which backend endpoints get special treatment.

```ts
endpoints: {
  refresh: 'auth/refresh',
  logout: 'auth/logout',
  issuesTokens: ['auth/login', /^auth\/oauth\/[^/]+$/],
}
```

Options:

```ts
{
  refresh: string;
  logout: string;
  issuesTokens: (string | RegExp)[];
}
```

- `refresh` — the endpoint the proxy calls to renew tokens. Matched by exact equality.
- `logout` — clearing cookies is unconditional here. Matched by exact equality.
- `issuesTokens` — responses from these endpoints are scanned for tokens to store, and are
  sanitized before reaching the browser. This is an allowlist on purpose: scanning every response
  would let any endpoint that happens to return an `accessToken` field overwrite the user's session.

Default: no default, required.

### `autoRefresh`

The refresh the proxy performs on its own when a backend response says the access token expired.

```ts
autoRefresh: {
  on: [401],
}
```

Options:

```ts
{
  on?: number[];
  buildRequest?: (context) => RequestInit;
}
```

Defaults:

```ts
{
  on: [401],
}
```

Refresh on multiple status codes:

```ts
autoRefresh: { on: [401, 419] }
```

Use a fully custom refresh request:

```ts
autoRefresh: {
  buildRequest: ({ refreshToken }) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: refreshToken }),
    cache: 'no-store',
  }),
}
```

### `headers`

What happens to headers travelling in each direction.

```ts
headers: {
  override: { 'Accept-Language': 'az' },
}
```

Options:

```ts
{
  default?: Record<string, string>;   // set only when the request does not already have it
  override?: Record<string, string>;  // always set
  stripRequest?: string[];            // removed before forwarding to the backend
  stripResponse?: string[];           // removed before returning to the browser
}
```

Defaults:

```ts
{
  default: {},
  override: {},
  stripRequest: [/* hop-by-hop headers, plus 'cookie' and 'authorization' */],
  stripResponse: [/* hop-by-hop headers, plus 'set-cookie' */],
}
```

`stripRequest` drops two credential headers by default:

- **`cookie`** — this is why the browser's cookies never reach the backend, and why
  `tokens.refresh.send` exists for the endpoints that do need the refresh token.
- **`authorization`** — the proxy owns this header. Without stripping it, a client could set its own
  `Authorization` and have it forwarded whenever `tokens.access.send` writes to a different header
  name or is a custom function, since neither overwrites `Authorization`.

**Everything else the client sends is forwarded.** If your backend trusts any header for identity or
authorization — `X-User-Id`, `X-Api-Key`, an internal gateway header — add it to `stripRequest`,
otherwise a client can set it. Replacing the list replaces the defaults, so include `cookie` and
`authorization` yourself:

```ts
headers: {
  stripRequest: ['connection', 'host', 'cookie', 'authorization', 'x-internal-user'],
}
```

### `response`

How proxied responses are processed.

```ts
response: {
  cacheControl: 'no-store',
  sanitizeTokens: 'issuing-endpoints',
}
```

Options:

```ts
{
  cacheControl?: string | false;
  sanitizeTokens?: boolean | 'issuing-endpoints' | 'all-json' | ((context) => unknown);
}
```

Defaults:

```ts
{
  cacheControl: 'no-store',
  sanitizeTokens: 'issuing-endpoints',
}
```

#### `response.cacheControl`

`Cache-Control` value stamped on every proxied response. Because the proxy serves per-user,
authenticated data, responses must not be cached by the browser or intermediaries — a cached copy
can be replayed on a back/forward navigation without revalidation and show stale data. When set,
the proxy also drops the `etag`, `last-modified`, `expires`, `pragma`, and `age` headers so no
cached copy can be revalidated into use.

Set to `false` to forward the backend's own `Cache-Control` (and cache validators) unchanged.

#### `response.sanitizeTokens`

Whether token values are removed from JSON responses.

- `issuing-endpoints`: sanitize only paths matching `endpoints.issuesTokens`
- `all-json`: sanitize every JSON response
- `true`: same as `all-json`
- `false`: do not sanitize
- function: use a custom sanitizer

### `hooks`

Lifecycle callbacks for logging and debugging.

```ts
import { redactHeaders } from 'proxy-bridge';

hooks: {
  onBackendRequest: ({ method, backendPath, headers, isRetry }) => {
    console.log(method, backendPath, { isRetry, headers: redactHeaders(headers) });
  },
  onRefresh: ({ backendPath, outcome }) => console.log('refresh', backendPath, outcome),
}
```

Options:

```ts
{
  onBackendRequest?:  ({ method, url, backendPath, headers, isRetry }) => void;
  onBackendResponse?: ({ backendPath, status, isRetry }) => void;
  onRefresh?:         ({ backendPath, outcome }) => void;   // 'succeeded' | 'failed' | 'skipped'
  onTokensStored?:    ({ backendPath, source, hasAccessToken, hasRefreshToken }) => void;
  onCookiesCleared?:  ({ backendPath, reason }) => void;    // 'logout' | 'refresh-failed'
}
```

Default: `{}`

Rules:

- Hooks are **synchronous and fire-and-forget**. A returned promise is not awaited and a thrown
  error is swallowed, so a hook can never break a proxied request.
- **No hook receives a token value.** `onTokensStored` reports `hasAccessToken` /
  `hasRefreshToken` booleans instead. The one place credentials are reachable is
  `onBackendRequest.headers`, because "was the cookie attached?" cannot be answered otherwise —
  pass it through `redactHeaders` before logging it.

### `redactHeaders`

Exported alongside `createProxyBridge`. Turns headers into a plain object with `authorization`,
`cookie` and `set-cookie` values replaced by `<redacted>`, so hook output can be logged safely.
Header names are preserved, so `cookie: '<redacted>'` still answers "was it attached?".

```ts
import { redactHeaders } from 'proxy-bridge';

console.log(redactHeaders(headers));
// { authorization: '<redacted>', cookie: '<redacted>', 'accept-language': 'az' }
```

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

## Migrating from 0.x

`1.0.0` regrouped the config by token. Passing a `0.x` config throws at startup with the list of
keys to rename, rather than silently ignoring them.

Before:

```ts
createProxyBridge({
  appUrl,
  backendBaseUrl,
  cookies: {
    access: { name: 'access_token', maxAge: 86400 },
    refresh: { name: 'refresh_token', maxAge: 2592000 },
  },
  auth: {
    refreshEndpoint: 'auth/refresh',
    logoutEndpoint: 'auth/logout',
    tokenEndpointPatterns: [/^auth\/login$/],
    forwardRefreshToken: { patterns: ['profiles/generate-token'] },
  },
  refresh: { statusCodes: [401], tokenTransport: 'body', tokenBodyKey: 'refreshToken' },
  overrideHeaders: { 'Accept-Language': 'az' },
});
```

After:

```ts
createProxyBridge({
  appUrl,
  backendBaseUrl,
  tokens: {
    access: { cookie: { name: 'access_token', maxAge: 86400 } },
    refresh: {
      cookie: { name: 'refresh_token', maxAge: 2592000 },
      send: [{ to: 'profiles/generate-token', in: 'cookie' }],
    },
  },
  endpoints: {
    refresh: 'auth/refresh',
    logout: 'auth/logout',
    issuesTokens: ['auth/login'],
  },
  headers: { override: { 'Accept-Language': 'az' } },
});
```

| Removed | Replacement |
| --- | --- |
| `cookies.access` / `cookies.refresh` | `tokens.access.cookie` / `tokens.refresh.cookie` |
| `auth.refreshEndpoint` / `auth.logoutEndpoint` | `endpoints.refresh` / `endpoints.logout` |
| `auth.tokenEndpointPatterns` | `endpoints.issuesTokens` |
| `auth.forwardRefreshToken.*` | `tokens.refresh.send[]` |
| `auth.authHeader` | `tokens.access.send` |
| `refresh.statusCodes` | `autoRefresh.on` |
| `refresh.tokenTransport` / `tokenBodyKey` / `tokenHeaderName` / `tokenCookieName` | `tokens.refresh.send[]` |
| `refresh.buildRequest` / `buildRefreshRequest` | `autoRefresh.buildRequest` |
| `defaultHeaders` / `overrideHeaders` | `headers.default` / `headers.override` |
| `stripRequestHeaders` / `stripResponseHeaders` | `headers.stripRequest` / `headers.stripResponse` |
| `responseCacheControl` | `response.cacheControl` |
| `sanitizeTokenResponse` | `response.sanitizeTokens` |
| `sanitizeTokenResponse: 'auth-endpoints'` | `response.sanitizeTokens: 'issuing-endpoints'` |

Behaviour is unchanged. The refresh endpoint keeps its `{ in: 'body', key: 'refreshToken' }`
transport without being listed, so a config that never customized `refresh.tokenTransport` needs no
`tokens.refresh.send` entry for it.

## Notes

- The main public API is `createProxyBridge`.
- The package is designed for Next.js App Router route handlers.
- Tokens are stored in `httpOnly` cookies by default.
- Access token forwarding defaults to `Authorization: Bearer <token>` (`tokens.access.send`).
- Automatic refresh is triggered by `401` responses (`autoRefresh.on`).
- The browser's cookies are never forwarded to the backend. `tokens.refresh.send` is the one opt-in
  that lets the refresh token through, for the endpoints you name.
- Concurrent refresh calls are locked, so multiple failed requests share one refresh request.
