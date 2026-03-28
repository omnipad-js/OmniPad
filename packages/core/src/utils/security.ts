/**
 * Simple DOM string sanitizer to prevent CSS/JS injection.
 * Validates selectors and class names.
 */

const SAFE_SELECTOR_PATTERN = /^[a-zA-Z0-9\s._#\-*>+~]+$/;
export const DANGEROUS_KEYWORDS = Object.freeze([
  'script',
  'onerror',
  'eval',
  'onload',
  'javascript',
] as const);

/**
 * Sanitizes a string intended for DOM use (selectors, classes, etc.)
 * @param input - The raw string input
 * @param fallback - Returned if input is unsafe
 */
export function sanitizeDomString(input: string | undefined, fallback: string = ''): string {
  if (!input) return fallback;

  const trimmed = input.trim();

  // 1. 长度限制 (防止超长字符串攻击)
  if (trimmed.length > 256) return fallback;

  // 2. 模式匹配：拦截分号(注入)、尖括号(HTML)、javascript: 等
  if (!SAFE_SELECTOR_PATTERN.test(trimmed)) {
    if (import.meta.env?.DEV) {
      console.warn(`[OmniPad-Core] Unsafe DOM string blocked: "${trimmed}"`);
    }
    return fallback;
  }

  // 3. 关键字二次校验
  if (DANGEROUS_KEYWORDS.some((kw) => trimmed.toLowerCase().includes(kw))) {
    return fallback;
  }

  return trimmed;
}

const STRICT_CLASS_PATTERN = /^[a-zA-Z0-9\-_]+$/;

/**
 * Specifically validates and cleans CSS class strings.
 * Ensures it's just a space-separated list of valid class names.
 */
export function sanitizeCssClass(input: string | undefined): string {
  if (!input) return '';
  // 拆分并逐个检查，确保每个类名都合法
  return input
    .split(/\s+/)
    .filter((cls) => STRICT_CLASS_PATTERN.test(cls))
    .join(' ');
}
