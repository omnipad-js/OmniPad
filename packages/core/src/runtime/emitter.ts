/**
 * Represents a callback function for the emitter.
 * @template T - The type of data being broadcasted.
 */
export type Listener<T> = (data: T) => void;

/**
 * A lightweight implementation of the Observer pattern.
 * Used primarily within Core Entities to notify the Adapter layer of state changes.
 *
 * @template T - The state or data object type.
 */
export class SimpleEmitter<T> {
  private listeners = new Set<Listener<T>>();

  /**
   * Registers a callback function to be executed whenever data is emitted.
   *
   * @param fn - The callback function.
   * @returns A function that, when called, unsubscribes the listener.
   */
  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Broadcasts the provided data to all registered listeners.
   * Each listener is executed within a try-catch block to ensure that
   * an error in one subscriber doesn't prevent others from receiving the signal.
   *
   * @param data - The payload to be sent to all subscribers.
   */
  emit(data: T): void {
    this.listeners.forEach((fn) => {
      try {
        fn(data);
      } catch (error) {
        console.error('[OmniPad-Core] Emitter callback error:', error);
      }
    });
  }

  /**
   * Removes all listeners and clears the subscription set.
   * Essential for preventing memory leaks when an Entity is destroyed.
   */
  clear(): void {
    this.listeners.clear();
  }
}
