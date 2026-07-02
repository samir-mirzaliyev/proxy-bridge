import { buildProxyFetchUrl } from './build-proxy-fetch-url.util';

import type { ServerProxyFetch } from '../types';

export function createServerProxyFetch({
  appUrl,
  routePrefix,
}: {
  appUrl: string;
  routePrefix: string;
}): ServerProxyFetch {
  return async function serverProxyFetch(input, init) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const headers = new Headers(init?.headers);

    headers.set('Cookie', cookieStore.toString());

    return fetch(buildProxyFetchUrl({ appUrl, routePrefix, input }), {
      ...init,
      headers,
    });
  };
}
