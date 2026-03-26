import './styles/index.css';

import { setGlobalSignalHandler, ACTION_TYPES, CMP_TYPES } from '@omnipad/core';
import { dispatchKeyboardEvent } from '@omnipad/core/utils';
import { registerComponent } from './utils/componentRegistry';
import InputZone from './components/InputZone.vue';
import RootLayer from './components/RootLayer.vue';
import TargetZone from './components/TargetZone.vue';
import VirtualButton from './components/VirtualButton.vue';
import VirtualDPad from './components/VirtualDPad.vue';
import VirtualTrackpad from './components/VirtualTrackpad.vue';
import VirtualJoystick from './components/VirtualJoystick.vue';

registerComponent(CMP_TYPES.BUTTON, VirtualButton);
registerComponent(CMP_TYPES.INPUT_ZONE, InputZone);
registerComponent(CMP_TYPES.ROOT_LAYER, RootLayer);
registerComponent(CMP_TYPES.TARGET_ZONE, TargetZone);
registerComponent(CMP_TYPES.TRACKPAD, VirtualTrackpad);
registerComponent(CMP_TYPES.D_PAD, VirtualDPad);
registerComponent(CMP_TYPES.JOYSTICK, VirtualJoystick);

setGlobalSignalHandler((signal) => {
  if (signal.type === ACTION_TYPES.KEYDOWN || signal.type === ACTION_TYPES.KEYUP) {
    dispatchKeyboardEvent(signal.type as any, signal.payload as any);
  }
});

export {
  InputZone,
  RootLayer,
  TargetZone,
  VirtualButton,
  VirtualDPad,
  VirtualTrackpad,
  VirtualJoystick,
};

export * from './utils/componentRegistry';
