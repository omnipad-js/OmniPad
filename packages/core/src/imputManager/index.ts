import { Registry } from '../registry';
import { createRafThrottler } from '../utils/performance';

/**
 * Unique symbol key for the global InputManager instance.
 */
const INPUT_MANAGER_KEY = Symbol.for('omnipad.input_manager.instance');

/**
 * Global Input Manager Singleton.
 *
 * Responsible for monitoring global browser events (resize, blur, visibility)
 * and coordinating system-wide resets to prevent stuck inputs.
 */
export class InputManager {
  /** Internal flag to prevent multiple event registrations */
  private _isListening = false;
  /** A throttled version of the reset logic */
  private throttledReset: (e: any) => void;

  private constructor() {
    this.throttledReset = createRafThrottler(() => {
      this.handleGlobalReset();
    });
  }

  /**
   * Retrieves the global instance of the InputManager.
   * Ensures uniqueness across multiple bundles or modules.
   */
  public static getInstance(): InputManager {
    const globalObj = globalThis as any;

    if (!globalObj[INPUT_MANAGER_KEY]) {
      globalObj[INPUT_MANAGER_KEY] = new InputManager();
    }

    return globalObj[INPUT_MANAGER_KEY];
  }

  /**
   * Manually triggers a system-wide input reset via Registry.
   */
  private handleGlobalReset = (): void => {
    if (import.meta.env?.DEV) {
      console.debug('[OmniPad-Core] Safety reset triggered by environment change.');
    }
    Registry.getInstance().resetAll();
  };

  private handleResizeReset = (): void => {
    this.throttledReset(null);
  };

  private handleBlurReset = (): void => {
    this.handleGlobalReset();
  };

  private handleVisibilityChangeReset = (): void => {
    if (document.visibilityState === 'hidden') {
      this.handleGlobalReset();
    }
  };

  /**
   * Initializes global safety listeners.
   * Should be called once at the root component lifecycle (e.g., VirtualLayer).
   */
  public init(): void {
    // If already listening, return to prevent redundant registrations
    if (this._isListening) return;

    // 1. Monitor window resize (e.g., orientation change on mobile)
    window.addEventListener('resize', this.handleResizeReset);

    // 2. Monitor window focus loss (e.g., clicking address bar, switching apps)
    window.addEventListener('blur', this.handleBlurReset);

    // 3. Monitor page visibility (e.g., switching browser tabs)
    document.addEventListener('visibilitychange', this.handleVisibilityChangeReset);

    this._isListening = true;

    if (import.meta.env?.DEV) {
      console.log('[OmniPad-Core] Global InputManager monitoring started.');
    }
  }

  /**
   * Toggle full-screen state of the page.
   * @param element Target HTMLElement
   */
  public async toggleFullscreen(element?: HTMLElement): Promise<void> {
    const target = element || document.documentElement;

    try {
      if (!document.fullscreenElement) {
        // Before entering full-screen mode, perform a global reset to prevent input contamination during the transition.
        Registry.getInstance().resetAll();

        await target.requestFullscreen();
      } else {
        // Reset once before exiting full screen.
        Registry.getInstance().resetAll();

        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(`[OmniPad-Core] Fullscreen toggle failed:`, err);
    }
  }

  /**
   * Full-screen status query provided to the UI layer.
   */
  public isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  /**
   * Detaches all global listeners.
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleResizeReset);
    window.removeEventListener('blur', this.handleBlurReset);
    window.removeEventListener('visibilitychange', this.handleVisibilityChangeReset);
    this._isListening = false;
  }
}
