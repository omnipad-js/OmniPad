import { Vec2 } from '.';

/**
 * Interface defining the structure of a keyboard key mapping.
 * Ensures compatibility between modern web standards and legacy Flash requirements.
 */
export interface KeyMapping {
  /**
   * The key value, corresponding to `KeyboardEvent.key`.
   * Represented as a string (e.g., " ", "Enter", "a").
   */
  key: string;

  /**
   * The physical key code, corresponding to `KeyboardEvent.code`.
   * Describes the physical location of the key (e.g., "Space", "Enter", "KeyA").
   */
  code: string;

  /**
   * The legacy numerical key code, corresponding to `KeyboardEvent.keyCode`.
   * Essential for Flash engines (AS2/AS3) running via Ruffle.
   * e.g., 32 for Space, 13 for Enter.
   */
  keyCode: number;
}

/**
 * Unified action definition.
 * Discriminated by the 'type' field, but shares a common structure for ease of use.
 */
export interface ActionMapping {
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

/**
 * Standard key mapping table optimized for Ruffle/Flash environments.
 * Categorized and ordered by keyCode in ascending order.
 */
const STANDARD_KEYS = {
  // --- System Controls (8-27) ---
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  ShiftLeft: { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
  ControlLeft: { key: 'Control', code: 'ControlLeft', keyCode: 17 },
  AltLeft: { key: 'Alt', code: 'AltLeft', keyCode: 18 },
  Pause: { key: 'Pause', code: 'Pause', keyCode: 19 },
  CapsLock: { key: 'CapsLock', code: 'CapsLock', keyCode: 20 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },

  // --- Navigation & Editing (32-46) ---
  Space: { key: ' ', code: 'Space', keyCode: 32 },
  PageUp: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  PageDown: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  End: { key: 'End', code: 'End', keyCode: 35 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  PrintScreen: { key: 'PrintScreen', code: 'PrintScreen', keyCode: 44 },
  Insert: { key: 'Insert', code: 'Insert', keyCode: 45 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },

  // --- Digit Keys 0-9 (48-57) ---
  Digit0: { key: '0', code: 'Digit0', keyCode: 48 },
  Digit1: { key: '1', code: 'Digit1', keyCode: 49 },
  Digit2: { key: '2', code: 'Digit2', keyCode: 50 },
  Digit3: { key: '3', code: 'Digit3', keyCode: 51 },
  Digit4: { key: '4', code: 'Digit4', keyCode: 52 },
  Digit5: { key: '5', code: 'Digit5', keyCode: 53 },
  Digit6: { key: '6', code: 'Digit6', keyCode: 54 },
  Digit7: { key: '7', code: 'Digit7', keyCode: 55 },
  Digit8: { key: '8', code: 'Digit8', keyCode: 56 },
  Digit9: { key: '9', code: 'Digit9', keyCode: 57 },

  // --- Alpha Keys A-Z (65-90) ---
  KeyA: { key: 'a', code: 'KeyA', keyCode: 65 },
  KeyB: { key: 'b', code: 'KeyB', keyCode: 66 },
  KeyC: { key: 'c', code: 'KeyC', keyCode: 67 },
  KeyD: { key: 'd', code: 'KeyD', keyCode: 68 },
  KeyE: { key: 'e', code: 'KeyE', keyCode: 69 },
  KeyF: { key: 'f', code: 'KeyF', keyCode: 70 },
  KeyG: { key: 'g', code: 'KeyG', keyCode: 71 },
  KeyH: { key: 'h', code: 'KeyH', keyCode: 72 },
  KeyI: { key: 'i', code: 'KeyI', keyCode: 73 },
  KeyJ: { key: 'j', code: 'KeyJ', keyCode: 74 },
  KeyK: { key: 'k', code: 'KeyK', keyCode: 75 },
  KeyL: { key: 'l', code: 'KeyL', keyCode: 76 },
  KeyM: { key: 'm', code: 'KeyM', keyCode: 77 },
  KeyN: { key: 'n', code: 'KeyN', keyCode: 78 },
  KeyO: { key: 'o', code: 'KeyO', keyCode: 79 },
  KeyP: { key: 'p', code: 'KeyP', keyCode: 80 },
  KeyQ: { key: 'q', code: 'KeyQ', keyCode: 81 },
  KeyR: { key: 'r', code: 'KeyR', keyCode: 82 },
  KeyS: { key: 's', code: 'KeyS', keyCode: 83 },
  KeyT: { key: 't', code: 'KeyT', keyCode: 84 },
  KeyU: { key: 'u', code: 'KeyU', keyCode: 85 },
  KeyV: { key: 'v', code: 'KeyV', keyCode: 86 },
  KeyW: { key: 'w', code: 'KeyW', keyCode: 87 },
  KeyX: { key: 'x', code: 'KeyX', keyCode: 88 },
  KeyY: { key: 'y', code: 'KeyY', keyCode: 89 },
  KeyZ: { key: 'z', code: 'KeyZ', keyCode: 90 },

  // --- Meta & Menu (91-93) ---
  MetaLeft: { key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  ContextMenu: { key: 'ContextMenu', code: 'ContextMenu', keyCode: 93 },

  // --- Numpad Digits (96-105) ---
  Numpad0: { key: '0', code: 'Numpad0', keyCode: 96 },
  Numpad1: { key: '1', code: 'Numpad1', keyCode: 97 },
  Numpad2: { key: '2', code: 'Numpad2', keyCode: 98 },
  Numpad3: { key: '3', code: 'Numpad3', keyCode: 99 },
  Numpad4: { key: '4', code: 'Numpad4', keyCode: 100 },
  Numpad5: { key: '5', code: 'Numpad5', keyCode: 101 },
  Numpad6: { key: '6', code: 'Numpad6', keyCode: 102 },
  Numpad7: { key: '7', code: 'Numpad7', keyCode: 103 },
  Numpad8: { key: '8', code: 'Numpad8', keyCode: 104 },
  Numpad9: { key: '9', code: 'Numpad9', keyCode: 105 },

  // --- Numpad Symbols (106-111) ---
  NumpadMultiply: { key: '*', code: 'NumpadMultiply', keyCode: 106 },
  NumpadAdd: { key: '+', code: 'NumpadAdd', keyCode: 107 },
  NumpadSubtract: { key: '-', code: 'NumpadSubtract', keyCode: 109 },
  NumpadDecimal: { key: '.', code: 'NumpadDecimal', keyCode: 110 },
  NumpadDivide: { key: '/', code: 'NumpadDivide', keyCode: 111 },

  // --- Function Keys (112-123) ---
  F1: { key: 'F1', code: 'F1', keyCode: 112 },
  F2: { key: 'F2', code: 'F2', keyCode: 113 },
  F3: { key: 'F3', code: 'F3', keyCode: 114 },
  F4: { key: 'F4', code: 'F4', keyCode: 115 },
  F5: { key: 'F5', code: 'F5', keyCode: 116 },
  F6: { key: 'F6', code: 'F6', keyCode: 117 },
  F7: { key: 'F7', code: 'F7', keyCode: 118 },
  F8: { key: 'F8', code: 'F8', keyCode: 119 },
  F9: { key: 'F9', code: 'F9', keyCode: 120 },
  F10: { key: 'F10', code: 'F10', keyCode: 121 },
  F11: { key: 'F11', code: 'F11', keyCode: 122 },
  F12: { key: 'F12', code: 'F12', keyCode: 123 },

  // --- State Locks (144-145) ---
  NumLock: { key: 'NumLock', code: 'NumLock', keyCode: 144 },
  ScrollLock: { key: 'ScrollLock', code: 'ScrollLock', keyCode: 145 },

  // --- Punctuation (186-222) ---
  Semicolon: { key: ';', code: 'Semicolon', keyCode: 186 },
  Equal: { key: '=', code: 'Equal', keyCode: 187 },
  Comma: { key: ',', code: 'Comma', keyCode: 188 },
  Minus: { key: '-', code: 'Minus', keyCode: 189 },
  Period: { key: '.', code: 'Period', keyCode: 190 },
  Slash: { key: '/', code: 'Slash', keyCode: 191 },
  Backquote: { key: '`', code: 'Backquote', keyCode: 192 },
  BracketLeft: { key: '[', code: 'BracketLeft', keyCode: 219 },
  Backslash: { key: '\\', code: 'Backslash', keyCode: 220 },
  BracketRight: { key: ']', code: 'BracketRight', keyCode: 221 },
  Quote: { key: "'", code: 'Quote', keyCode: 222 },
} as const satisfies Record<string, KeyMapping>;

/**
 * Standard collection of key mappings.
 * Allows developers to quickly retrieve mapping data using physical key codes as keys.
 */
export const KEYS = STANDARD_KEYS;
