import { describe, expect, it } from 'vitest';
import {
  createWidgetFromNode,
  getComponent,
  getComponentSafe,
  hasRegisteredComponent,
  registerComponent,
} from './component-registry';

describe('vanilla component registry', () => {
  it('registers custom widgets and resolves a node through its base type fallback', () => {
    class TestWidget {
      public readonly uid: string;
      public readonly el: HTMLElement;

      public constructor(container: HTMLElement, options: { treeNode?: { uid?: string } } = {}) {
        this.uid = options.treeNode?.uid || 'test-widget';
        this.el = document.createElement('article');
        this.el.dataset.testWidget = 'yes';
        container.appendChild(this.el);
      }

      public destroy(): void {
        this.el.remove();
      }
    }

    registerComponent('test-base-type', TestWidget);
    const container = document.createElement('div');
    const widget = createWidgetFromNode(container, {
      uid: 'from-tree',
      type: 'custom-widget',
      config: { baseType: 'test-base-type' },
    });

    expect(hasRegisteredComponent('test-base-type')).toBe(true);
    expect(getComponentSafe('missing-component')).toBeNull();
    expect(widget.uid).toBe('from-tree');
    expect(widget.el.dataset.testWidget).toBe('yes');
    widget.destroy();
  });

  it('renders an explicit unknown-widget placeholder for unregistered nodes', () => {
    const container = document.createElement('div');
    const Unknown = getComponent('not-registered');
    const widget = new Unknown(container, {
      treeNode: { uid: 'missing-node', type: 'not-registered' },
    });

    expect(widget.el.id).toBe('missing-node');
    expect(widget.el.textContent).toContain('Unknown: not-registered');
    widget.destroy();
  });
});
