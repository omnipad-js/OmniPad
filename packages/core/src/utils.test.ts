import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCachedProvider } from './utils/cache';
import { distillCustom, distillPointer, distillRect } from './utils/distill';
import { generateUID, isGlobalID } from './utils/id';
import { compressLayoutBox, lengthToCss } from './utils/layout';
import {
  addVec,
  applyAxialDeadzone,
  applyRadialDeadzone,
  clamp,
  clampVector,
  degToRad,
  getAngle,
  getDeadzoneScalar,
  getDistance,
  isVec2Equal,
  lerp,
  lockTo4Directions,
  lockTo8Directions,
  normalizeVec,
  percentToPx,
  pxToPercent,
  radToDeg,
  radToVec,
  remap,
  roundTo,
  scaleVec,
  subVec,
} from './utils/math';
import { altDeepClone, filterObjectByKeys, getObjectDiff, mergeObjects } from './utils/object';

describe('core utility primitives', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('caches even falsy provider values until explicitly invalidated', () => {
    const provider = vi.fn(() => 0);
    const cached = createCachedProvider(provider);

    expect(cached.get()).toBe(0);
    expect(cached.get()).toBe(0);
    expect(provider).toHaveBeenCalledOnce();

    cached.markDirty();
    cached.get();
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('distills DOM-shaped values without retaining unrelated properties', () => {
    expect(
      distillRect({
        left: 1,
        right: 11,
        top: 2,
        bottom: 12,
        width: 10,
        height: 10,
        ownerDocument: 'not copied',
      }),
    ).toEqual({ left: 1, right: 11, top: 2, bottom: 12, width: 10, height: 10 });
    expect(
      distillPointer({ pointerId: 4, clientX: 12, clientY: 13, button: 2, target: {} }),
    ).toEqual({
      pointerId: 4,
      clientX: 12,
      clientY: 13,
      button: 2,
    });
    expect(
      distillCustom<{ id: string; enabled: boolean }>({ id: 'a', enabled: true, ignored: 1 }, [
        'id',
        'enabled',
      ]),
    ).toEqual({
      id: 'a',
      enabled: true,
    });
  });

  it('generates stable-format ids with crypto or fallback entropy and recognises globals', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-02T03:04:05.000Z'));
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(35));
    vi.stubGlobal('crypto', { getRandomValues });

    expect(generateUID('button')).toMatch(/^button-[a-z0-9]+-[a-z0-9]{4}$/);
    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(isGlobalID('$target')).toBe(true);
    expect(isGlobalID('target')).toBe(false);
  });

  it('serialises parsed layout lengths and preserves unrelated layout fields', () => {
    expect(lengthToCss({ value: 10, unit: 'px' })).toBe('10px');
    expect(lengthToCss(undefined)).toBeUndefined();
    expect(
      compressLayoutBox({
        left: { value: 10, unit: '%' },
        top: { value: 4, unit: 'px' },
        width: { value: 20, unit: 'vw' },
        height: 'auto',
        anchor: 'center',
      }),
    ).toEqual({
      left: '10%',
      top: '4px',
      right: undefined,
      bottom: undefined,
      width: '20vw',
      height: undefined,
      anchor: 'center',
    });
  });

  it('implements vector, geometry, conversion and deadzone math', () => {
    expect(subVec({ x: 4, y: 2 }, { x: 1, y: 5 })).toEqual({ x: 3, y: -3 });
    expect(addVec({ x: 4, y: 2 }, { x: 1, y: 5 })).toEqual({ x: 5, y: 7 });
    expect(scaleVec({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 });
    expect(clamp(12, 0, 10)).toBe(10);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(roundTo(1.235, 2)).toBe(1.24);
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(getAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
    expect(radToDeg(Math.PI)).toBe(180);
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(clampVector({ x: 0, y: 0 }, { x: 6, y: 8 }, 5)).toMatchObject({
      x: expect.closeTo(3),
      y: expect.closeTo(4),
    });
    expect(lockTo8Directions(Math.PI / 5)).toBeCloseTo(Math.PI / 4);
    expect(lockTo4Directions(Math.PI / 3)).toBeCloseTo(Math.PI / 2);
    expect(percentToPx(12.5, 80)).toBe(10);
    expect(pxToPercent(10, 80)).toBe(12.5);
    expect(pxToPercent(1, 0)).toBe(0);
    expect(normalizeVec({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
    expect(normalizeVec({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(radToVec(Math.PI / 2).x).toBeCloseTo(0);
    expect(radToVec(Math.PI / 2).y).toBeCloseTo(1);
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
    expect(remap(20, 0, 10, 0, 100)).toBe(100);
    expect(isVec2Equal({ x: 1, y: 1 }, { x: 1.00001, y: 0.99999 })).toBe(true);
    expect(getDeadzoneScalar(0.5, 0.2, 1)).toBeCloseTo(0.375);
    expect(getDeadzoneScalar(0.1, 0.2, 1)).toBe(0);
    expect(applyRadialDeadzone({ x: 0.1, y: 0 }, 1, 0.2)).toEqual({ x: 0, y: 0 });
    expect(applyRadialDeadzone({ x: 1, y: 0 }, 1, 0.2)).toEqual({ x: 1, y: 0 });
    expect(applyAxialDeadzone({ x: -0.6, y: 0.1 }, 1, 0.2)).toMatchObject({
      x: expect.closeTo(-0.5),
      y: 0,
    });
  });

  it('clones, filters, diffs and merges configuration objects', () => {
    const original = { nested: { value: 1 }, ignored: undefined, kept: 'yes' };
    const cloned = altDeepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.nested).not.toBe(original.nested);
    expect(filterObjectByKeys(original, new Set(['nested']))).toEqual({ kept: 'yes' });
    expect(
      getObjectDiff({ same: 1, object: { x: 1 } }, { same: 1, object: { x: 1 }, added: true }),
    ).toEqual({
      added: true,
    });
    expect(getObjectDiff(null as any, { full: true })).toEqual({ full: true });
    expect(mergeObjects<{ a: number; b: number }>({ a: 1 }, null as any, { b: 2, a: 3 })).toEqual({
      a: 3,
      b: 2,
    });
  });
});
