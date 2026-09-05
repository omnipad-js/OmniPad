import { parseProfileForest } from '@omnipad/core';
import { describe, expect, it } from 'vitest';
import profile01 from './profiles/01-button.json';
import profile02 from './profiles/02-trackpad.json';
import profile03 from './profiles/03-dpad.json';
import profile04 from './profiles/04-joystick.json';
import profile05 from './profiles/05-layout-box.json';
import profile06 from './profiles/06-input-zone.json';
import profile07 from './profiles/07-target-zone.json';
import profile08 from './profiles/08-custom-registry.json';
import profile09 from './profiles/09-full-gamepad-layout.json';
import profile10 from './profiles/10-multi-gamepad-layout.json';

const profiles = [
  profile01,
  profile02,
  profile03,
  profile04,
  profile05,
  profile06,
  profile07,
  profile08,
  profile09,
  profile10,
];

describe('playground profile fixtures', () => {
  it.each(profiles)('parses %s into its root forest', (profile) => {
    const parsed = parseProfileForest(JSON.stringify(profile));

    expect(parsed.meta.name).toBeTruthy();
    expect(parsed.roots).toHaveProperty('$left-pad');
    expect(parsed.roots).toHaveProperty('$right-pad');
    expect(parsed.roots).toHaveProperty('$ruffle-player');
  });
});
