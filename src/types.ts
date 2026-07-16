export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ProxyRequest = Request & {
  nextUrl: URL;
};

export type ProxyContext = {
  params: Promise<{ proxy?: string[] }>;
};

export type ProxyHandler = (request: ProxyRequest, context: ProxyContext) => Promise<Response>;

export type ProxyHandlers = {
  GET: ProxyHandler;
  POST: ProxyHandler;
  PUT: ProxyHandler;
  PATCH: ProxyHandler;
  DELETE: ProxyHandler;
};

export type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
};

export type TokenRefreshResult = {
  attempted: boolean;
  tokens?: AuthTokens;
};

export type SameSite = 'strict' | 'lax' | 'none';

export type AuthCookieConfig = {
  name: string;
  maxAge?: number;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: SameSite;
};

export type ProxyCookiesConfig = {
  access: AuthCookieConfig;
  refresh: AuthCookieConfig;
};

export type AuthHeaderContext = {
  accessToken: string;
  request: ProxyRequest;
  backendPath: string;
  config: NormalizedProxyConfig;
};

export type AuthHeaderBuilder = false | ((context: AuthHeaderContext) => HeadersInit);

export type ProxyAuthConfig = {
  refreshEndpoint: string;
  logoutEndpoint: string;
  tokenEndpointPatterns: RegExp[];
  authHeader?: AuthHeaderBuilder;
};

export type RefreshRequestContext = {
  request: ProxyRequest;
  refreshToken: string;
  currentAccessToken?: string;
  config: NormalizedProxyConfig;
};

export type BackendUrlContext = {
  request: ProxyRequest;
  backendBaseUrl?: string;
  backendPath: string;
};

export type RefreshTokenTransport = 'body' | 'header' | 'cookie';

export type ProxyRefreshConfig = {
  statusCodes?: number[];
  tokenTransport?: RefreshTokenTransport;
  tokenBodyKey?: string;
  tokenHeaderName?: string;
  tokenCookieName?: string;
  buildRequest?: (context: RefreshRequestContext) => RequestInit;
};

export type NormalizedProxyRefreshConfig = Required<
  Pick<
    ProxyRefreshConfig,
    'statusCodes' | 'tokenTransport' | 'tokenBodyKey' | 'tokenHeaderName' | 'tokenCookieName'
  >
> &
  Pick<ProxyRefreshConfig, 'buildRequest'>;

export type RefreshDecisionContext = {
  response: Response;
  backendPath: string;
  config: NormalizedProxyConfig;
};

export type SanitizeTokenResponseContext = {
  payload: unknown;
  backendPath: string;
  isAuthEndpoint: boolean;
  config: NormalizedProxyConfig;
};

export type SanitizeTokenResponseMode =
  | boolean
  | 'auth-endpoints'
  | 'all-json'
  | ((context: SanitizeTokenResponseContext) => unknown);

export type ProxyConfig = {
  backendBaseUrl?: string;
  cookies: ProxyCookiesConfig;
  auth: ProxyAuthConfig;
  refresh?: ProxyRefreshConfig;
  defaultHeaders?: Record<string, string>;
  overrideHeaders?: Record<string, string>;
  stripRequestHeaders?: string[];
  stripResponseHeaders?: string[];
  responseCacheControl?: string | false;
  extractTokens?: (payload: unknown) => AuthTokens;
  sanitizeTokenResponse?: SanitizeTokenResponseMode;
  buildBackendUrl?: (context: BackendUrlContext) => URL | string;
  buildRefreshRequest?: (context: RefreshRequestContext) => RequestInit;
};

export type ProxyBridgeConfig = ProxyConfig & {
  appUrl: string;
  routePrefix?: string;
};

export type ServerProxyFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type ProxyBridge = {
  handlers: ProxyHandlers;
  fetch: ServerProxyFetch;
};

export type NormalizedProxyConfig = Required<
  Pick<
    ProxyConfig,
    | 'cookies'
    | 'auth'
    | 'defaultHeaders'
    | 'overrideHeaders'
    | 'stripRequestHeaders'
    | 'stripResponseHeaders'
    | 'responseCacheControl'
  >
> &
  Pick<
    ProxyConfig,
    'backendBaseUrl' | 'extractTokens' | 'sanitizeTokenResponse' | 'buildBackendUrl' | 'buildRefreshRequest'
  > & {
    refresh: NormalizedProxyRefreshConfig;
  };

export type ParsedBackendResponse = {
  body: BodyInit | null;
  contentType: string;
  payload: unknown;
};
