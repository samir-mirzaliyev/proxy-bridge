# Changelog

## 0.2.1

- Fixed: auth cookies are no longer cleared on a 401 unless a refresh was actually attempted and failed. Previously any 401 on an unauthenticated request (no refresh token) emitted `set-cookie` deletes, which could race with and wipe a freshly-set session right after login — an intermittent, Node-version-dependent bug.

## 0.1.0

- Initial public package setup.
- Added the `createProxyBridge` factory API.
- Added Next.js App Router proxy handlers for token-based backend APIs.
- Added server-side `proxyBridge.fetch` for internal proxy route requests.
- Added httpOnly cookie token storage, refresh retry, token response sanitization, and concurrent refresh locking.
