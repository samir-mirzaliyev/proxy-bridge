import { describe, expect, it, vi } from 'vitest';

import { TokenRefreshCoordinator } from '../src/request/auth/token-refresh-coordinator';

describe('TokenRefreshCoordinator', () => {
  it('shares the same pending refresh between concurrent callers', async () => {
    const coordinator = new TokenRefreshCoordinator();
    const refreshFn = vi.fn(
      () =>
        new Promise<{ accessToken: string }>((resolve) => {
          setTimeout(() => resolve({ accessToken: 'new-access-token' }), 10);
        }),
    );

    const [first, second] = await Promise.all([
      coordinator.refresh(refreshFn),
      coordinator.refresh(refreshFn),
    ]);

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ accessToken: 'new-access-token' });
    expect(second).toEqual({ accessToken: 'new-access-token' });
  });
});
