import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config/normalize-config.util';

describe('normalizeConfig', () => {
  it('fills optional config values with defaults', () => {
    const config = normalizeConfig({
      backendBaseUrl: 'https://backend.test',
      cookies: {
        access: { name: 'access_token' },
        refresh: { name: 'refresh_token' },
      },
      auth: {
        refreshEndpoint: 'auth/refresh',
        logoutEndpoint: 'auth/logout',
        tokenEndpointPatterns: [],
      },
    });

    expect(config.defaultHeaders).toEqual({});
    expect(config.overrideHeaders).toEqual({});
    expect(config.refresh).toMatchObject({
      statusCodes: [401],
      tokenTransport: 'body',
      tokenBodyKey: 'refreshToken',
      tokenHeaderName: 'X-Refresh-Token',
      tokenCookieName: 'refresh_token',
    });
    expect(config.stripRequestHeaders).toContain('cookie');
    expect(config.stripResponseHeaders).toContain('set-cookie');
  });

  it('preserves provided optional config values', () => {
    const buildRequest = () => ({ method: 'POST' });
    const config = normalizeConfig({
      backendBaseUrl: 'https://backend.test',
      cookies: {
        access: { name: 'access_token' },
        refresh: { name: 'refresh_token' },
      },
      auth: {
        refreshEndpoint: 'auth/refresh',
        logoutEndpoint: 'auth/logout',
        tokenEndpointPatterns: [],
      },
      defaultHeaders: { 'Accept-Language': 'az' },
      overrideHeaders: { 'X-App': 'web' },
      stripRequestHeaders: ['host'],
      stripResponseHeaders: ['server'],
      refresh: {
        statusCodes: [401, 419],
        tokenTransport: 'header',
        tokenHeaderName: 'X-Refresh',
        tokenBodyKey: 'token',
        tokenCookieName: 'refresh',
        buildRequest,
      },
    });

    expect(config.defaultHeaders).toEqual({ 'Accept-Language': 'az' });
    expect(config.overrideHeaders).toEqual({ 'X-App': 'web' });
    expect(config.stripRequestHeaders).toEqual(['host']);
    expect(config.stripResponseHeaders).toEqual(['server']);
    expect(config.refresh).toMatchObject({
      statusCodes: [401, 419],
      tokenTransport: 'header',
      tokenHeaderName: 'X-Refresh',
      tokenBodyKey: 'token',
      tokenCookieName: 'refresh',
      buildRequest,
    });
  });
});
