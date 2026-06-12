import './style.css';

import { OmniPad } from '@omnipad/core/const';
import { registerComponent } from './component-registry';
import { InputZone } from './input-zone';
import { RootLayer } from './root-layer';
import { TargetZone } from './target-zone';
import { VirtualButton } from './button';
import { VirtualDPad } from './dpad';
import { VirtualJoystick } from './joystick';
import { VirtualTrackpad } from './trackpad';

registerComponent(OmniPad.Types.BUTTON, VirtualButton);
registerComponent(OmniPad.Types.INPUT_ZONE, InputZone);
registerComponent(OmniPad.Types.ROOT_LAYER, RootLayer);
registerComponent(OmniPad.Types.TARGET_ZONE, TargetZone);
registerComponent(OmniPad.Types.TRACKPAD, VirtualTrackpad);
registerComponent(OmniPad.Types.D_PAD, VirtualDPad);
registerComponent(OmniPad.Types.JOYSTICK, VirtualJoystick);

export { InputZone } from './input-zone';
export { RootLayer } from './root-layer';
export { TargetZone } from './target-zone';
export { Button, VirtualButton } from './button';
export { DPad, VirtualDPad } from './dpad';
export { Joystick, VirtualJoystick } from './joystick';
export { Trackpad, VirtualTrackpad } from './trackpad';
export { VirtualLayerBase } from './virtual-layer';
export { ButtonBaseView } from './button-base';
export {
  registerComponent,
  getComponent,
  getComponentSafe,
  hasRegisteredComponent,
  createWidgetFromNode,
} from './component-registry';
export type * from './types';
