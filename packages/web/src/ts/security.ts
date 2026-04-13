/**
 * Simple DOM string sanitizer to prevent CSS/JS injection.
 * Validates selectors and class names.
 */

const SAFE_SELECTOR_PATTERN = /^[a-zA-Z0-9\s._#$\-*>+~]+$/;

export const PROTO_POLLUTION_KEYS = Object.freeze([
  '__proto__',
  'constructor',
  'prototype',
] as const);

export const XXS_DANGEROUS_KEYWORDS = Object.freeze([
  'script',
  'javascript:',
  'onerror',
  'onload',
  'eval',
  'expression',
] as const);

/**
 * Sanitizes a string intended for DOM use (selectors, classes, etc.)
 * @param input - The raw string input to be sanitized.
 * @param fallback - Returned if input is unsafe.
 */
export function sanitizeDomString(input: string | undefined, fallback: string = ''): string {
  if (!input) return fallback;

  const trimmed = input.trim();

  // 1. 长度限制 (防止超长字符串攻击)
  if (trimmed.length > 256) return fallback;

  // 2. 模式匹配：拦截分号(注入)、尖括号(HTML)、javascript: 等
  if (!SAFE_SELECTOR_PATTERN.test(trimmed)) {
    if (import.meta.env?.DEV) {
      console.warn(`[OmniPad-Validation] Unsafe DOM string blocked: "${trimmed}"`);
    }
    return fallback;
  }

  // 3. 关键字二次校验
  if (XXS_DANGEROUS_KEYWORDS.some((kw) => trimmed.toLowerCase().includes(kw))) {
    return fallback;
  }

  return trimmed;
}

const STRICT_CLASS_PATTERN = /^[a-zA-Z0-9\-_]+$/;

/**
 * Specifically validates and cleans CSS class strings.
 * Ensures it's just a space-separated list of valid class names.
 * @param input - The raw string input to be sanitized.
 */
export function sanitizeCssClass(input: string | undefined): string {
  if (!input) return '';
  // 拆分并逐个检查，确保每个类名都合法
  return input
    .split(/\s+/)
    .filter((cls) => STRICT_CLASS_PATTERN.test(cls))
    .join(' ');
}

/**
 * Recursively sanitizes an object by stripping dangerous prototype-pollution keys.
 *
 * @remarks
 * This function performs a deep traversal of the input and removes keys such as
 * `__proto__`, `constructor`, and `prototype`. It uses an internal closure-based
 * recursion and a pre-allocated `Set` to ensure optimal performance and memory
 * efficiency during deep-tree processing.
 *
 * @param input - The raw data (usually from an untrusted JSON source) to be sanitized.
 * @returns A new object/array cloned from the input, guaranteed to be free of
 * prototype pollution vectors at any depth.
 *
 * @example
 * ```typescript
 * const tainted = JSON.parse('{"__proto__": {"admin": true}, "config": {"prototype": "bad"}}');
 * const safe = sanitizePrototypePollution(tainted);
 * // safe => { config: {} }
 * ```
 */
export function sanitizePrototypePollution<T>(input: T): T {
  // 1. 将 Set 对象外置于递归函数之外（但在主函数内部），仅创建一次
  const forbiddenKeys = new Set([...PROTO_POLLUTION_KEYS]);

  // 2. 内置递归闭包
  const _recursiveSanitize = (data: any): any => {
    // 递归终点：非对象或空值
    if (data === null || typeof data !== 'object') {
      return data;
    }

    // 处理数组：遍历数组项并递归清洗
    if (Array.isArray(data)) {
      return data.map((item) => _recursiveSanitize(item));
    }

    // 处理对象
    const cleanObj: Record<string, any> = {};
    const keys = Object.keys(data);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      // 使用 Set.has 进行 O(1) 级别的快速黑名单检查
      if (forbiddenKeys.has(key as any)) {
        console.warn(`[OmniPad-Security] Stripped dangerous key: "${key}"`);
        continue;
      }

      const value = data[key];
      // 只有当值是对象或数组时才继续递归
      cleanObj[key] =
        value !== null && typeof value === 'object' ? _recursiveSanitize(value) : value;
    }

    return cleanObj;
  };

  return _recursiveSanitize(input);
}
