import { CONTEXT, KEYS, CMP_TYPES, ACTION_TYPES } from './types';

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

export { Registry } from './singletons/Registry';
export { GamepadManager } from './singletons/GamepadManager';

export const OmniPad = {
  ActionTypes: ACTION_TYPES,
  Context: CONTEXT,
  Keys: KEYS,
  Types: CMP_TYPES,
};
