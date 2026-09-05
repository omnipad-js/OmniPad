import { OmniPad } from '@omnipad/core/const';
import { describe, expect, it } from 'vitest';
import * as api from './index';
import * as constants from './const';
import * as guest from './guest';
import * as utils from './utils';

describe('vanilla public API', () => {
  it('exports widgets, Core/Web utilities, constants, and guest IPC helpers', () => {
    expect(api.VirtualButton).toBeTypeOf('function');
    expect(api.VirtualLayerBase).toBeTypeOf('function');
    expect(api.getComponentSafe(OmniPad.Types.BUTTON)).toBe(api.VirtualButton);
    expect(constants.OmniPad.Types.JOYSTICK).toBe(OmniPad.Types.JOYSTICK);
    expect(utils.clamp(9, 0, 5)).toBe(5);
    expect(guest.initIframeReceiver).toBeTypeOf('function');
  });
});
