export class TokenRefreshCoordinator {
  private pendingRefresh?: Promise<unknown>;

  refresh<T>(refreshFn: () => Promise<T>): Promise<T> {
    if (!this.pendingRefresh) {
      this.pendingRefresh = refreshFn().finally(() => {
        this.pendingRefresh = undefined;
      });
    }

    return this.pendingRefresh as Promise<T>;
  }
}
