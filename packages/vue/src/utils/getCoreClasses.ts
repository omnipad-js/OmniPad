import {
  OmniPad,
  ButtonCore,
  JoystickCore,
  DPadCore,
  TrackpadCore,
  RootLayerCore,
  InputZoneCore,
  TargetZoneCore,
} from '@omnipad/core';

const CORE_MAP: Record<string, any> = {
  [OmniPad.Types.BUTTON]: ButtonCore,
  [OmniPad.Types.JOYSTICK]: JoystickCore,
  [OmniPad.Types.D_PAD]: DPadCore,
  [OmniPad.Types.TRACKPAD]: TrackpadCore,
  [OmniPad.Types.INPUT_ZONE]: InputZoneCore,
  [OmniPad.Types.TARGET_ZONE]: TargetZoneCore,
  [OmniPad.Types.ROOT_LAYER]: RootLayerCore,
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
