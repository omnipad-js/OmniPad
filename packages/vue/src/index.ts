import './styles/index.css';

import { CMP_TYPES } from '@omnipad/core';
import { registerComponent } from './utils/componentRegistry';
import InputZone from './components/InputZone.vue';
import RootLayer from './components/RootLayer.vue';
import TargetZone from './components/TargetZone.vue';
import VirtualDPad from './components/VirtualDPad.vue';
import VirtualKeyboardButton from './components/VirtualKeyboardButton.vue';
import VirtualMouseButton from './components/VirtualMouseButton.vue';
import VirtualTrackpad from './components/VirtualTrackpad.vue';

registerComponent(CMP_TYPES.INPUT_ZONE, InputZone);
registerComponent(CMP_TYPES.ROOT_LAYER, RootLayer);
registerComponent(CMP_TYPES.TARGET_ZONE, TargetZone);
registerComponent(CMP_TYPES.KEYBOARD_BUTTON, VirtualKeyboardButton);
registerComponent(CMP_TYPES.MOUSE_BUTTON, VirtualMouseButton);
registerComponent(CMP_TYPES.TRACKPAD, VirtualTrackpad);

export {
  InputZone,
  RootLayer,
  TargetZone,
  VirtualDPad,
  VirtualKeyboardButton,
  VirtualMouseButton,
  VirtualTrackpad,
};

export { registerComponent };
