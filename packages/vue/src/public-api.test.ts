import { OmniPad } from '@omnipad/core/const';
import { describe, expect, it } from 'vitest';
import * as api from './index';
import * as constants from './const';
import * as guest from './guest';
import * as utils from './utils';

describe('Vue public API', () => {
  it('exports adapter components together with Core/Web helpers', () => {
    expect(api.VirtualButton).toBeTruthy();
    expect(api.TargetZone).toBeTruthy();
    expect(api.getComponentSafe(OmniPad.Types.BUTTON)).toBe(api.VirtualButton);
    expect(constants.OmniPad.Types.INPUT_ZONE).toBe(OmniPad.Types.INPUT_ZONE);
    expect(utils.clamp(9, 0, 5)).toBe(5);
    expect(guest.initIframeReceiver).toBeTypeOf('function');
  });
});
