import { Vec2 } from '.';

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

/**
 * Standard key mapping table optimized for Ruffle/Flash environments.
 * Categorized and ordered by keyCode in ascending order.
 */
const STANDARD_KEYS = {
  // --- System Controls (8-27) ---
  Backspace: { type: 'keyboard', key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Tab: { type: 'keyboard', key: 'Tab', code: 'Tab', keyCode: 9 },
  Enter: { type: 'keyboard', key: 'Enter', code: 'Enter', keyCode: 13 },
  ShiftLeft: { type: 'keyboard', key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
  ControlLeft: { type: 'keyboard', key: 'Control', code: 'ControlLeft', keyCode: 17 },
  AltLeft: { type: 'keyboard', key: 'Alt', code: 'AltLeft', keyCode: 18 },
  Pause: { type: 'keyboard', key: 'Pause', code: 'Pause', keyCode: 19 },
  CapsLock: { type: 'keyboard', key: 'CapsLock', code: 'CapsLock', keyCode: 20 },
  Escape: { type: 'keyboard', key: 'Escape', code: 'Escape', keyCode: 27 },

  // --- Navigation & Editing (32-46) ---
  Space: { type: 'keyboard', key: ' ', code: 'Space', keyCode: 32 },
  PageUp: { type: 'keyboard', key: 'PageUp', code: 'PageUp', keyCode: 33 },
  PageDown: { type: 'keyboard', key: 'PageDown', code: 'PageDown', keyCode: 34 },
  End: { type: 'keyboard', key: 'End', code: 'End', keyCode: 35 },
  Home: { type: 'keyboard', key: 'Home', code: 'Home', keyCode: 36 },
  ArrowLeft: { type: 'keyboard', key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { type: 'keyboard', key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { type: 'keyboard', key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { type: 'keyboard', key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  PrintScreen: { type: 'keyboard', key: 'PrintScreen', code: 'PrintScreen', keyCode: 44 },
  Insert: { type: 'keyboard', key: 'Insert', code: 'Insert', keyCode: 45 },
  Delete: { type: 'keyboard', key: 'Delete', code: 'Delete', keyCode: 46 },

  // --- Digit Keys 0-9 (48-57) ---
  Digit0: { type: 'keyboard', key: '0', code: 'Digit0', keyCode: 48 },
  Digit1: { type: 'keyboard', key: '1', code: 'Digit1', keyCode: 49 },
  Digit2: { type: 'keyboard', key: '2', code: 'Digit2', keyCode: 50 },
  Digit3: { type: 'keyboard', key: '3', code: 'Digit3', keyCode: 51 },
  Digit4: { type: 'keyboard', key: '4', code: 'Digit4', keyCode: 52 },
  Digit5: { type: 'keyboard', key: '5', code: 'Digit5', keyCode: 53 },
  Digit6: { type: 'keyboard', key: '6', code: 'Digit6', keyCode: 54 },
  Digit7: { type: 'keyboard', key: '7', code: 'Digit7', keyCode: 55 },
  Digit8: { type: 'keyboard', key: '8', code: 'Digit8', keyCode: 56 },
  Digit9: { type: 'keyboard', key: '9', code: 'Digit9', keyCode: 57 },

  // --- Alpha Keys A-Z (65-90) ---
  KeyA: { type: 'keyboard', key: 'a', code: 'KeyA', keyCode: 65 },
  KeyB: { type: 'keyboard', key: 'b', code: 'KeyB', keyCode: 66 },
  KeyC: { type: 'keyboard', key: 'c', code: 'KeyC', keyCode: 67 },
  KeyD: { type: 'keyboard', key: 'd', code: 'KeyD', keyCode: 68 },
  KeyE: { type: 'keyboard', key: 'e', code: 'KeyE', keyCode: 69 },
  KeyF: { type: 'keyboard', key: 'f', code: 'KeyF', keyCode: 70 },
  KeyG: { type: 'keyboard', key: 'g', code: 'KeyG', keyCode: 71 },
  KeyH: { type: 'keyboard', key: 'h', code: 'KeyH', keyCode: 72 },
  KeyI: { type: 'keyboard', key: 'i', code: 'KeyI', keyCode: 73 },
  KeyJ: { type: 'keyboard', key: 'j', code: 'KeyJ', keyCode: 74 },
  KeyK: { type: 'keyboard', key: 'k', code: 'KeyK', keyCode: 75 },
  KeyL: { type: 'keyboard', key: 'l', code: 'KeyL', keyCode: 76 },
  KeyM: { type: 'keyboard', key: 'm', code: 'KeyM', keyCode: 77 },
  KeyN: { type: 'keyboard', key: 'n', code: 'KeyN', keyCode: 78 },
  KeyO: { type: 'keyboard', key: 'o', code: 'KeyO', keyCode: 79 },
  KeyP: { type: 'keyboard', key: 'p', code: 'KeyP', keyCode: 80 },
  KeyQ: { type: 'keyboard', key: 'q', code: 'KeyQ', keyCode: 81 },
  KeyR: { type: 'keyboard', key: 'r', code: 'KeyR', keyCode: 82 },
  KeyS: { type: 'keyboard', key: 's', code: 'KeyS', keyCode: 83 },
  KeyT: { type: 'keyboard', key: 't', code: 'KeyT', keyCode: 84 },
  KeyU: { type: 'keyboard', key: 'u', code: 'KeyU', keyCode: 85 },
  KeyV: { type: 'keyboard', key: 'v', code: 'KeyV', keyCode: 86 },
  KeyW: { type: 'keyboard', key: 'w', code: 'KeyW', keyCode: 87 },
  KeyX: { type: 'keyboard', key: 'x', code: 'KeyX', keyCode: 88 },
  KeyY: { type: 'keyboard', key: 'y', code: 'KeyY', keyCode: 89 },
  KeyZ: { type: 'keyboard', key: 'z', code: 'KeyZ', keyCode: 90 },

  // --- Meta & Menu (91-93) ---
  MetaLeft: { type: 'keyboard', key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  ContextMenu: { type: 'keyboard', key: 'ContextMenu', code: 'ContextMenu', keyCode: 93 },

  // --- Numpad Digits (96-105) ---
  Numpad0: { type: 'keyboard', key: '0', code: 'Numpad0', keyCode: 96 },
  Numpad1: { type: 'keyboard', key: '1', code: 'Numpad1', keyCode: 97 },
  Numpad2: { type: 'keyboard', key: '2', code: 'Numpad2', keyCode: 98 },
  Numpad3: { type: 'keyboard', key: '3', code: 'Numpad3', keyCode: 99 },
  Numpad4: { type: 'keyboard', key: '4', code: 'Numpad4', keyCode: 100 },
  Numpad5: { type: 'keyboard', key: '5', code: 'Numpad5', keyCode: 101 },
  Numpad6: { type: 'keyboard', key: '6', code: 'Numpad6', keyCode: 102 },
  Numpad7: { type: 'keyboard', key: '7', code: 'Numpad7', keyCode: 103 },
  Numpad8: { type: 'keyboard', key: '8', code: 'Numpad8', keyCode: 104 },
  Numpad9: { type: 'keyboard', key: '9', code: 'Numpad9', keyCode: 105 },

  // --- Numpad Symbols (106-111) ---
  NumpadMultiply: { type: 'keyboard', key: '*', code: 'NumpadMultiply', keyCode: 106 },
  NumpadAdd: { type: 'keyboard', key: '+', code: 'NumpadAdd', keyCode: 107 },
  NumpadSubtract: { type: 'keyboard', key: '-', code: 'NumpadSubtract', keyCode: 109 },
  NumpadDecimal: { type: 'keyboard', key: '.', code: 'NumpadDecimal', keyCode: 110 },
  NumpadDivide: { type: 'keyboard', key: '/', code: 'NumpadDivide', keyCode: 111 },

  // --- Function Keys (112-123) ---
  F1: { type: 'keyboard', key: 'F1', code: 'F1', keyCode: 112 },
  F2: { type: 'keyboard', key: 'F2', code: 'F2', keyCode: 113 },
  F3: { type: 'keyboard', key: 'F3', code: 'F3', keyCode: 114 },
  F4: { type: 'keyboard', key: 'F4', code: 'F4', keyCode: 115 },
  F5: { type: 'keyboard', key: 'F5', code: 'F5', keyCode: 116 },
  F6: { type: 'keyboard', key: 'F6', code: 'F6', keyCode: 117 },
  F7: { type: 'keyboard', key: 'F7', code: 'F7', keyCode: 118 },
  F8: { type: 'keyboard', key: 'F8', code: 'F8', keyCode: 119 },
  F9: { type: 'keyboard', key: 'F9', code: 'F9', keyCode: 120 },
  F10: { type: 'keyboard', key: 'F10', code: 'F10', keyCode: 121 },
  F11: { type: 'keyboard', key: 'F11', code: 'F11', keyCode: 122 },
  F12: { type: 'keyboard', key: 'F12', code: 'F12', keyCode: 123 },

  // --- State Locks (144-145) ---
  NumLock: { type: 'keyboard', key: 'NumLock', code: 'NumLock', keyCode: 144 },
  ScrollLock: { type: 'keyboard', key: 'ScrollLock', code: 'ScrollLock', keyCode: 145 },

  // --- Punctuation (186-222) ---
  Semicolon: { type: 'keyboard', key: ';', code: 'Semicolon', keyCode: 186 },
  Equal: { type: 'keyboard', key: '=', code: 'Equal', keyCode: 187 },
  Comma: { type: 'keyboard', key: ',', code: 'Comma', keyCode: 188 },
  Minus: { type: 'keyboard', key: '-', code: 'Minus', keyCode: 189 },
  Period: { type: 'keyboard', key: '.', code: 'Period', keyCode: 190 },
  Slash: { type: 'keyboard', key: '/', code: 'Slash', keyCode: 191 },
  Backquote: { type: 'keyboard', key: '`', code: 'Backquote', keyCode: 192 },
  BracketLeft: { type: 'keyboard', key: '[', code: 'BracketLeft', keyCode: 219 },
  Backslash: { type: 'keyboard', key: '\\', code: 'Backslash', keyCode: 220 },
  BracketRight: { type: 'keyboard', key: ']', code: 'BracketRight', keyCode: 221 },
  Quote: { type: 'keyboard', key: "'", code: 'Quote', keyCode: 222 },

  // --- Mouse ---
  Mouse: { type: 'mouse', button: 0 },
  MouseLeft: { type: 'mouse', button: 0 },
  MouseMiddle: { type: 'mouse', button: 1 },
  MouseRight: { type: 'mouse', button: 2 },
} as const satisfies Record<string, KeyMapping>;

/**
 * Standard collection of key mappings.
 * Allows developers to quickly retrieve mapping data using physical key codes as keys.
 */
export const KEYS = STANDARD_KEYS;

export type ActionMapping = KeyMapping | keyof typeof STANDARD_KEYS;
