import type { LayoutBox, Vec2 } from '@omnipad/core';
import { resolveLayoutStyle } from '@omnipad/web';

const LAYOUT_STYLE_KEYS = [
  'position',
  'left',
  'top',
  'right',
  'bottom',
  'width',
  'height',
  'zIndex',
  'aspectRatio',
  'transform',
] as const;

export function createDiv(classNames?: string | string[]): HTMLDivElement {
  const el = document.createElement('div');
  addClasses(el, classNames);
  return el;
}

export function addClasses(el: Element, classNames?: string | string[]): void {
  const classes = normalizeClassList(classNames);
  if (classes.length > 0) el.classList.add(...classes);
}

export function normalizeClassList(classNames?: string | string[]): string[] {
  if (!classNames) return [];
  const raw = Array.isArray(classNames) ? classNames.join(' ') : classNames;
  return raw.split(/\s+/).filter(Boolean);
}

export function replaceClasses(
  el: Element,
  previous: string[],
  next?: string | string[],
): string[] {
  if (previous.length > 0) el.classList.remove(...previous);
  const nextClasses = normalizeClassList(next);
  if (nextClasses.length > 0) el.classList.add(...nextClasses);
  return nextClasses;
}

export function applyLayout(el: HTMLElement, layout?: LayoutBox): void {
  for (const key of LAYOUT_STYLE_KEYS) {
    el.style[key] = '';
  }
  if (!layout) return;

  const style = resolveLayoutStyle(layout);
  Object.assign(el.style, style);
}

export function setCssVars(el: HTMLElement, vars: Record<string, string | number | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value == null) {
      el.style.removeProperty(key);
    } else {
      el.style.setProperty(key, String(value));
    }
  }
}

export function replaceChildren(el: HTMLElement, child?: HTMLElement | null): void {
  el.replaceChildren();
  if (child) el.appendChild(child);
}

export function resolveDomParentId(container: HTMLElement): string | undefined {
  const parentEl = container.closest('[data-omnipad-parent-id]');
  return parentEl?.getAttribute('data-omnipad-parent-id') || undefined;
}

export function pxSizeFromRect(rect: { width: number; height: number } | null | undefined): Vec2 {
  return { x: rect?.width || 0, y: rect?.height || 0 };
}

export function asPointerEventListener(handler: (event: PointerEvent) => void): EventListener {
  return (event) => handler(event as PointerEvent);
}
