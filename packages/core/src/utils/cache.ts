/**
 * Creates a provider wrapper that caches the result of a value-producing function.
 *
 * This utility implements a lazy-loading pattern with manual invalidation. The
 * provided function is only executed when the cache is "dirty" or empty,
 * ensuring expensive operations aren't repeated unnecessarily.
 *
 * @template T - The type of the value returned by the provider.
 * @param provider - A function that computes or retrieves the value to be cached.
 * @returns An object containing methods to access the value and invalidate the cache.
 *
 * @example
 * ```typescript
 * const userProvider = createCachedProvider(() => fetchUserData());
 *
 * // First call executes the provider
 * const data = userProvider.get();
 *
 * // Subsequent calls return the cached version
 * const cachedData = userProvider.get();
 *
 * // Forces the provider to re-run on the next .get()
 * userProvider.markDirty();
 * ```
 */
export function createCachedProvider<T>(provider: () => T) {
  let cache: T | null = null;
  let isDirty = true;

  return {
    get: () => {
      if (isDirty || !cache) {
        cache = provider();
        isDirty = false;
      }
      return cache;
    },
    markDirty: () => {
      isDirty = true;
    },
  };
}
