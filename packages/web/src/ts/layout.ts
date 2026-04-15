import {
  LayoutBox,
  AnchorPoint,
  CssUnit,
  ParsedLength,
  FlexibleLength,
  AbstractRect,
  Vec2,
} from '@omnipad/core';
import { clamp, lengthToCss } from '@omnipad/core/utils';
import { sanitizeDomString } from './security';
import { OmniPad } from '@omnipad/core/const';

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

  if (!isNaN(value) && (OmniPad.CssUnits as readonly string[]).includes(unit)) {
    return { value, unit };
  }

  // 非法单位，降级为 px
  console.warn(`[OmniPad-Core] Blocked invalid CSS unit: ${unit}`);
  return { value: isNaN(value) ? 0 : value, unit: 'px' };
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
 * Resolves a relative 'absolute' layout configuration into a 'fixed' pixel-based layout.
 *
 * **Transformation:**
 * - **Input:** A `layout` defined relative to the `refRect` (similar to CSS `position: absolute`).
 * - **Output:** A `layout` defined in the same coordinate space as the `refRect` (similar to CSS `position: fixed` or global coordinates).
 *
 * @param layout - The relative layout (e.g., `{ left: '10%' }` of the target).
 * @param refRect - The reference rect used as the "container" for calculation.
 * @param toPx - Optional converter for custom unit handling.
 * @returns A normalized `LayoutBox` with fixed pixel strings.
 */
export function flattenRelativeLayout(
  layout: LayoutBox,
  refRect: AbstractRect,
  toPx?: (p: ParsedLength | undefined, base: number) => number,
): LayoutBox {
  // 1. 解析所有维度参数
  const pL = layout.left !== undefined ? parseLength(layout.left) : null;
  const pR = layout.right !== undefined ? parseLength(layout.right) : null;
  const pT = layout.top !== undefined ? parseLength(layout.top) : null;
  const pB = layout.bottom !== undefined ? parseLength(layout.bottom) : null;
  const pW = layout.width !== undefined ? parseLength(layout.width) : null;
  const pH = layout.height !== undefined ? parseLength(layout.height) : null;

  if (!toPx) {
    toPx = (p: ParsedLength | undefined, base: number) =>
      p ? (p.unit === '%' ? (p.value / 100) * base : p.value) : 0;
  }

  // --- 水平计算 (Horizontal) ---
  let finalWidth: number;
  let finalLeft: number;

  // 优先级 1: 显式指定了宽度 (且不为 0)
  if (pW != null && pW.value !== 0) {
    finalWidth = toPx(pW, refRect.width);
    if (pL != null) {
      finalLeft = refRect.left + toPx(pL, refRect.width);
    } else if (pR != null) {
      finalLeft = refRect.right - toPx(pR, refRect.width) - finalWidth;
    } else {
      finalLeft = refRect.left;
    }
  }
  // 优先级 2: 未指定宽度，或宽度为 0 -> 尝试通过 left/right 边界拉伸
  else {
    const leftOffset = pL != null ? toPx(pL, refRect.width) : 0;
    const rightOffset = pR != null ? toPx(pR, refRect.width) : 0;

    finalLeft = refRect.left + leftOffset;
    // 自动计算剩余宽度：参照物总宽 - 左偏移 - 右偏移
    finalWidth = Math.max(0, refRect.width - leftOffset - rightOffset);
  }

  // --- 垂直计算 (Vertical) ---
  let finalHeight: number;
  let finalTop: number;

  // 优先级 1: 显式指定了高度 (且不为 0)
  if (pH != null && pH.value !== 0) {
    finalHeight = toPx(pH, refRect.height);
    if (pT != null) {
      finalTop = refRect.top + toPx(pT, refRect.height);
    } else if (pB != null) {
      finalTop = refRect.bottom - toPx(pB, refRect.height) - finalHeight;
    } else {
      finalTop = refRect.top;
    }
  }
  // 优先级 2: 未指定高度，或高度为 0 -> 尝试通过 top/bottom 边界拉伸
  else {
    const topOffset = pT != null ? toPx(pT, refRect.height) : 0;
    const bottomOffset = pB != null ? toPx(pB, refRect.height) : 0;

    finalTop = refRect.top + topOffset;
    // 自动计算剩余高度：参照物总高 - 顶偏移 - 底偏移
    finalHeight = Math.max(0, refRect.height - topOffset - bottomOffset);
  }

  // 更新结果对象
  return {
    ...layout,
    left: `${finalLeft}px`,
    top: `${finalTop}px`,
    width: `${finalWidth}px`,
    height: `${finalHeight}px`,
    right: undefined,
    bottom: undefined,
  };
}

/**
 * Converts a LayoutBox configuration into a CSS style object suitable for Vue/React.
 *
 * This utility handles:
 * 1. Unit normalization: Converts numeric values to 'px' strings while preserving unit strings (vh, %, etc.).
 * 2. Positioning: Sets 'absolute' positioning by default.
 * 3. Anchoring: Maps AnchorPoint values to CSS 'transform' translations to ensure
 *    the component's origin matches its defined coordinates.
 *
 * @param layout - The LayoutBox configuration object.
 * @returns A CSS style record object.
 *
 * @example
 * // returns { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
 * resolveLayoutStyle({ left: '50%', top: '50%', anchor: 'center' });
 */
export const resolveLayoutStyle = (layout: LayoutBox): Record<string, string | number> => {
  if (Object.keys(layout ?? {}).length === 0) return {};

  const style: Record<string, string | number> = {};

  // 根据布局模式强制指定定位方式，确保与 LayoutBox 的坐标系统同步
  // Forced positioning mode to maintain consistency with the LayoutBox coordinate system.
  style.position = layout.stickySelector ? 'fixed' : 'absolute';
  // 设置等宽等高；当仅设置单一维度时视为正方形 / Equal width and height; when only one dimension is set, it is treated as a square.
  if (layout.isSquare) style.aspectRatio = '1/1';

  // 1. 处理基础位置和尺寸
  // 遍历标准的 CSS 位置属性
  const fields: (keyof LayoutBox)[] = ['left', 'top', 'right', 'bottom', 'width', 'height'];
  fields.forEach((field) => {
    const rawValue = layout[field];
    if (rawValue != undefined) {
      const parsed = parseLength(rawValue as ParsedLength);
      if (parsed != null) style[field] = lengthToCss(parsed)!;
    }
  });

  // 2. 处理 zIndex
  if (layout.zIndex !== undefined) style.zIndex = layout.zIndex;

  // 3. 核心：处理锚点 (Anchor -> Transform)
  // 通过 translate 偏移，使得开发者设置的 left/top 坐标点 成为组件的“锚定点”
  const anchorMap: Record<AnchorPoint, string> = {
    'top-left': 'translate(0, 0)',
    'top-center': 'translate(-50%, 0)',
    'top-right': 'translate(-100%, 0)',
    'center-left': 'translate(0, -50%)',
    center: 'translate(-50%, -50%)',
    'center-right': 'translate(-100%, -50%)',
    'bottom-left': 'translate(0, -100%)',
    'bottom-center': 'translate(-50%, -100%)',
    'bottom-right': 'translate(-100%, -100%)',
  };

  if (layout.anchor) {
    style.transform = anchorMap[layout.anchor];
  }

  return style;
};

/**
 * Projects a normalized input vector (-1.0 to 1.0) onto a CSS layout box.
 * Ideal for components that move relative to a center point, such as joystick handles.
 *
 * @param vec - The input vector where (0,0) is center and 1.0 is the boundary.
 * @param size - The actual pixel dimensions of the container.
 * @param useNativeCQ - If true, uses Container Query units (cqw/cqh) for responsive scaling.
 * @returns A CSS-compatible object with width, height, x, and y properties.
 */
export const projectVectorToBox = (
  vec: Vec2,
  size: Vec2,
  useNativeCQ: boolean = false,
): Record<string, string> => {
  // 将区间从 [-1, 1] 映射到 [0, 2] / Map range from [-1, 1] to [0, 2]
  const x = clamp(vec.x + 1, 0, 2);
  const y = clamp(vec.y + 1, 0, 2);

  if (useNativeCQ) {
    return {
      width: '100cqw',
      height: '100cqh',
      // 基于容器查询单位，x*50 得到 0% 到 100% cqw / Based on CQ units, x*50 yields 0% to 100% cqw
      x: `${x * 50}cqw`,
      y: `${y * 50}cqh`,
    };
  } else {
    return {
      width: `${size.x}px`,
      height: `${size.y}px`,
      // 物理像素换算：(x/2) * 尺寸 / Physical pixel conversion: (x/2) * size
      x: `${(x * size.x) / 2}px`,
      y: `${(y * size.y) / 2}px`,
    };
  }
};

/**
 * Projects percentage coordinates (0-100) onto a CSS layout box.
 * Suitable for absolute positioning requirements like virtual cursors or stage markers.
 *
 * @param percent - The coordinate point in percentages.
 * @param getSize - Lazy getter for current physical dimensions of the container.
 * @param useNativeCQ - If true, returns responsive Container Query units.
 * @returns A CSS-compatible object with width, height, x, and y properties.
 */
export const projectPercentToBox = (
  percent: Vec2,
  getSize: () => Vec2,
  useNativeCQ: boolean = false,
): Record<string, string> => {
  // 将 0-100% 转换为 -1.0 到 1.0 向量以便复用 projectVectorToBox 逻辑
  // Convert 0-100% to -1.0 to 1.0 vector to reuse projectVectorToBox logic
  const v = {
    x: percent.x / 50 - 1,
    y: percent.y / 50 - 1,
  };

  return projectVectorToBox(v, useNativeCQ ? v : getSize(), useNativeCQ);
};
