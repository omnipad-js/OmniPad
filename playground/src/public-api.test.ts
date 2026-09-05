import { describe, expect, it } from 'vitest';
import { initIframeReceiver } from './iframe-receiver-test-entry';

describe('playground iframe receiver entry', () => {
  it('re-exports the guest IPC initializer used by guest.html', () => {
    expect(initIframeReceiver).toBeTypeOf('function');
  });
});
