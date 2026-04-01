import {
  CMP_TYPES,
  ButtonCore,
  JoystickCore,
  DPadCore,
  TrackpadCore,
  RootLayerCore,
  InputZoneCore,
  TargetZoneCore,
} from '@omnipad/core';

const CORE_MAP: Record<string, any> = {
  [CMP_TYPES.BUTTON]: ButtonCore,
  [CMP_TYPES.JOYSTICK]: JoystickCore,
  [CMP_TYPES.D_PAD]: DPadCore,
  [CMP_TYPES.TRACKPAD]: TrackpadCore,
  [CMP_TYPES.INPUT_ZONE]: InputZoneCore,
  [CMP_TYPES.TARGET_ZONE]: TargetZoneCore,
  [CMP_TYPES.ROOT_LAYER]: RootLayerCore,
};

/**
 * Retrieve the corresponding core logic class based on the component type.
 */
export function getCoreClass(type: string) {
  const CoreClass = CORE_MAP[type];
  if (!CoreClass) {
    throw new Error(`[OmniPad-Vue] No core logic defined for entity type: "${type}"`);
  }
  return CoreClass;
}
