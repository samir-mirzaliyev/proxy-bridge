export class TokenRefreshCoordinator {
  private readonly pending = new Map<string, Promise<unknown>>();

  refresh<T>(key: string, refreshFn: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);

    if (existing) {
      return existing as Promise<T>;
    }

    const pending = refreshFn().finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, pending);

    return pending as Promise<T>;
  }
}
