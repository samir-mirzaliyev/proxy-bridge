import { describe, expect, it, vi } from 'vitest';

import { TokenRefreshCoordinator } from '../src/request/auth/token-refresh-coordinator';

describe('TokenRefreshCoordinator', () => {
  it('shares the same pending refresh between concurrent callers with the same key', async () => {
    const coordinator = new TokenRefreshCoordinator();
    const refreshFn = vi.fn(
      () =>
        new Promise<{ accessToken: string }>((resolve) => {
          setTimeout(() => resolve({ accessToken: 'new-access-token' }), 10);
        }),
    );

    const [first, second] = await Promise.all([
      coordinator.refresh('refresh-token', refreshFn),
      coordinator.refresh('refresh-token', refreshFn),
    ]);

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ accessToken: 'new-access-token' });
    expect(second).toEqual({ accessToken: 'new-access-token' });
  });

  it('does not share refreshes between callers with different keys', async () => {
    const coordinator = new TokenRefreshCoordinator();
    const refreshFn = vi.fn(
      (token: string) =>
        new Promise<{ accessToken: string }>((resolve) => {
          setTimeout(() => resolve({ accessToken: `access-for-${token}` }), 10);
        }),
    );

    const [first, second] = await Promise.all([
      coordinator.refresh('token-a', () => refreshFn('token-a')),
      coordinator.refresh('token-b', () => refreshFn('token-b')),
    ]);

    expect(refreshFn).toHaveBeenCalledTimes(2);
    expect(first).toEqual({ accessToken: 'access-for-token-a' });
    expect(second).toEqual({ accessToken: 'access-for-token-b' });
  });

  it('runs the refresh again for the same key after the previous one settled', async () => {
    const coordinator = new TokenRefreshCoordinator();
    const refreshFn = vi.fn(() => Promise.resolve({ accessToken: 'access-token' }));

    await coordinator.refresh('refresh-token', refreshFn);
    await coordinator.refresh('refresh-token', refreshFn);

    expect(refreshFn).toHaveBeenCalledTimes(2);
  });
});
