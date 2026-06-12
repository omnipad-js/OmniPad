import { DPadCore, type DPadConfig, type DPadState } from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { applyLayout, createDiv, replaceChildren } from './dom';
import { VanillaCoreWidget } from './base';
import { AxisView } from './axis-view';
import type { AxisOptions } from './types';

export type VirtualDPadOptions = AxisOptions<DPadConfig, DPadState>;

export class VirtualDPad extends VanillaCoreWidget<
  DPadCore,
  DPadState,
  DPadConfig,
  VirtualDPadOptions
> {
  private readonly axis: AxisView<DPadState>;
  private readonly cross: {
    root: HTMLElement;
    top: HTMLElement;
    bottom: HTMLElement;
    left: HTMLElement;
    right: HTMLElement;
  };

  constructor(container: HTMLElement, options: VirtualDPadOptions = {}) {
    super({
      container,
      requiredType: OmniPad.Types.D_PAD,
      options,
      defaultProps: { showStick: false, threshold: 0.3 },
      baseClasses: ['omnipad-dpad'],
      createCore: (uid, config, customType) => new DPadCore(uid, config, customType),
    });

    this.axis = new AxisView<DPadState>(this.el);
    this.cross = this.createCross();
    this.axis.bg.appendChild(this.cross.root);
    this.attachPointerBridge();
    this.mount(container);
  }

  protected override renderConfig(config: DPadConfig): void {
    super.renderConfig(config);
    this.renderDPad();
  }

  protected override renderState(state: DPadState): void {
    this.state = state;
    this.renderDPad();
  }

  private renderDPad(): void {
    applyLayout(this.el, this.getEffectiveLayout(this.config));
    const state = this.state;
    const threshold = this.config.threshold ?? 0.3;

    if (this.options.renderBase && state) {
      replaceChildren(
        this.axis.bg,
        this.options.renderBase({
          isActive: state.isActive,
          vector: state.vector,
          state,
        }) || null,
      );
    } else if (!this.axis.bg.contains(this.cross.root)) {
      replaceChildren(this.axis.bg, this.cross.root);
    }

    const vector = state?.vector || { x: 0, y: 0 };
    this.cross.top.classList.toggle('on', vector.y < -threshold);
    this.cross.bottom.classList.toggle('on', vector.y > threshold);
    this.cross.left.classList.toggle('on', vector.x < -threshold);
    this.cross.right.classList.toggle('on', vector.x > threshold);

    this.axis.update({
      state,
      showStick: !!this.config.showStick,
      baseSize: this.axis.getBaseSize(this.core.rect),
      renderStick: this.options.renderStick,
      renderContent: this.options.renderContent,
    });
  }

  private createCross() {
    const root = createDiv('omnipad-dpad-cross-bg');
    const top = createDiv(['dpad-arm', 'top']);
    const bottom = createDiv(['dpad-arm', 'bottom']);
    const left = createDiv(['dpad-arm', 'left']);
    const right = createDiv(['dpad-arm', 'right']);
    root.append(top, bottom, left, right, createDiv('dpad-center'));
    return { root, top, bottom, left, right };
  }
}

export const DPad = VirtualDPad;
