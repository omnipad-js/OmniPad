import { Vec2 } from '.';
import { STANDARD_KEYS } from '../constants';

/**
 * Interface defining the structure of key mapping.
 * Ensures compatibility between modern web standards and legacy Flash requirements.
 */
export interface KeyMapping {
  /** 指定动作类型：'keyboard' | 'mouse' */
  type: 'keyboard' | 'mouse';

  // --- Keyboard specific (Optional) ---
  key?: string;
  code?: string;
  keyCode?: number;

  // --- Mouse specific (Optional) ---
  /** 0: Left, 1: Middle, 2: Right */
  button?: 0 | 1 | 2;
  /** Fixed coordinate (0-100 percentage) */
  fixedPoint?: Vec2;
}

export type ActionMapping = KeyMapping | keyof typeof STANDARD_KEYS;
