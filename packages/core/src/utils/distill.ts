import { AbstractPointerEvent, AbstractRect } from '../types';

/**
 * Blueprints defining which fields should be preserved during the distillation process.
 * schemas specify the "genetic makeup" of abstract types in the runtime.
 */
const BLUEPRINTS = {
  rect: ['left', 'right', 'top', 'bottom', 'width', 'height'] as const,
  pointer: ['pointerId', 'clientX', 'clientY', 'button'] as const,
};

/**
 * A lightweight utility to extract a subset of properties from a source object.
 * Designed for maximum performance by avoiding `for...in` loops and prototype chain lookups.
 *
 * @template T - The source object type.
 * @template K - The keys to be extracted.
 * @param source - The object to extract properties from.
 * @param keys - A readonly array of keys to pick.
 * @returns A new object containing only the specified keys.
 */
function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const result = {} as any;

  // 使用固定长度循环追求极致性能，避开原生对象的几十个冗余属性
  // Perform fixed-length iteration for maximum speed, bypassing dozens of redundant native properties
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = source[key];
  }

  return result;
}

/**
 * Distills a raw Rect-like object into a clean AbstractRect.
 * Useful for converting live DOMRects into serialization-friendly POJOs.
 *
 * @param raw - Any object containing left, right, top, bottom, width, and height.
 * @returns A sanitized AbstractRect object.
 */
export const distillRect = (raw: any): AbstractRect => {
  return pick(raw, BLUEPRINTS.rect) as AbstractRect;
};

/**
 * Distills a PointerEvent-like object into a clean AbstractPointerEvent.
 * Essential for stripping away heavy browser references before cross-origin postMessage transmission.
 *
 * @param raw - Any object containing pointerId, clientX, clientY, and button.
 * @returns A sanitized AbstractPointerEvent object.
 */
export const distillPointer = (raw: any): AbstractPointerEvent => {
  return pick(raw, BLUEPRINTS.pointer) as AbstractPointerEvent;
};

/**
 * Dynamically distills a custom set of fields from a raw object.
 *
 * @template T - The target structure type.
 * @param raw - The source data.
 * @param fields - The list of fields to preserve.
 * @returns The distilled object matching the target structure.
 */
export const distillCustom = <T extends object>(raw: any, fields: readonly (keyof T)[]): T => {
  return pick(raw, fields) as T;
};
