import { LayoutBox, ParsedLength } from '../types';

/**
 * Convert the ParsedLength back to a CSS string
 */
export const lengthToCss = (parsed: ParsedLength | undefined): string | undefined => {
  return parsed == null ? undefined : `${parsed.value}${parsed.unit}`;
};

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
