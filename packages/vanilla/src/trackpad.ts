import { TrackpadCore, type TrackpadConfig, type TrackpadState } from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { VanillaCoreWidget } from './base';
import { ButtonBaseView } from './button-base';
import type { ButtonLikeOptions } from './types';

export type VirtualTrackpadOptions = ButtonLikeOptions<TrackpadConfig>;

export class VirtualTrackpad extends VanillaCoreWidget<
  TrackpadCore,
  TrackpadState,
  TrackpadConfig,
  VirtualTrackpadOptions
> {
  private readonly view: ButtonBaseView;

  constructor(container: HTMLElement, options: VirtualTrackpadOptions = {}) {
    super({
      container,
      requiredType: OmniPad.Types.TRACKPAD,
      options,
      defaultProps: { label: 'TRACKPAD', sensitivity: 1.0 },
      baseClasses: ['omnipad-trackpad'],
      createCore: (uid, config, customType) => new TrackpadCore(uid, config, customType),
    });

    this.view = new ButtonBaseView(this.el);
    this.attachPointerBridge();
    this.mount(container);
  }

  protected override renderConfig(config: TrackpadConfig): void {
    super.renderConfig(config);
    this.renderTrackpad();
  }

  protected override renderState(state: TrackpadState): void {
    this.state = state;
    this.renderTrackpad();
  }

  private renderTrackpad(): void {
    this.view.update({
      layout: this.getEffectiveLayout(this.config),
      isActive: !!this.state?.isPressed,
      label: this.config.label,
      renderBase: this.options.renderBase,
      renderContent: this.options.renderContent,
    });
  }
}

export const Trackpad = VirtualTrackpad;
