import { describe, expect, it } from 'vitest';
import * as Core from './index';
import { OmniPad } from './constants';
import * as Utils from './utils';

describe('core public entry points', () => {
  it('exports the documented runtime classes, constants and utility surface', () => {
    expect(Core.ButtonCore).toBeTypeOf('function');
    expect(Core.GamepadManager).toBeTypeOf('function');
    expect(Core.parseProfileForest).toBeTypeOf('function');
    expect(Utils.clamp(4, 0, 3)).toBe(3);
    expect(OmniPad.Types.BUTTON).toBe('button');
    expect(OmniPad.CssUnits).toContain('px');
    expect(OmniPad.Keys.Enter.code).toBe('Enter');
    expect(OmniPad.GamepadKeys.A).toBe(0);
  });
});
