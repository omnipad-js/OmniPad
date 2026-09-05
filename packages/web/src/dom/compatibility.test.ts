import { afterEach, describe, expect, it, vi } from 'vitest';

describe('container query capability detection', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('detects and caches native container-query support', async () => {
    const supports = vi.fn(() => true);
    vi.stubGlobal('CSS', { supports });
    const { supportsContainerQueries } = await import('./compatibility');

    expect(supportsContainerQueries()).toBe(true);
    expect(supportsContainerQueries()).toBe(true);
    expect(supports).toHaveBeenCalledOnce();
  });

  it('returns false when CSS.supports is unavailable', async () => {
    vi.stubGlobal('CSS', undefined);
    const { supportsContainerQueries } = await import('./compatibility');

    expect(supportsContainerQueries()).toBe(false);
  });
});
