function normalizeRoutePrefix(routePrefix: string) {
  const normalized = routePrefix.replace(/^\/+|\/+$/g, '');
  return normalized ? `/${normalized}` : '';
}

function normalizeInputPath(input: string) {
  return input.startsWith('/') ? input : `/${input}`;
}

export function buildProxyFetchUrl({
  appUrl,
  routePrefix,
  input,
}: {
  appUrl: string;
  routePrefix: string;
  input: string;
}) {
  if (/^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(input)) {
    throw new Error('proxyBridge.fetch only accepts internal proxy paths');
  }

  const prefix = normalizeRoutePrefix(routePrefix);
  const inputPath = normalizeInputPath(input);
  const path = prefix && !inputPath.startsWith(`${prefix}/`) ? `${prefix}${inputPath}` : inputPath;

  return new URL(path, appUrl);
}
