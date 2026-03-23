import { AbstractPointerEvent, AbstractRect, AnyFunction, EntityType, InputActionSignal } from '.';

/**
 * Trait: Provides identity with a unique ID and specific entity type.
 */
export interface IIdentifiable {
  readonly uid: string;
  readonly type: EntityType;
}

/**
 * Trait: Provides lifecycle management hooks.
 */
export interface ILifecycle {
  /**
   * Performs cleanup, unregisters the entity, and releases resources.
   */
  destroy(): void;
}

/**
 * The core contract for any object that can be managed by the Registry.
 * Only objects implementing this interface are eligible for registration.
 */
export interface ICoreEntity extends IIdentifiable, ILifecycle {}

/**
 * Trait: Enables spatial awareness for DOM/UI-related components.
 */
export interface ISpatial {
  readonly rect: AbstractRect | null;

  /**
   * Dynamically obtain dimensions and position to ensure the most precise real-time screen coordinates are obtained during each interaction.
   */
  bindRectProvider(provider: () => AbstractRect, onMarkDirty?: () => void): void;

  /**
   * Trigger a cache invalidation.
   */
  markRectDirty(): void;
}

/**
 * Trait: Provides configuration management.
 */
export interface IConfigurable<TConfig> {
  /**
   * Dynamically updates the current configuration.
   * @param config - Partial configuration object to merge.
   */
  updateConfig(config: Partial<TConfig>): void;

  /**
   * Retrieves a snapshot of the current configuration.
   */
  getConfig(): TConfig;
}

/**
 * Trait: Enables state subscription for the adapter layer (e.g., Vue/React).
 */
export interface IObservable<TState> {
  /**
   * Subscribes to state changes.
   * @param cb - Callback function triggered on state updates.
   * @returns An unsubscribe function.
   */
  subscribe(cb: (state: TState) => void): () => void;

  /**
   * Retrieves the current state snapshot.
   */
  getState(): TState;
}

/**
 * Trait: Allows resetting the entity to its idle/safe state.
 */
export interface IResettable {
  /**
   * Forcefully clears active states and cuts off outgoing signals.
   */
  reset(): void;
}

/**
 * Trait: Handles raw pointer input (Touch/Mouse).
 */
export interface IPointerHandler {
  readonly activePointerId: number | null;

  onPointerDown(e: AbstractPointerEvent): void;
  onPointerMove(e: AbstractPointerEvent): void;
  onPointerUp(e: AbstractPointerEvent): void;
  onPointerCancel(e: AbstractPointerEvent): void;
}

/**
 * Trait: Receives and processes input signals (e.g., TargetZone).
 */
export interface ISignalReceiver {
  /**
   * Handles incoming signals from widgets.
   * @param signal - The signal data containing action type and payload.
   */
  handleSignal(signal: InputActionSignal): void;
}

/**
 * Capability for an entity to receive and store external functional dependencies.
 *
 * This enables Runtime Dependency Injection (DI), allowing core logic to invoke
 * host-specific methods (such as DOM event dispatchers or custom triggers)
 * without being tightly coupled to the environment.
 */
export interface IDependencyBindable {
  /**
   * Binds a functional delegate by a specific identifier key.
   *
   * @param key - The unique lookup identifier for the dependency (e.g., 'domDispatcher').
   * @param delegate - The function implementation provided by the adapter layer.
   */
  bindDelegate(key: string, delegate: AnyFunction): void;
}

/**
 * Contract for widgets that support programmatic control.
 *
 * This interface allows external systems—such as a Physical Gamepad Manager or
 * automation scripts—to directly drive the state and behavior of a widget,
 * bypassing native DOM pointer events.
 */
export interface IProgrammatic {
  /**
   * Manually triggers the 'down' (pressed) state of the widget.
   * Primarily used for Button-type components to simulate a physical press.
   */
  triggerDown?(): void;

  /**
   * Manually triggers the 'up' (released) state of the widget.
   * Primarily used for Button-type components to simulate a physical release.
   */
  triggerUp?(): void;

  /**
   * Manually updates the directional input vector of the widget.
   * Primarily used for Joystick or D-Pad components.
   *
   * @param x - The horizontal component, normalized between -1.0 and 1.0.
   * @param y - The vertical component, normalized between -1.0 and 1.0.
   */
  triggerVector?(x: number, y: number): void;
}
