import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

describe('playground browser bootstrap', () => {
  it('mounts the application into the conventional #app root', async () => {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);

    await import('./main.js');
    await nextTick();

    expect(root.querySelector('.playground-root')).not.toBeNull();
  });
});
