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

/**
 * Matches a backend path — the catch-all segments joined with `/`, without a leading slash and
 * without the query string. A string must equal the path exactly; a regular expression is tested
 * against it. The `g` and `y` flags are stripped during normalization.
 */
export type EndpointPattern = string | RegExp;

export type AccessTokenContext = {
  accessToken: string;
  request: ProxyRequest;
  backendPath: string;
  config: NormalizedProxyConfig;
};

export type AccessTokenPlacement = {
  in: 'header';
  name?: string;
  scheme?: string | false;
};

/**
 * How the access token reaches the backend. Defaults to `Authorization: Bearer <token>`.
 * Use `false` to never send it, or a function for full control over the headers.
 */
export type AccessTokenSender =
  AccessTokenPlacement | false | ((context: AccessTokenContext) => HeadersInit);

/**
 * One row of `tokens.refresh.send`: which endpoint receives the refresh token, and where it is
 * placed. `body` is only valid for the endpoint configured as `endpoints.refresh`, because the
 * proxy builds that request itself — relayed requests can only carry extra headers.
 */
export type RefreshTokenDelivery<TRefresh extends string = string> =
  | { to: TRefresh; in: 'body'; key?: string }
  | { to: EndpointPattern; in: 'header'; name?: string }
  | { to: EndpointPattern; in: 'cookie'; name?: string };

export type AccessTokenConfig = {
  cookie: AuthCookieConfig;
  send?: AccessTokenSender;
};

export type RefreshTokenConfig<TRefresh extends string = string> = {
  cookie: AuthCookieConfig;
  /**
   * Endpoints that receive the refresh token, and where it is placed for each. The first matching
   * row wins. `endpoints.refresh` gets `{ in: 'body', key: 'refreshToken' }` implicitly when it is
   * not listed. Listing any other endpoint enables forwarding for it.
   */
  send?: RefreshTokenDelivery<TRefresh>[];
};

/** Where each token is stored, and how it reaches the backend. */
export type ProxyTokensConfig<TRefresh extends string = string> = {
  access: AccessTokenConfig;
  refresh: RefreshTokenConfig<TRefresh>;
};

/** Which backend endpoints get special treatment. */
export type ProxyEndpointsConfig<TRefresh extends string = string> = {
  refresh: TRefresh;
  logout: string;
  /** Endpoints whose responses carry tokens to store, and whose responses are sanitized. */
  issuesTokens: EndpointPattern[];
};

/** The refresh the proxy performs on its own when a backend response says the access token expired. */
export type ProxyAutoRefreshConfig = {
  on?: number[];
  buildRequest?: (context: RefreshRequestContext) => RequestInit;
};

export type ProxyHeadersConfig = {
  default?: Record<string, string>;
  override?: Record<string, string>;
  stripRequest?: string[];
  stripResponse?: string[];
};

export type SanitizeTokensContext = {
  payload: unknown;
  backendPath: string;
  issuesTokens: boolean;
  config: NormalizedProxyConfig;
};

/**
 * Whether token values are removed from JSON responses before they reach the browser.
 * `issuing-endpoints` sanitizes only paths matching `endpoints.issuesTokens`.
 */
export type SanitizeTokensMode =
  boolean | 'issuing-endpoints' | 'all-json' | ((context: SanitizeTokensContext) => unknown);

export type ProxyResponseConfig = {
  cacheControl?: string | false;
  sanitizeTokens?: SanitizeTokensMode;
};

export type BackendRequestHookContext = {
  method: HttpMethod;
  url: URL;
  backendPath: string;
  headers: Headers;
  isRetry: boolean;
};

export type BackendResponseHookContext = {
  backendPath: string;
  status: number;
  isRetry: boolean;
};

export type RefreshHookContext = {
  backendPath: string;
  outcome: 'succeeded' | 'failed' | 'skipped';
};

export type TokensStoredHookContext = {
  backendPath: string;
  source: 'refresh' | 'endpoint';
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
};

export type CookiesClearedHookContext = {
  backendPath: string;
  reason: 'logout' | 'refresh-failed';
};

/**
 * Lifecycle callbacks for logging and debugging. All are optional and synchronous; a returned
 * promise is not awaited and a thrown error is swallowed, so a hook can never break the proxy.
 * No hook receives a token value — `onBackendRequest.headers` is the one place credentials are
 * reachable, so pass it through `redactHeaders` before logging.
 */
export type ProxyHooks = {
  onBackendRequest?: (context: BackendRequestHookContext) => void;
  onBackendResponse?: (context: BackendResponseHookContext) => void;
  onRefresh?: (context: RefreshHookContext) => void;
  onTokensStored?: (context: TokensStoredHookContext) => void;
  onCookiesCleared?: (context: CookiesClearedHookContext) => void;
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

export type RefreshDecisionContext = {
  response: Response;
  backendPath: string;
  config: NormalizedProxyConfig;
};

export type ProxyConfig<TRefresh extends string = string> = {
  backendBaseUrl?: string;
  /** `NoInfer` keeps `endpoints.refresh` the only source of `TRefresh`, so a delivery row cannot
   * widen it and slip a `body` placement past the type check. */
  tokens: ProxyTokensConfig<NoInfer<TRefresh>>;
  endpoints: ProxyEndpointsConfig<TRefresh>;
  autoRefresh?: ProxyAutoRefreshConfig;
  headers?: ProxyHeadersConfig;
  response?: ProxyResponseConfig;
  hooks?: ProxyHooks;
  extractTokens?: (payload: unknown) => AuthTokens;
  buildBackendUrl?: (context: BackendUrlContext) => URL | string;
};

export type ProxyBridgeConfig<TRefresh extends string = string> = ProxyConfig<TRefresh> & {
  appUrl: string;
  routePrefix?: string;
};

export type ServerProxyFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type ProxyBridge = {
  handlers: ProxyHandlers;
  fetch: ServerProxyFetch;
};

export type NormalizedRefreshTokenDelivery =
  | { to: EndpointPattern; in: 'body'; key: string }
  | { to: EndpointPattern; in: 'header'; name: string }
  | { to: EndpointPattern; in: 'cookie'; name: string };

export type NormalizedAccessTokenPlacement = Required<AccessTokenPlacement>;

export type NormalizedAccessTokenSender =
  NormalizedAccessTokenPlacement | false | ((context: AccessTokenContext) => HeadersInit);

export type NormalizedAccessTokenConfig = {
  cookie: AuthCookieConfig;
  send: NormalizedAccessTokenSender;
};

export type NormalizedRefreshTokenConfig = {
  cookie: AuthCookieConfig;
  send: NormalizedRefreshTokenDelivery[];
};

export type NormalizedProxyTokensConfig = {
  access: NormalizedAccessTokenConfig;
  refresh: NormalizedRefreshTokenConfig;
};

export type NormalizedProxyEndpointsConfig = {
  refresh: string;
  logout: string;
  issuesTokens: EndpointPattern[];
};

export type NormalizedProxyAutoRefreshConfig = Required<Pick<ProxyAutoRefreshConfig, 'on'>> &
  Pick<ProxyAutoRefreshConfig, 'buildRequest'>;

export type NormalizedProxyConfig = Pick<
  ProxyConfig,
  'backendBaseUrl' | 'extractTokens' | 'buildBackendUrl'
> & {
  tokens: NormalizedProxyTokensConfig;
  endpoints: NormalizedProxyEndpointsConfig;
  autoRefresh: NormalizedProxyAutoRefreshConfig;
  headers: Required<ProxyHeadersConfig>;
  response: Required<ProxyResponseConfig>;
  hooks: ProxyHooks;
};

export type ParsedBackendResponse = {
  body: BodyInit | null;
  contentType: string;
  payload: unknown;
};
