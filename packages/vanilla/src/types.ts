import type {
  AbstractPointerEvent,
  BaseConfig,
  ConfigTreeNode,
  CursorState,
  DPadState,
  EntityType,
  JoystickState,
  LayoutBox,
  Vec2,
} from '@omnipad/core';

export interface VanillaWidgetInstance {
  readonly uid: string;
  readonly el: HTMLElement;
  destroy(): void;
  updateConfig?(patch: any): void;
  markRectDirty?(): void;
  onPointerDown?(event: AbstractPointerEvent): void;
  onPointerMove?(event: AbstractPointerEvent): void;
  onPointerUp?(event: AbstractPointerEvent): void;
  onPointerCancel?(event: AbstractPointerEvent): void;
}

export type VanillaComponentConstructor<TOptions = any> = new (
  container: HTMLElement,
  options?: TOptions,
) => VanillaWidgetInstance;

export type VanillaWidgetOptions<TConfig extends BaseConfig = BaseConfig> = Partial<TConfig> & {
  treeNode?: ConfigTreeNode;
  widgetId?: string;
  parentId?: string;
  customType?: EntityType;
  append?: boolean;
};

export interface VanillaLayerOptions {
  nodes?: ConfigTreeNode[];
  renderContent?: (container: HTMLElement) => void;
  append?: boolean;
}

export interface ButtonRenderContext {
  isActive: boolean;
  label?: string;
}

export interface AxisRenderContext<TState extends DPadState | JoystickState> {
  isActive: boolean;
  vector: Vec2;
  state: TState;
}

export interface TargetRenderContext {
  state: CursorState;
  isDown: boolean;
  isReturning: boolean;
  cursorPos: Vec2;
}

export type RenderElement<TContext> = (context: TContext) => HTMLElement | null | undefined;

export type ButtonLikeOptions<TConfig extends BaseConfig> = VanillaWidgetOptions<TConfig> & {
  renderBase?: RenderElement<ButtonRenderContext>;
  renderContent?: RenderElement<ButtonRenderContext>;
};

export type AxisOptions<
  TConfig extends BaseConfig,
  TState extends DPadState | JoystickState,
> = VanillaWidgetOptions<TConfig> & {
  renderBase?: RenderElement<AxisRenderContext<TState>>;
  renderStick?: RenderElement<AxisRenderContext<TState>>;
  renderContent?: RenderElement<AxisRenderContext<TState>>;
};

export interface TargetZoneRenderOptions {
  renderFocusFeedback?: RenderElement<TargetRenderContext>;
  renderCursor?: RenderElement<TargetRenderContext>;
  renderWithCursor?: RenderElement<TargetRenderContext>;
  renderContent?: RenderElement<TargetRenderContext>;
}

export type DynamicWidgetSource =
  | ConfigTreeNode
  | VanillaWidgetInstance
  | ((container: HTMLElement) => VanillaWidgetInstance | null | undefined);

export interface InputZoneRenderOptions {
  dynamicWidget?: DynamicWidgetSource;
  renderContent?: (container: HTMLElement, owner: VanillaWidgetInstance) => void;
}

export interface ResolvedWidgetConfig<TConfig extends BaseConfig> {
  uid: string;
  initialConfig: TConfig;
  customType?: EntityType;
  treeNode?: ConfigTreeNode;
}

export interface LayoutSyncTarget {
  layout?: LayoutBox;
  cssClass?: string;
}
