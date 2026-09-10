/**
 * Type-level guarantees, checked by `npm run type-check` rather than by vitest. Every
 * `@ts-expect-error` below fails the build if the combination it rejects ever starts compiling.
 */
import { createProxyBridge } from '../src/index';

// The full config from the README — kept here so the documented example cannot go stale.
createProxyBridge({
  appUrl: 'https://app.example.com',
  backendBaseUrl: 'https://api.example.com/v1',
  routePrefix: '/api',

  tokens: {
    access: {
      cookie: {
        name: 'access_token',
        maxAge: 86400,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      },
      send: { in: 'header', name: 'Authorization', scheme: 'Bearer' },
    },
    refresh: {
      cookie: { name: 'refresh_token', maxAge: 2592000 },
      send: [{ to: 'profiles/generate-token', in: 'cookie' }],
    },
  },

  endpoints: {
    refresh: 'auth/refresh',
    logout: 'auth/logout',
    issuesTokens: ['auth/login', /^auth\/oauth\/[^/]+$/],
  },

  autoRefresh: { on: [401] },

  headers: {
    default: {},
    override: { 'Accept-Language': 'az' },
    stripRequest: ['cookie'],
    stripResponse: ['set-cookie'],
  },

  response: { cacheControl: 'no-store', sanitizeTokens: 'issuing-endpoints' },

  hooks: {
    onBackendRequest: ({ backendPath, isRetry }) => void [backendPath, isRetry],
    onBackendResponse: ({ status }) => void status,
    onRefresh: ({ outcome }) => void outcome,
    onTokensStored: ({ hasAccessToken }) => void hasAccessToken,
    onCookiesCleared: ({ reason }) => void reason,
  },
});

createProxyBridge({
  appUrl: 'https://app.example.com',
  tokens: {
    access: { cookie: { name: 'access_token' } },
    refresh: {
      cookie: { name: 'refresh_token' },
      send: [
        { to: 'auth/refresh', in: 'body', key: 'refreshToken' },
        { to: 'profiles/generate-token', in: 'body' },
        // @ts-expect-error `key` belongs to the body placement
        { to: 'profiles/generate-token', in: 'cookie', key: 'refreshToken' },
        // @ts-expect-error `name` belongs to the header and cookie placements
        { to: 'auth/refresh', in: 'body', name: 'X-RT' },
        // @ts-expect-error unknown placement
        { to: 'profiles/generate-token', in: 'query' },
      ],
    },
  },
  endpoints: { refresh: 'auth/refresh', logout: 'auth/logout', issuesTokens: [] },
});

createProxyBridge({
  appUrl: 'https://app.example.com',
  tokens: {
    access: {
      cookie: { name: 'access_token' },
      // @ts-expect-error the access token can only be placed in a header
      send: { in: 'cookie', name: 'access_token' },
    },
    refresh: { cookie: { name: 'refresh_token' } },
  },
  endpoints: { refresh: 'auth/refresh', logout: 'auth/logout', issuesTokens: [] },
});
