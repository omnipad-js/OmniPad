/**
 * Interface defining the required capabilities for an environment-specific event dispatcher.
 */
export interface DispatcherProvider {
  /**
   * Simulates a keyboard event in the host environment.
   *
   * @param type - The action type (e.g., 'keydown', 'keyup').
   * @param payload - Keyboard event data containing key, code, and keyCode.
   */
  dispatchKeyboard: (type: string, payload: any) => boolean;

  /**
   * Simulates a pointer or mouse event at a specific viewport coordinate.
   *
   * @param type - The action type (e.g., 'pointerdown', 'pointermove', 'click').
   * @param x - Absolute viewport X coordinate in pixels.
   * @param y - Absolute viewport Y coordinate in pixels.
   * @param opts - Additional pointer event options like buttons or pressure.
   */
  dispatchPointerAtPos: (type: string, x: number, y: number, opts: any) => boolean;

  /**
   * Reclaims and forces focus back to the interaction target at the specified position.
   *
   * @param x - Viewport X coordinate in pixels.
   * @param y - Viewport Y coordinate in pixels.
   */
  reclaimFocus: (x: number, y: number) => boolean;
}

/** Internal storage for the active dispatcher implementation. */
let _dispatcher: DispatcherProvider | null = null;

/**
 * Injects a platform-specific dispatcher implementation into the core engine.
 * This is the bridge that allows the headless core to "hit" the real world.
 *
 * @param p - The dispatcher implementation (typically from @omnipad/web).
 */
export function setDispatcherProvider(p: DispatcherProvider) {
  _dispatcher = p;
}

/**
 * Retrieves the currently active dispatcher provider.
 * Returns null if no provider has been injected.
 *
 * @internal
 */
export const getDispatcher = () => _dispatcher;
