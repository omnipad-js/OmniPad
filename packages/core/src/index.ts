import { CONTEXT, KEYS, CMP_TYPES, ACTION_TYPES } from './types';

export * from './types';

export { GamepadManager } from './dom/GamepadManager';
export { ElementObserver } from './dom/ElementObserver';
export { Registry, setGlobalSignalHandler } from './registry';
export { WindowManager } from './dom/WindowManager';

export { BaseEntity } from './entities/BaseEntity';
export { ButtonCore } from './entities/ButtonCore';
export { DPadCore } from './entities/DPadCore';
export { InputZoneCore } from './entities/InputZoneCore';
export { JoystickCore } from './entities/JoystickCore';
export { RootLayerCore } from './entities/RootLayerCore';
export { TargetZoneCore } from './entities/TargetZoneCore';
export { TrackpadCore } from './entities/TrackpadCore';

export const OmniPad = {
  ActionTypes: ACTION_TYPES,
  Context: CONTEXT,
  Keys: KEYS,
  Types: CMP_TYPES,
};
