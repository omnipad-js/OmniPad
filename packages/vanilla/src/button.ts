import { ButtonCore, type ButtonConfig, type ButtonState } from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { VanillaCoreWidget } from './base';
import { ButtonBaseView } from './button-base';
import type { ButtonLikeOptions } from './types';

export type VirtualButtonOptions = ButtonLikeOptions<ButtonConfig>;

export class VirtualButton extends VanillaCoreWidget<
  ButtonCore,
  ButtonState,
  ButtonConfig,
  VirtualButtonOptions
> {
  private readonly view: ButtonBaseView;

  constructor(container: HTMLElement, options: VirtualButtonOptions = {}) {
    super({
      container,
      requiredType: OmniPad.Types.BUTTON,
      options,
      defaultProps: { label: 'BTN' },
      baseClasses: ['omnipad-button'],
      createCore: (uid, config, customType) => new ButtonCore(uid, config, customType),
    });

    this.view = new ButtonBaseView(this.el);
    this.attachPointerBridge();
    this.mount(container);
  }

  protected override renderConfig(config: ButtonConfig): void {
    super.renderConfig(config);
    this.renderButton();
  }

  protected override renderState(state: ButtonState): void {
    this.state = state;
    this.renderButton();
  }

  private renderButton(): void {
    this.view.update({
      layout: this.getEffectiveLayout(this.config),
      isActive: !!this.state?.isPressed,
      label: this.config.label,
      renderBase: this.options.renderBase,
      renderContent: this.options.renderContent,
    });
  }
}

export const Button = VirtualButton;
