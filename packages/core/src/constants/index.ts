import { ACTION_TYPES, CMP_TYPES, CONTEXT } from './basic';
import { BUTTON_MAP } from './gamepad';
import { STANDARD_KEYS } from './keys';
import { STANDARD_ANCHORS, VALID_UNITS } from './layout';

export const OmniPad = {
  ActionTypes: ACTION_TYPES,
  Context: CONTEXT,
  CssUnits: VALID_UNITS,
  GamepadKeys: BUTTON_MAP,
  Keys: STANDARD_KEYS,
  StandardAnchors: STANDARD_ANCHORS,
  Types: CMP_TYPES,
};
