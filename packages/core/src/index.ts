import { CONTEXT, KEYS, CMP_TYPES, ACTION_TYPES } from './types';

export * from './types';
export * from './utils';

export { InputManager } from './imputManager';
export { Registry } from './registry';

export { BaseEntity } from './entities/BaseEntity';
export { DPadCore } from './entities/DPadCore';
export { InputZoneCore } from './entities/InputZoneCore';
export { KeyboardButtonCore } from './entities/KeyboardButtonCore';
export { MouseButtonCore } from './entities/MouseButtonCore';
export { RootLayerCore } from './entities/RootLayerCore';
export { TargetZoneCore } from './entities/TargetZoneCore';
export { TrackpadCore } from './entities/TrackpadCore';

export const OmniPad = {
  ActionTypes: ACTION_TYPES,
  Context: CONTEXT,
  Keys: KEYS,
  Types: CMP_TYPES,
};
