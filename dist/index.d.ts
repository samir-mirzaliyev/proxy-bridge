type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ProxyRequest = Request & {
    nextUrl: URL;
};
type ProxyContext = {
    params: Promise<{
        proxy?: string[];
    }>;
};
type ProxyHandler = (request: ProxyRequest, context: ProxyContext) => Promise<Response>;
type ProxyHandlers = {
    GET: ProxyHandler;
    POST: ProxyHandler;
    PUT: ProxyHandler;
    PATCH: ProxyHandler;
    DELETE: ProxyHandler;
};
type AuthTokens = {
    accessToken?: string;
    refreshToken?: string;
};
type SameSite = 'strict' | 'lax' | 'none';
type AuthCookieConfig = {
    name: string;
    maxAge?: number;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: SameSite;
};
type ProxyCookiesConfig = {
    access: AuthCookieConfig;
    refresh: AuthCookieConfig;
};
type AuthHeaderContext = {
    accessToken: string;
    request: ProxyRequest;
    backendPath: string;
    config: NormalizedProxyConfig;
};
type AuthHeaderBuilder = false | ((context: AuthHeaderContext) => HeadersInit);
type ProxyAuthConfig = {
    refreshEndpoint: string;
    logoutEndpoint: string;
    tokenEndpointPatterns: RegExp[];
    authHeader?: AuthHeaderBuilder;
};
type RefreshRequestContext = {
    request: ProxyRequest;
    refreshToken: string;
    currentAccessToken?: string;
    config: NormalizedProxyConfig;
};
type BackendUrlContext = {
    request: ProxyRequest;
    backendBaseUrl?: string;
    backendPath: string;
};
type RefreshTokenTransport = 'body' | 'header' | 'cookie';
type ProxyRefreshConfig = {
    statusCodes?: number[];
    tokenTransport?: RefreshTokenTransport;
    tokenBodyKey?: string;
    tokenHeaderName?: string;
    tokenCookieName?: string;
    buildRequest?: (context: RefreshRequestContext) => RequestInit;
};
type NormalizedProxyRefreshConfig = Required<Pick<ProxyRefreshConfig, 'statusCodes' | 'tokenTransport' | 'tokenBodyKey' | 'tokenHeaderName' | 'tokenCookieName'>> & Pick<ProxyRefreshConfig, 'buildRequest'>;
type SanitizeTokenResponseContext = {
    payload: unknown;
    backendPath: string;
    isAuthEndpoint: boolean;
    config: NormalizedProxyConfig;
};
type SanitizeTokenResponseMode = boolean | 'auth-endpoints' | 'all-json' | ((context: SanitizeTokenResponseContext) => unknown);
type ProxyConfig = {
    backendBaseUrl?: string;
    cookies: ProxyCookiesConfig;
    auth: ProxyAuthConfig;
    refresh?: ProxyRefreshConfig;
    defaultHeaders?: Record<string, string>;
    overrideHeaders?: Record<string, string>;
    stripRequestHeaders?: string[];
    stripResponseHeaders?: string[];
    extractTokens?: (payload: unknown) => AuthTokens;
    sanitizeTokenResponse?: SanitizeTokenResponseMode;
    buildBackendUrl?: (context: BackendUrlContext) => URL | string;
    buildRefreshRequest?: (context: RefreshRequestContext) => RequestInit;
};
type ProxyBridgeConfig = ProxyConfig & {
    appUrl: string;
    routePrefix?: string;
};
type ServerProxyFetch = (input: string, init?: RequestInit) => Promise<Response>;
type ProxyBridge = {
    handlers: ProxyHandlers;
    fetch: ServerProxyFetch;
};
type NormalizedProxyConfig = Required<Pick<ProxyConfig, 'cookies' | 'auth' | 'defaultHeaders' | 'overrideHeaders' | 'stripRequestHeaders' | 'stripResponseHeaders'>> & Pick<ProxyConfig, 'backendBaseUrl' | 'extractTokens' | 'sanitizeTokenResponse' | 'buildBackendUrl' | 'buildRefreshRequest'> & {
    refresh: NormalizedProxyRefreshConfig;
};

declare function createProxyBridge(config: ProxyBridgeConfig): ProxyBridge;

declare function sanitizeTokenResponse<T>(value: T): T;

export { type AuthCookieConfig, type AuthHeaderBuilder, type AuthHeaderContext, type AuthTokens, type BackendUrlContext, type HttpMethod, type ProxyAuthConfig, type ProxyBridge, type ProxyBridgeConfig, type ProxyConfig, type ProxyContext, type ProxyCookiesConfig, type ProxyHandler, type ProxyHandlers, type ProxyRefreshConfig, type ProxyRequest, type RefreshRequestContext, type SanitizeTokenResponseContext, type SanitizeTokenResponseMode, type ServerProxyFetch, createProxyBridge, sanitizeTokenResponse };
