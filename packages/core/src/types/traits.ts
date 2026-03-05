import { AbstractRect, AnyFunction, EntityType, InputActionSignal } from '.';

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
  bindRectProvider(provider: () => AbstractRect): void;
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

  onPointerDown(e: PointerEvent): void;
  onPointerMove(e: PointerEvent): void;
  onPointerUp(e: PointerEvent): void;
  onPointerCancel(e: PointerEvent): void;
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

export interface IDependencyBindable {
  /**
   * Binds a functional delegate by key.
   * We use AnyFunction to avoid the generic 'Function' type linting error.
   */
  bindDelegate(key: string, delegate: AnyFunction): void;
}
