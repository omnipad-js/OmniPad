import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  flattenRelativeLayout,
  parseLength,
  projectPercentToBox,
  projectVectorToBox,
  resolveLayoutStyle,
  sanitizeParsedLength,
  validateLayoutBox,
} from './layout';
import { sanitizeCssClass, sanitizeDomString, sanitizePrototypePollution } from './security';
import { StickyProvider } from './spatial';

describe('web layout and security utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses, validates and resolves safe layout values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseLength(12)).toEqual({ value: 12, unit: 'px' });
    expect(parseLength(' 25% ')).toEqual({ value: 25, unit: '%' });
    expect(parseLength('oops')).toEqual({ value: 0, unit: 'px' });
    expect(parseLength({ value: 2, unit: 'evil' as any })).toEqual({ value: 2, unit: 'px' });
    expect(sanitizeParsedLength({ value: Number.NaN, unit: 'px' })).toEqual({
      value: 0,
      unit: 'px',
    });
    expect(warn).toHaveBeenCalled();

    const layout = validateLayoutBox({
      left: '10%',
      top: 20,
      width: '40px',
      stickySelector: '<script>',
    });
    expect(layout).toMatchObject({
      left: { value: 10, unit: '%' },
      top: { value: 20, unit: 'px' },
      width: { value: 40, unit: 'px' },
      stickySelector: '',
    });
    expect(
      resolveLayoutStyle({ left: '50%', top: '50%', anchor: 'center', isSquare: true }),
    ).toEqual({
      position: 'absolute',
      aspectRatio: '1/1',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    });
    expect(
      resolveLayoutStyle({ stickySelector: '#canvas', right: 10, bottom: 5, zIndex: 4 }),
    ).toEqual({
      position: 'fixed',
      right: '10px',
      bottom: '5px',
      zIndex: 4,
    });
  });

  it('flattens explicit and stretched layouts against a reference rect', () => {
    const reference = { left: 100, top: 50, right: 500, bottom: 250, width: 400, height: 200 };
    expect(
      flattenRelativeLayout({ left: '10%', top: '20px', width: '25%', height: '50%' }, reference),
    ).toMatchObject({
      left: '140px',
      top: '70px',
      width: '100px',
      height: '100px',
      right: undefined,
      bottom: undefined,
    });
    expect(
      flattenRelativeLayout(
        { left: '10px', right: '30px', top: '20px', bottom: '40px' },
        reference,
      ),
    ).toMatchObject({
      left: '110px',
      top: '70px',
      width: '360px',
      height: '140px',
    });
  });

  it('projects vectors and percentages to fixed pixels or container-query units', () => {
    expect(projectVectorToBox({ x: -1, y: 1 }, { x: 200, y: 100 })).toEqual({
      width: '200px',
      height: '100px',
      x: '0px',
      y: '100px',
    });
    expect(projectVectorToBox({ x: 0, y: 0 }, { x: 0, y: 0 }, true)).toEqual({
      width: '100cqw',
      height: '100cqh',
      x: '50cqw',
      y: '50cqh',
    });
    expect(projectPercentToBox({ x: 25, y: 75 }, () => ({ x: 200, y: 100 }))).toEqual({
      width: '200px',
      height: '100px',
      x: '50px',
      y: '75px',
    });
  });

  it('blocks unsafe DOM/config data while preserving safe strings and nested arrays', () => {
    expect(sanitizeDomString(' .game > canvas ')).toBe('.game > canvas');
    expect(sanitizeDomString('javascript:alert(1)', 'fallback')).toBe('fallback');
    expect(sanitizeDomString('x'.repeat(257), 'fallback')).toBe('fallback');
    expect(sanitizeCssClass('safe other <script> also_safe')).toBe('safe other also_safe');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      sanitizePrototypePollution({
        safe: true,
        nested: { constructor: 'bad', valid: 1 },
        list: [{ prototype: 'bad', kept: 2 }],
      }),
    ).toEqual({ safe: true, nested: { valid: 1 }, list: [{ kept: 2 }] });
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('caches sticky targets and invalidates rects when selectors change', () => {
    const first = { id: 'first', connected: true };
    const second = { id: 'second', connected: true };
    const find = vi.fn((selector: string) => (selector === '#first' ? first : second));
    const rect = vi.fn((target: { id: string }) => ({
      left: target.id === 'first' ? 1 : 2,
      top: 0,
      right: 10,
      bottom: 10,
      width: 9,
      height: 10,
    }));
    const provider = new StickyProvider('#first', find, rect, (target) => target.connected);

    expect(provider.getTarget()).toBe(first);
    expect(provider.getTarget()).toBe(first);
    expect(find).toHaveBeenCalledOnce();
    expect(provider.getRect()?.left).toBe(1);
    provider.markDirty();
    expect(provider.getRect()?.left).toBe(1);
    expect(rect).toHaveBeenCalledTimes(2);
    expect(provider.updateSelector('#first')).toBe(false);
    expect(provider.updateSelector('#second')).toBe(true);
    expect(provider.getTarget()).toBe(second);
    expect(provider.getRect()?.left).toBe(2);
  });
});
