import { describe, expect, it } from 'vitest';
import {
  addClasses,
  applyLayout,
  asPointerEventListener,
  createDiv,
  normalizeClassList,
  pxSizeFromRect,
  replaceChildren,
  replaceClasses,
  resolveDomParentId,
  setCssVars,
} from './dom';

describe('vanilla DOM helpers', () => {
  it('creates, normalizes, and replaces CSS classes', () => {
    const el = createDiv('one  two');
    addClasses(el, ['three', ' four ']);

    expect(normalizeClassList([' one', 'two  three '])).toEqual(['one', 'two', 'three']);
    expect([...el.classList]).toEqual(expect.arrayContaining(['one', 'two', 'three', 'four']));

    const applied = replaceClasses(el, ['one', 'two'], 'next final');
    expect(applied).toEqual(['next', 'final']);
    expect([...el.classList]).toEqual(expect.arrayContaining(['three', 'four', 'next', 'final']));
    expect(el.classList.contains('one')).toBe(false);
  });

  it('writes layout, CSS variables, children, parent IDs, and pointer listeners', () => {
    const parent = document.createElement('section');
    parent.dataset.omnipadParentId = 'parent-zone';
    const el = createDiv();
    parent.appendChild(el);

    applyLayout(el, {
      left: 12,
      top: '25%',
      width: 40,
      height: 30,
      anchor: 'center',
      zIndex: 4,
    });
    expect(el.style.position).toBe('absolute');
    expect(el.style.left).toBe('12px');
    expect(el.style.top).toBe('25%');
    expect(el.style.transform).toBe('translate(-50%, -50%)');

    setCssVars(el, { '--one': 1, '--two': 'two' });
    setCssVars(el, { '--one': undefined });
    expect(el.style.getPropertyValue('--one')).toBe('');
    expect(el.style.getPropertyValue('--two')).toBe('two');

    const child = document.createElement('span');
    replaceChildren(el, child);
    expect(el.replaceChildren).toBeTypeOf('function');
    expect(el.firstElementChild).toBe(child);
    replaceChildren(el);
    expect(el.childElementCount).toBe(0);

    expect(resolveDomParentId(el)).toBe('parent-zone');
    expect(pxSizeFromRect({ width: 33, height: 44 })).toEqual({ x: 33, y: 44 });
    expect(pxSizeFromRect(null)).toEqual({ x: 0, y: 0 });

    let received: PointerEvent | null = null;
    el.addEventListener(
      'pointerdown',
      asPointerEventListener((event) => {
        received = event;
      }),
    );
    const event = new PointerEvent('pointerdown', { pointerId: 8 });
    el.dispatchEvent(event);
    expect(received).toBe(event);
  });
});
