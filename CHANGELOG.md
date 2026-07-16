# Changelog

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
