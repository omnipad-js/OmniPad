import { InputActionSignal } from '.';
import { ICoreEntity } from './traits';

/**
 * Interface for the global Registry singleton.
 */
export interface IRegistry {
  /**
   * Registers an entity into the system.
   * Usually called during a component's constructor or onMounted lifecycle.
   *
   * @param entity - The logic entity instance to register.
   */
  register(entity: ICoreEntity): void;

  /**
   * Unregisters an entity from the system.
   * Usually called during a component's destroy or onUnmounted lifecycle.
   *
   * @param uid - The unique identifier of the entity.
   */
  unregister(uid: string): void;

  /**
   * Queries an entity by its UID.
   * Supports generics for easy type casting to specific logic types (e.g., ISignalReceiver).
   *
   * @example
   * // usually global ID like "$main-stage"
   * const stage = Registry.getInstance().getEntity<TargetZoneCore>('$main-stage');
   *
   * @param uid - The unique identifier of the target entity.
   * @returns The entity instance, or undefined if not found.
   */
  getEntity<T extends ICoreEntity = ICoreEntity>(uid: string): T | undefined;

  /**
   * Returns a flat array of all currently registered entities.
   * Useful for global operations or full-profile backups.
   */
  getAllEntities(): ICoreEntity[];

  /**
   * Retrieves an entity and all its recursive descendants based on parentId relationships.
   *
   * @param rootUid - The UID of the entity to start the search from.
   * @returns An array of entities belonging to the specified subtree (including the root).
   */
  getEntitiesByRoot(rootUid: string): ICoreEntity[];

  /**
   * Recursively destroys an entity and all its descendants.
   * Ensures all signals are cut off and instances are removed from the registry.
   *
   * @param rootUid - The Entity ID of the root node to be destroyed.
   */
  destroyByRoot(rootUid: string): void;

  /**
   * Triggers the reset() method on all compatible entities.
   * Essential for cutting off active input signals (e.g., stuck keys) during profile reloads.
   */
  resetAll(): void;

  /**
   * Triggers the markRectDirty() method on all compatible entities.
   * Essential for calibrating logical position during window resizes or scrolls.
   */
  markAllRectDirty(): void;

  /**
   * Clears all registered entities.
   * Used for system resets or full application unmounts.
   */
  clear(): void;

  /**
   * Dispatches an input action signal to a specific target entity or a global handler.
   *
   * @param signal - The action signal object containing the target ID and payload data.
   * @example
   * ```typescript
   * dispatcher.broadcastSignal({ targetStageId: 'player_1', type: 'KEYDOWN' });
   * ```
   */
  broadcastSignal(signal: InputActionSignal): void;
}
