import type { AuthTokens } from '../../types';

export class TokenRefreshCoordinator {
  private pendingRefresh?: Promise<AuthTokens | undefined>;

  refresh(refreshFn: () => Promise<AuthTokens | undefined>) {
    if (!this.pendingRefresh) {
      this.pendingRefresh = refreshFn().finally(() => {
        this.pendingRefresh = undefined;
      });
    }

    return this.pendingRefresh;
  }
}
