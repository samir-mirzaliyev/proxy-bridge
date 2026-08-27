import { describe, expect, it, vi } from 'vitest';

import { invokeHook } from '../src/hooks/invoke-hook.util';

describe('invokeHook', () => {
  it('calls the hook with the built context', () => {
    const hook = vi.fn();

    invokeHook(hook, () => ({ backendPath: 'users/me' }));

    expect(hook).toHaveBeenCalledWith({ backendPath: 'users/me' });
  });

  it('does not build the context when the hook is not configured', () => {
    const createContext = vi.fn(() => ({}));

    invokeHook(undefined, createContext);

    expect(createContext).not.toHaveBeenCalled();
  });

  it('swallows an error thrown by the hook', () => {
    expect(() =>
      invokeHook(
        () => {
          throw new Error('logging blew up');
        },
        () => ({}),
      ),
    ).not.toThrow();
  });

  it('swallows an error thrown while building the context', () => {
    expect(() =>
      invokeHook(vi.fn(), () => {
        throw new Error('context blew up');
      }),
    ).not.toThrow();
  });

  it('does not await a returned promise', () => {
    let settled = false;
    const hook = () =>
      Promise.resolve().then(() => {
        settled = true;
      }) as unknown as void;

    invokeHook(hook, () => ({}));

    expect(settled).toBe(false);
  });
});
