import { LayoutBox, AnchorPoint } from '../types';

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
  if (!layout) return {};

  const style: Record<string, string | number> = {};

  // 强制使用绝对定位，因为 LayoutBox 是基于坐标系的 / Forced use of absolute positioning because LayoutBox is based on a coordinate system.
  style.position = 'absolute';
  // 强制设置等宽等高；当仅设置单一维度时视为正方形 / Force equal width and height; when only one dimension is set, it is treated as a square.
  style.aspectRatio = '1/1';

  // 1. 处理基础位置和尺寸
  // 遍历标准的 CSS 位置属性
  const fields: (keyof LayoutBox)[] = ['left', 'top', 'right', 'bottom', 'width', 'height'];
  fields.forEach((field) => {
    const val = layout[field];
    if (val !== undefined) {
      // 如果是纯数字则补全 px，如果是字符串（如 10vh）则原样保留
      style[field] = typeof val === 'number' ? `${val}px` : val;
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
