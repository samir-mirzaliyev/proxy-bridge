// src/request/headers/request-header.constants.ts
var HOP_BY_HOP_HEADERS = /* @__PURE__ */ new Set([
  "connection",
  "content-encoding",
  "content-length",
  "cookie",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

// src/config/normalize-config.util.ts
function normalizeConfig(config) {
  return {
    ...config,
    refresh: {
      statusCodes: config.refresh?.statusCodes ?? [401],
      tokenTransport: config.refresh?.tokenTransport ?? "body",
      tokenBodyKey: config.refresh?.tokenBodyKey ?? "refreshToken",
      tokenHeaderName: config.refresh?.tokenHeaderName ?? "X-Refresh-Token",
      tokenCookieName: config.refresh?.tokenCookieName ?? config.cookies.refresh.name,
      buildRequest: config.refresh?.buildRequest
    },
    defaultHeaders: config.defaultHeaders ?? {},
    overrideHeaders: config.overrideHeaders ?? {},
    stripRequestHeaders: config.stripRequestHeaders ?? Array.from(HOP_BY_HOP_HEADERS),
    stripResponseHeaders: config.stripResponseHeaders ?? [...Array.from(HOP_BY_HOP_HEADERS), "set-cookie"]
  };
}

// src/cookies/auth-cookie-store.ts
import { cookies } from "next/headers";
var isProduction = process.env.NODE_ENV === "production";
function getCookieOptions(config) {
  return {
    httpOnly: config.httpOnly ?? true,
    secure: config.secure ?? isProduction,
    sameSite: config.sameSite ?? "lax",
    path: config.path ?? "/",
    ...config.maxAge ? { maxAge: config.maxAge } : {}
  };
}
var AuthCookieStore = class {
  constructor(config) {
    this.config = config;
  }
  config;
  async getAccessToken() {
    const cookieStore = await cookies();
    return cookieStore.get(this.config.cookies.access.name)?.value;
  }
  async getRefreshToken() {
    const cookieStore = await cookies();
    return cookieStore.get(this.config.cookies.refresh.name)?.value;
  }
  setTokens(response, tokens) {
    if (tokens.accessToken) {
      response.cookies.set(
        this.config.cookies.access.name,
        tokens.accessToken,
        getCookieOptions(this.config.cookies.access)
      );
    }
    if (tokens.refreshToken) {
      response.cookies.set(
        this.config.cookies.refresh.name,
        tokens.refreshToken,
        getCookieOptions(this.config.cookies.refresh)
      );
    }
  }
  clear(response) {
    response.cookies.delete(this.config.cookies.access.name);
    response.cookies.delete(this.config.cookies.refresh.name);
  }
};

// src/request/auth/should-refresh-request.ts
function shouldRefreshRequest({
  response,
  backendPath,
  config
}) {
  if (backendPath === config.auth.refreshEndpoint) {
    return false;
  }
  return config.refresh.statusCodes.includes(response.status);
}

// src/request/auth/token-refresh-coordinator.ts
var TokenRefreshCoordinator = class {
  pendingRefresh;
  refresh(refreshFn) {
    if (!this.pendingRefresh) {
      this.pendingRefresh = refreshFn().finally(() => {
        this.pendingRefresh = void 0;
      });
    }
    return this.pendingRefresh;
  }
};

// src/request/backend/build-backend-url.util.ts
function buildBackendUrl({
  request,
  backendPath,
  config
}) {
  if (config.buildBackendUrl) {
    return config.buildBackendUrl({
      request,
      backendBaseUrl: config.backendBaseUrl,
      backendPath
    });
  }
  const { backendBaseUrl } = config;
  if (!backendBaseUrl) {
    throw new Error("backendBaseUrl is not configured");
  }
  const url = new URL(`${backendBaseUrl.replace(/\/$/, "")}/${backendPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  return url;
}

// src/request/headers/create-forward-headers.ts
function applyHeaders(headers, values) {
  new Headers(values).forEach((value, key) => {
    headers.set(key, value);
  });
}
function createForwardHeaders({
  request,
  backendPath,
  accessToken,
  config
}) {
  const headers = new Headers();
  const strippedHeaders = new Set(config.stripRequestHeaders.map((header) => header.toLowerCase()));
  request.headers.forEach((value, key) => {
    if (!strippedHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  Object.entries(config.defaultHeaders).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });
  Object.entries(config.overrideHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  const authHeader = config.auth.authHeader;
  if (accessToken && authHeader !== false) {
    if (authHeader) {
      applyHeaders(headers, authHeader({ accessToken, request, backendPath, config }));
      return headers;
    }
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("Authorization");
  }
  return headers;
}

// src/request/backend/backend-request-client.ts
var BackendRequestClient = class {
  constructor(config) {
    this.config = config;
  }
  config;
  send({
    request,
    method,
    backendPath,
    body,
    accessToken
  }) {
    return fetch(
      buildBackendUrl({
        request,
        backendPath,
        config: this.config
      }),
      {
        method,
        headers: createForwardHeaders({ request, backendPath, accessToken, config: this.config }),
        body,
        cache: "no-store"
      }
    );
  }
};

// src/request/backend/build-backend-path.util.ts
function buildBackendPath(proxyPath) {
  return proxyPath.join("/");
}

// src/request/body/get-request-body.util.ts
async function getRequestBody(request, method) {
  if (method === "GET" || method === "DELETE") {
    return void 0;
  }
  return request.arrayBuffer();
}

// src/tokens/extract-tokens.util.ts
function defaultExtractTokens(payload) {
  const responseData = payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
  if (!responseData || typeof responseData !== "object") {
    return {};
  }
  const tokens = responseData;
  return {
    accessToken: typeof tokens.accessToken === "string" ? tokens.accessToken : void 0,
    refreshToken: typeof tokens.refreshToken === "string" ? tokens.refreshToken : void 0
  };
}
function extractTokens(payload, extractor = defaultExtractTokens) {
  return extractor(payload);
}

// src/request/auth/token-refresh-service.ts
function applyCurrentAccessToken({
  headers,
  request,
  currentAccessToken,
  config
}) {
  const authHeader = config.auth.authHeader;
  if (!currentAccessToken || authHeader === false) {
    return;
  }
  if (authHeader) {
    new Headers(
      authHeader({
        accessToken: currentAccessToken,
        request,
        backendPath: config.auth.refreshEndpoint,
        config
      })
    ).forEach((value, key) => {
      headers.set(key, value);
    });
    return;
  }
  headers.set("Authorization", `Bearer ${currentAccessToken}`);
}
function createDefaultRefreshRequest({
  request,
  refreshToken,
  currentAccessToken,
  config
}) {
  const headers = new Headers({
    ...config.defaultHeaders,
    ...config.overrideHeaders
  });
  const init = {
    method: "POST",
    headers,
    cache: "no-store"
  };
  applyCurrentAccessToken({ headers, request, currentAccessToken, config });
  if (config.refresh.tokenTransport === "header") {
    headers.set(config.refresh.tokenHeaderName, refreshToken);
    return init;
  }
  if (config.refresh.tokenTransport === "cookie") {
    headers.set("Cookie", `${config.refresh.tokenCookieName}=${encodeURIComponent(refreshToken)}`);
    return init;
  }
  headers.set("Content-Type", "application/json");
  return {
    ...init,
    body: JSON.stringify({ [config.refresh.tokenBodyKey]: refreshToken })
  };
}
var TokenRefreshService = class {
  constructor(config, cookieStore) {
    this.config = config;
    this.cookieStore = cookieStore;
  }
  config;
  cookieStore;
  async refresh({
    request,
    currentAccessToken
  }) {
    const refreshToken = await this.cookieStore.getRefreshToken();
    if (!refreshToken) {
      return void 0;
    }
    const response = await fetch(
      buildBackendUrl({
        request,
        backendPath: this.config.auth.refreshEndpoint,
        config: this.config
      }),
      this.config.refresh.buildRequest || this.config.buildRefreshRequest ? (this.config.refresh.buildRequest ?? this.config.buildRefreshRequest)?.({
        request,
        refreshToken,
        currentAccessToken,
        config: this.config
      }) : createDefaultRefreshRequest({
        request,
        refreshToken,
        currentAccessToken,
        config: this.config
      })
    );
    if (!response.ok) {
      return void 0;
    }
    const payload = await response.json().catch(() => null);
    return extractTokens(payload, this.config.extractTokens);
  }
};

// src/response/create-proxy-response.ts
import { NextResponse } from "next/server";

// src/response/headers/create-response-headers.ts
function createResponseHeaders({
  backendResponse,
  contentType,
  config
}) {
  const headers = new Headers();
  const strippedHeaders = new Set(config.stripResponseHeaders.map((header) => header.toLowerCase()));
  backendResponse.headers.forEach((value, key) => {
    if (!strippedHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (contentType) {
    headers.set("content-type", contentType);
  }
  return headers;
}

// src/response/create-proxy-response.ts
function createProxyResponse({
  backendResponse,
  parsedResponse,
  config
}) {
  return new NextResponse(parsedResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: createResponseHeaders({
      backendResponse,
      contentType: parsedResponse.contentType,
      config
    })
  });
}

// src/tokens/should-store-tokens.util.ts
function shouldStoreTokens(backendPath, config) {
  return config.auth.tokenEndpointPatterns.some((pattern) => pattern.test(backendPath));
}

// src/response/sanitize/sanitize-token-response.util.ts
function sanitizeTokenResponse(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeTokenResponse);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      if (key === "accessToken" || key === "refreshToken") {
        return [];
      }
      return [[key, sanitizeTokenResponse(entry)]];
    })
  );
}

// src/response/sanitize/resolve-sanitized-payload.ts
function resolveSanitizedPayload({
  payload,
  backendPath,
  config
}) {
  const mode = config.sanitizeTokenResponse ?? "auth-endpoints";
  const isAuthEndpoint = shouldStoreTokens(backendPath, config);
  if (typeof mode === "function") {
    return mode({ payload, backendPath, isAuthEndpoint, config });
  }
  if (mode === false) {
    return payload;
  }
  if (mode === true || mode === "all-json" || mode === "auth-endpoints" && isAuthEndpoint) {
    return sanitizeTokenResponse(payload);
  }
  return payload;
}

// src/response/parse-backend-response.ts
async function parseBackendResponse(response, config, backendPath) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    const sanitizedPayload = resolveSanitizedPayload({ payload, backendPath, config });
    return {
      body: JSON.stringify(sanitizedPayload),
      contentType: "application/json",
      payload
    };
  }
  return {
    body: await response.arrayBuffer(),
    contentType,
    payload: null
  };
}

// src/proxy/auth-proxy-request-handler.ts
var AuthProxyRequestHandler = class {
  constructor(config) {
    this.config = config;
    this.cookieStore = new AuthCookieStore(config);
    this.backendClient = new BackendRequestClient(config);
    this.refreshService = new TokenRefreshService(config, this.cookieStore);
  }
  config;
  cookieStore;
  backendClient;
  refreshService;
  refreshCoordinator = new TokenRefreshCoordinator();
  async handle({
    request,
    context,
    method
  }) {
    const { proxy = [] } = await context.params;
    const backendPath = buildBackendPath(proxy);
    const body = await getRequestBody(request, method);
    const accessToken = await this.cookieStore.getAccessToken();
    let backendResponse = await this.backendClient.send({
      request,
      method,
      backendPath,
      body,
      accessToken
    });
    let refreshedTokens = void 0;
    if (shouldRefreshRequest({ response: backendResponse, backendPath, config: this.config })) {
      refreshedTokens = await this.refreshCoordinator.refresh(
        () => this.refreshService.refresh({ request, currentAccessToken: accessToken })
      );
      if (refreshedTokens?.accessToken) {
        backendResponse = await this.backendClient.send({
          request,
          method,
          backendPath,
          body,
          accessToken: refreshedTokens.accessToken
        });
      }
    }
    const parsedResponse = await parseBackendResponse(backendResponse, this.config, backendPath);
    const response = createProxyResponse({
      backendResponse,
      parsedResponse,
      config: this.config
    });
    if (refreshedTokens?.accessToken) {
      this.cookieStore.setTokens(response, refreshedTokens);
    }
    if (shouldStoreTokens(backendPath, this.config)) {
      this.cookieStore.setTokens(
        response,
        extractTokens(parsedResponse.payload, this.config.extractTokens)
      );
    }
    if (backendPath === this.config.auth.logoutEndpoint || backendResponse.status === 401 && !refreshedTokens?.accessToken) {
      this.cookieStore.clear(response);
    }
    return response;
  }
};

// src/create-proxy-handlers.ts
function createHandler(method, handler) {
  return (request, context) => handler.handle({
    request,
    context,
    method
  });
}
function createProxyHandlers(config) {
  const handler = new AuthProxyRequestHandler(config);
  return {
    GET: createHandler("GET", handler),
    POST: createHandler("POST", handler),
    PUT: createHandler("PUT", handler),
    PATCH: createHandler("PATCH", handler),
    DELETE: createHandler("DELETE", handler)
  };
}

// src/server/build-proxy-fetch-url.util.ts
function normalizeRoutePrefix(routePrefix) {
  const normalized = routePrefix.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}
function normalizeInputPath(input) {
  return input.startsWith("/") ? input : `/${input}`;
}
function buildProxyFetchUrl({
  appUrl,
  routePrefix,
  input
}) {
  if (/^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(input)) {
    throw new Error("proxyBridge.fetch only accepts internal proxy paths");
  }
  const prefix = normalizeRoutePrefix(routePrefix);
  const inputPath = normalizeInputPath(input);
  const path = prefix && !inputPath.startsWith(`${prefix}/`) ? `${prefix}${inputPath}` : inputPath;
  return new URL(path, appUrl);
}

// src/server/create-server-proxy-fetch.ts
function createServerProxyFetch({
  appUrl,
  routePrefix
}) {
  return async function serverProxyFetch(input, init) {
    const { cookies: cookies2 } = await import("next/headers");
    const cookieStore = await cookies2();
    const headers = new Headers(init?.headers);
    headers.set("Cookie", cookieStore.toString());
    return fetch(buildProxyFetchUrl({ appUrl, routePrefix, input }), {
      ...init,
      headers
    });
  };
}

// src/create-proxy-bridge.ts
function createProxyBridge(config) {
  const normalizedConfig = normalizeConfig(config);
  return {
    handlers: createProxyHandlers(normalizedConfig),
    fetch: createServerProxyFetch({
      appUrl: config.appUrl,
      routePrefix: config.routePrefix ?? "/api"
    })
  };
}
export {
  createProxyBridge,
  sanitizeTokenResponse
};
//# sourceMappingURL=index.js.map