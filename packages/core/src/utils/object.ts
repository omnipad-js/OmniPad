/**
 * Creates a deep clone of the given object using the native `structuredClone` API.
 * Falls back to `JSON.parse(JSON.stringify())` in environments where `structuredClone`
 * is unavailable (e.g., older browsers or Node.js versions).
 *
 * @param object - The source object to be cloned.
 * @returns A deep copy of the original object.
 *
 * @remarks
 * - If `structuredClone` is used, it supports circular references and complex types like `Map`, `Set`, and `Date`.
 * - If the JSON fallback is used, functions, Symbols, and circular references will cause errors or data loss.
 * - This function does not clone class instances (prototypes) or functions.
 */
export function altDeepClone(object: Record<string, any>) {
  return object && typeof structuredClone === 'function'
    ? structuredClone(object)
    : JSON.parse(JSON.stringify(object));
}

/**
 * Filters an object by removing undefined values and specific excluded keys.
 *
 * @param obj - The source object.
 * @param excludeKeys - A set of keys to be ignored.
 * @returns A new object containing only allowed business properties.
 */
export function filterObjectByKeys(
  obj: Record<string, any>,
  excludeKeys: Set<string>,
): Record<string, any> {
  const result: Record<string, any> = {};

  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];

    if (value !== undefined && !excludeKeys.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Compares two objects and extracts the properties that have changed.
 *
 * This function performs a shallow comparison of keys. For nested objects,
 * it performs a structural check to determine if
 * the contents have changed.
 *
 * @param oldObj - The previous state or snapshot of the object.
 * @param newObj - The new state of the object to compare against the old one.
 * @returns A partial record containing only the key-value pairs that differ from the original.
 */
export function getObjectDiff(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
): Record<string, any> {
  const diff: Record<string, any> = {};

  // If the previous state doesn't exist, the entire new object is considered a change
  if (!oldObj) return { ...newObj };

  const keys = Object.keys(newObj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const newVal = newObj[key];
    const oldVal = oldObj[key];

    // Handle nested objects (like LayoutBox) via structural comparison
    if (newVal !== oldVal) {
      // For performance in this specific use case, we use JSON stringification
      // to detect changes in nested layout properties.
      if (typeof newVal === 'object' && newVal !== null && oldVal !== null) {
        if (JSON.stringify(newVal) === JSON.stringify(oldVal)) continue;
      }
      // Handle primitive types (string, number, boolean)
      diff[key] = newVal;
    }
  }
  return diff;
}

/**
 * Merges multiple objects from left to right.
 * Later objects will override properties of earlier ones.
 *
 * @template T - The expected return type.
 * @param objects - A list of objects to merge.
 * @returns The merged object as type T.
 */
export function mergeObjects<T>(...objects: Record<string, any>[]): T {
  return objects.reduce((acc, obj) => {
    if (!obj) return acc;
    return { ...acc, ...obj };
  }, {} as any) as T;
}
