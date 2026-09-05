import { describe, expect, it } from 'vitest';
import * as Guest from './guest';
import * as Web from './index';

describe('web public entry points', () => {
  it('exports browser drivers, spatial services, security utilities and guest IPC', () => {
    expect(Web.dispatchKeyboardEvent).toBeTypeOf('function');
    expect(Web.createPointerBridge).toBeTypeOf('function');
    expect(Web.IframeManager).toBeTypeOf('function');
    expect(Web.WindowManager).toBeTypeOf('function');
    expect(Web.validateLayoutBox).toBeTypeOf('function');
    expect(Web.sanitizeDomString('canvas')).toBe('canvas');
    expect(Guest.initIframeReceiver).toBeTypeOf('function');
    expect(Guest.OMNIPAD_IPC_SIGNATURE).toBe('__OMNIPAD_IPC_V1__');
  });
});
