# Changelog

## 1.0.0

Breaking: the config is now grouped by token instead of by operation. Passing a 0.x config throws at startup listing every key to rename, because silently ignoring them would leave the token-issuing endpoint list empty — tokens would never be stored and auth would break with no visible error. Behaviour is otherwise unchanged; see "Migrating from 0.x" in the README for a before/after config and the full rename table.

- Changed: `cookies` and `auth` were replaced by `tokens` and `endpoints`. Everything about a token — the cookie it lives in and how it reaches the backend — is now in one place: `tokens.access.cookie` / `tokens.access.send` and `tokens.refresh.cookie` / `tokens.refresh.send`. Which endpoints are special is answered by `endpoints.refresh`, `endpoints.logout` and `endpoints.issuesTokens`.
- Changed: the flat top-level options were grouped. `defaultHeaders` / `overrideHeaders` / `stripRequestHeaders` / `stripResponseHeaders` became `headers.*`; `responseCacheControl` / `sanitizeTokenResponse` became `response.*`; `refresh.statusCodes` and the refresh request builder became `autoRefresh.on` and `autoRefresh.buildRequest`. Top-level options went from 15 to 11.
- Changed: refresh-token placement is declared once, as a list of `{ to, in }` rows on `tokens.refresh.send`. This replaces both `refresh.tokenTransport`/`tokenBodyKey`/`tokenHeaderName`/`tokenCookieName` and `auth.forwardRefreshToken`, which described the same thing in two different vocabularies. `endpoints.refresh` keeps `{ in: 'body', key: 'refreshToken' }` implicitly, so configs that never customized the transport do not list it.
- Changed: `sanitizeTokenResponse: 'auth-endpoints'` is now `response.sanitizeTokens: 'issuing-endpoints'`, naming the `endpoints.issuesTokens` list it actually reads.
- Changed: `tokens.access.send` accepts a declarative placement, so using a different header no longer requires writing a function — `{ in: 'header', name: 'X-Access-Token', scheme: false }` is enough. Functions and `false` still work.
- Added: the refresh token can be forwarded to proxied endpoints. Proxied requests strip the browser's `cookie` header, so until now the refresh token could only reach `endpoints.refresh`. Endpoints that mint a new token pair from the current refresh token — profile switching, token generation — had no way to receive it. Add a `tokens.refresh.send` row naming the endpoint. Only the refresh token is sent; the rest of the cookie jar is still stripped.
- Added: `endpoints.issuesTokens` and `tokens.refresh.send[].to` accept plain strings alongside regular expressions. A string must equal the backend path exactly, which covers most endpoints without regex escaping.
- Added: `hooks` — `onBackendRequest`, `onBackendResponse`, `onRefresh`, `onTokensStored` and `onCookiesCleared`. All optional and synchronous; a returned promise is not awaited and a thrown error is swallowed, so a hook can never break a proxied request. No hook receives a token value.
- Added: `redactHeaders`, exported for use in hook logging. It masks `authorization`, `cookie` and `set-cookie` values while keeping header names, so `cookie: '<redacted>'` still answers "was it attached?".
- Fixed: when a request is retried after a token refresh, the retry now carries the **rotated** refresh token rather than the one read at the start of the request. A forwarding flow implemented in userland via the old `authHeader` hook would resend an already-rotated token on the retry and fail.
- Fixed: the `g` and `y` flags are stripped from configured patterns during normalization. Those flags make `RegExp.test` advance `lastIndex`, and pattern objects live for the lifetime of the process, so a pattern written as `/^auth\/login$/g` previously matched on every other request.
- Fixed: `authorization` is stripped from proxied requests by default, alongside `cookie`. Previously a client-supplied `Authorization` header reached the backend whenever `tokens.access.send` wrote to a different header name or was a custom function, because neither overwrites `Authorization` — only the default `Bearer` placement and the disabled (`send: false`) path did. The proxy is now the only source of that header. Add it back to `headers.stripRequest` yourself if you replace the default list, and note that every other client header is still forwarded: anything your backend trusts for identity belongs in that list too.
- Removed: the top-level `buildRefreshRequest` option, which duplicated `refresh.buildRequest`. Use `autoRefresh.buildRequest`.

The 0.x config guard that raises the migration error is a one-time aid and is scheduled for removal in 2.0.0.

## 0.3.0

- Added: `responseCacheControl` config option. The proxy now stamps `Cache-Control` on every proxied response and, when set, drops the `etag`, `last-modified`, `expires`, `pragma`, and `age` cache validators.
- Changed: proxied responses are `no-store` by default. Because the proxy serves per-user authenticated data, a browser-cached copy could be replayed on a back/forward navigation without revalidation and render stale data. Set `responseCacheControl: false` to restore the previous behavior of forwarding the backend's own caching headers.

## 0.2.3

- Fixed: concurrent requests no longer share a single process-wide refresh. The refresh coordinator is now keyed by the refresh-token value, so requests for different sessions never share a refresh result — preventing cross-request/cross-user contamination where one request's failed refresh could clear another request's cookies.
- Fixed: cookies are only cleared on the logout endpoint or when a refresh was actually attempted and failed. A request that never carried a refresh token can no longer trigger a cookie clear. The clear decision is extracted into `shouldClearCookies`.
- Changed: the proxied response now carries an accurate `Content-Length` computed from the re-serialized body, so responses are length-delimited instead of chunked. Fixes the stale/missing length left after token sanitization and avoids chunked-transfer framing.

## 0.2.1

- Fixed: auth cookies are no longer cleared on a 401 unless a refresh was actually attempted and failed. Previously any 401 on an unauthenticated request (no refresh token) emitted `set-cookie` deletes, which could race with and wipe a freshly-set session right after login — an intermittent, Node-version-dependent bug.

## 0.1.0

- Initial public package setup.
- Added the `createProxyBridge` factory API.
- Added Next.js App Router proxy handlers for token-based backend APIs.
- Added server-side `proxyBridge.fetch` for internal proxy route requests.
- Added httpOnly cookie token storage, refresh retry, token response sanitization, and concurrent refresh locking.
