import { describe, expect, it } from 'vitest';
import { AxisView } from './axis-view';
import { ButtonBaseView } from './button-base';

describe('vanilla primitive views', () => {
  it('updates the button default and custom render layers', () => {
    const view = new ButtonBaseView();
    view.update({
      layout: { left: 2, top: 3, width: 40, height: 40 },
      isActive: true,
      label: 'Jump',
    });

    expect(
      view.el.querySelector('.omnipad-default-button-base')?.classList.contains('is-active'),
    ).toBe(true);
    expect(view.el.querySelector('.omnipad-default-button-label')?.textContent).toBe('Jump');

    const customBase = document.createElement('i');
    const customContent = document.createElement('b');
    view.update({
      isActive: false,
      renderBase: () => customBase,
      renderContent: () => customContent,
    });
    expect(view.el.contains(customBase)).toBe(true);
    expect(view.el.contains(customContent)).toBe(true);

    view.update({ isActive: false, label: '' });
    expect(
      (view.el.querySelector('.omnipad-default-button-label') as HTMLElement | null)?.style.display,
    ).toBe('none');
  });

  it('projects axis state and supports custom stick/content rendering', () => {
    const root = document.createElement('div');
    const view = new AxisView(root);
    const customStick = document.createElement('i');
    const customContent = document.createElement('b');
    const state = { isActive: true, pointerId: 1, vector: { x: 1, y: -1 } };

    view.update({
      state,
      showStick: true,
      baseSize: { x: 100, y: 80 },
      renderStick: () => customStick,
      renderContent: () => customContent,
    });

    expect(root.classList.contains('is-active')).toBe(true);
    expect(view.stickContainer.style.getPropertyValue('--omnipad-axis-stick-container-x')).toBe(
      '100px',
    );
    expect(view.stickContainer.style.getPropertyValue('--omnipad-axis-stick-container-y')).toBe(
      '0px',
    );
    expect(view.stickContainer.contains(customStick)).toBe(true);
    expect(view.contentLayer.contains(customContent)).toBe(true);
    expect(view.getBaseSize({ width: 45, height: 55 })).toEqual({ x: 45, y: 55 });
  });
});
