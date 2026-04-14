import {
  ACTION_TYPES,
  BUTTON_MAP,
  CMP_TYPES,
  CONTEXT,
  STANDARD_ANCHORS,
  STANDARD_KEYS,
  VALID_UNITS,
} from './constants';

export * from './runtime';
export * from './types';

export { BaseEntity } from './entities/BaseEntity';
export { ButtonCore } from './entities/ButtonCore';
export { DPadCore } from './entities/DPadCore';
export { InputZoneCore } from './entities/InputZoneCore';
export { JoystickCore } from './entities/JoystickCore';
export { RootLayerCore } from './entities/RootLayerCore';
export { TargetZoneCore } from './entities/TargetZoneCore';
export { TrackpadCore } from './entities/TrackpadCore';

export * from './singletons/Registry';
export * from './singletons/GamepadManager';

export const OmniPad = {
  ActionTypes: ACTION_TYPES,
  Context: CONTEXT,
  CssUnits: VALID_UNITS,
  GamepadKeys: BUTTON_MAP,
  Keys: STANDARD_KEYS,
  StandardAnchors: STANDARD_ANCHORS,
  Types: CMP_TYPES,
};
