import './styles/index.css';

import { registerComponent } from './utils/componentRegistry';

import InputZone from './components/InputZone.vue';
import RootLayer from './components/RootLayer.vue';
import TargetZone from './components/TargetZone.vue';
import VirtualButton from './components/VirtualButton.vue';
import VirtualDPad from './components/VirtualDPad.vue';
import VirtualTrackpad from './components/VirtualTrackpad.vue';
import VirtualJoystick from './components/VirtualJoystick.vue';
import { OmniPad } from '@omnipad/core';

registerComponent(OmniPad.Types.BUTTON, VirtualButton);
registerComponent(OmniPad.Types.INPUT_ZONE, InputZone);
registerComponent(OmniPad.Types.ROOT_LAYER, RootLayer);
registerComponent(OmniPad.Types.TARGET_ZONE, TargetZone);
registerComponent(OmniPad.Types.TRACKPAD, VirtualTrackpad);
registerComponent(OmniPad.Types.D_PAD, VirtualDPad);
registerComponent(OmniPad.Types.JOYSTICK, VirtualJoystick);

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
