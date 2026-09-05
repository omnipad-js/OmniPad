import { OmniPad } from '@omnipad/core/const';
import type { ButtonConfig } from '@omnipad/core';
import { describe, expect, it } from 'vitest';
import { resolveWidgetConfig } from './config';

describe('resolveWidgetConfig', () => {
  it('merges defaults, tree data, direct options, and DOM parent context', () => {
    const parent = document.createElement('div');
    parent.dataset.omnipadParentId = 'dom-parent';
    const container = document.createElement('div');
    parent.appendChild(container);

    const result = resolveWidgetConfig<ButtonConfig>(
      OmniPad.Types.BUTTON,
      container,
      {
        widgetId: 'explicit-button',
        label: 'option label',
        layout: { width: 48 },
        treeNode: {
          uid: 'tree-button',
          type: 'custom-button',
          config: {
            baseType: OmniPad.Types.BUTTON,
            parentId: 'tree-parent',
            label: 'tree label',
            layout: { left: 10, top: 20 },
          },
        },
      },
      { label: 'default label', layout: { height: 30, left: 1 } },
    );

    expect(result.uid).toBe('explicit-button');
    expect(result.customType).toBe('custom-button');
    expect(result.initialConfig).toMatchObject({
      id: 'explicit-button',
      baseType: OmniPad.Types.BUTTON,
      parentId: 'tree-parent',
      label: 'option label',
      layout: { left: 10, top: 20, width: 48, height: 30 },
    });
  });

  it('uses generated identity only when no node or explicit ID is supplied', () => {
    const result = resolveWidgetConfig(
      OmniPad.Types.TRACKPAD,
      document.createElement('div'),
      { parentId: 'manual-parent', layout: { width: 10 } },
      { label: 'TRACKPAD', layout: { height: 10 } },
    );

    expect(result.uid).toMatch(/^trackpad-/);
    expect(result.initialConfig).toMatchObject({
      id: result.uid,
      baseType: OmniPad.Types.TRACKPAD,
      parentId: 'manual-parent',
      layout: { width: 10, height: 10 },
    });
  });
});
