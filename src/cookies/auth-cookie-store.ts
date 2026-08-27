import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import type { AuthCookieConfig, AuthTokens, NormalizedProxyConfig } from '../types';

const isProduction = process.env.NODE_ENV === 'production';

function getCookieOptions(config: AuthCookieConfig) {
  return {
    httpOnly: config.httpOnly ?? true,
    secure: config.secure ?? isProduction,
    sameSite: config.sameSite ?? ('lax' as const),
    path: config.path ?? '/',
    ...(config.maxAge ? { maxAge: config.maxAge } : {}),
  };
}

export class AuthCookieStore {
  constructor(private readonly config: NormalizedProxyConfig) {}

  async getAccessToken() {
    const cookieStore = await cookies();
    return cookieStore.get(this.config.tokens.access.cookie.name)?.value;
  }

  async getRefreshToken() {
    const cookieStore = await cookies();
    return cookieStore.get(this.config.tokens.refresh.cookie.name)?.value;
  }

  setTokens(response: NextResponse, tokens: AuthTokens) {
    if (tokens.accessToken) {
      response.cookies.set(
        this.config.tokens.access.cookie.name,
        tokens.accessToken,
        getCookieOptions(this.config.tokens.access.cookie),
      );
    }

    if (tokens.refreshToken) {
      response.cookies.set(
        this.config.tokens.refresh.cookie.name,
        tokens.refreshToken,
        getCookieOptions(this.config.tokens.refresh.cookie),
      );
    }
  }

  clear(response: NextResponse) {
    response.cookies.delete(this.config.tokens.access.cookie.name);
    response.cookies.delete(this.config.tokens.refresh.cookie.name);
  }
}
