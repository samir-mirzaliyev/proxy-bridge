/**
 * Calls a lifecycle hook without letting it affect the proxy. The context is built lazily, so
 * nothing is allocated when no hook is configured. A thrown error is swallowed and a returned
 * promise is not awaited — hooks are for logging, never for control flow.
 */
export function invokeHook<TContext>(
  hook: ((context: TContext) => void) | undefined,
  createContext: () => TContext,
) {
  if (!hook) {
    return;
  }

  try {
    hook(createContext());
  } catch {
    // A logging hook must never break a proxied request.
  }
}
