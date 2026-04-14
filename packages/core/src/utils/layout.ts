import { LayoutBox, VALID_UNITS, CssUnit, ParsedLength, FlexibleLength } from '../types';
import { sanitizeDomString } from './security';

/**
 * Convert the length input into a sanitized ParsedLength
 *
 * @param input - The raw length input.
 * @returns A sanitized ParsedLength.
 */
export function parseLength(input: FlexibleLength | undefined): ParsedLength | undefined {
  // 1. 处理空值或无效值
  if (input == null) {
    return undefined;
  }

  // 2. 处理 ParsedLength 对象
  if (typeof input === 'object' && 'unit' in input && 'value' in input) {
    return sanitizeParsedLength(input);
  }

  // 3. 处理纯数字：默认 px
  if (typeof input === 'number') {
    return {
      value: Number.isFinite(input) ? input : 0,
      unit: 'px',
    };
  }

  // 4. 处理字符串
  const val = input.trim().toLowerCase();
  const numericPart = parseFloat(val);

  // 检查数字部分是否有效
  if (isNaN(numericPart)) {
    return { value: 0, unit: 'px' };
  }

  // 直接截取剩下的所有内容作为单位
  const unitPart = val.slice(String(numericPart).length).trim();

  return sanitizeParsedLength({ value: numericPart, unit: unitPart as CssUnit });
}

/**
 * Check the whitelist of verification units and sanitize ParsedLength.
 */
export const sanitizeParsedLength = (parsed: ParsedLength): ParsedLength => {
  const { value, unit } = parsed;

  if (!isNaN(value) && (VALID_UNITS as readonly string[]).includes(unit)) {
    return { value, unit };
  }

  // 非法单位，降级为 px
  console.warn(`[OmniPad-Core] Blocked invalid CSS unit: ${unit}`);
  return { value: isNaN(value) ? 0 : value, unit: 'px' };
};

/**
 * Convert the ParsedLength back to a CSS string
 */
export const lengthToCss = (parsed: ParsedLength | undefined): string | undefined => {
  return parsed == null ? undefined : `${parsed.value}${parsed.unit}`;
};

/**
 * Validate a raw LayoutBox config.
 */
export function validateLayoutBox(raw: LayoutBox): LayoutBox {
  return {
    ...raw,
    left: parseLength(raw.left),
    top: parseLength(raw.top),
    right: parseLength(raw.right),
    bottom: parseLength(raw.bottom),
    width: parseLength(raw.width),
    height: parseLength(raw.height),
    // 关键：对选择器和类名进行脱毒处理 / Critical: Sanitize selector and class names
    stickySelector: sanitizeDomString(raw.stickySelector),
  };
}

/**
 * Compress layout properties into css strings.
 */
export function compressLayoutBox(raw: LayoutBox): LayoutBox {
  return {
    ...raw,
    left: lengthToCss(raw.left as any),
    top: lengthToCss(raw.top as any),
    right: lengthToCss(raw.right as any),
    bottom: lengthToCss(raw.bottom as any),
    width: lengthToCss(raw.width as any),
    height: lengthToCss(raw.height as any),
  };
}
