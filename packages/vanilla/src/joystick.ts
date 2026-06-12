import { JoystickCore, type JoystickConfig, type JoystickState } from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { applyLayout, replaceChildren } from './dom';
import { VanillaCoreWidget } from './base';
import { AxisView } from './axis-view';
import { ButtonBaseView } from './button-base';
import type { AxisOptions, ButtonRenderContext, RenderElement } from './types';

export type VirtualJoystickOptions = AxisOptions<JoystickConfig, JoystickState> & {
  renderStickBase?: RenderElement<ButtonRenderContext>;
  renderStickContent?: RenderElement<ButtonRenderContext>;
};

export class VirtualJoystick extends VanillaCoreWidget<
  JoystickCore,
  JoystickState,
  JoystickConfig,
  VirtualJoystickOptions
> {
  private readonly axis: AxisView<JoystickState>;
  private readonly stickButton: ButtonBaseView;

  constructor(container: HTMLElement, options: VirtualJoystickOptions = {}) {
    super({
      container,
      requiredType: OmniPad.Types.JOYSTICK,
      options,
      defaultProps: {
        label: 'PUSH',
        threshold: 0.2,
        cursorMode: false,
        cursorSensitivity: 1.0,
      },
      baseClasses: ['omnipad-joystick'],
      createCore: (uid, config, customType) => new JoystickCore(uid, config, customType),
    });

    this.axis = new AxisView<JoystickState>(this.el);
    this.stickButton = new ButtonBaseView();
    this.attachPointerBridge();
    this.mount(container);
  }

  protected override renderConfig(config: JoystickConfig): void {
    super.renderConfig(config);
    this.renderJoystick();
  }

  protected override renderState(state: JoystickState): void {
    this.state = state;
    this.renderJoystick();
  }

  private renderJoystick(): void {
    applyLayout(this.el, this.getEffectiveLayout(this.config));
    const state = this.state;

    if (this.options.renderBase && state) {
      replaceChildren(
        this.axis.bg,
        this.options.renderBase({
          isActive: state.isActive,
          vector: state.vector,
          state,
        }) || null,
      );
    }

    this.stickButton.update({
      layout: { width: '100%', height: '100%' },
      isActive: !!state?.isPressed,
      label: this.config.label,
      renderBase: this.options.renderStickBase,
      renderContent: this.options.renderStickContent,
    });

    this.axis.update({
      state,
      showStick: true,
      baseSize: this.axis.getBaseSize(this.core.rect),
      renderStick:
        this.options.renderStick ||
        (() => {
          return this.stickButton.el;
        }),
      renderContent: this.options.renderContent,
    });
  }
}

export const Joystick = VirtualJoystick;
