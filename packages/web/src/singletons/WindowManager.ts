import { Registry, createRafThrottler } from '@omnipad/core';
import { IframeManager } from './IFrameManager';

/**
 * Unique symbol key for the global WindowManager instance.
 */
const WINDOW_MANAGER_KEY = Symbol.for('omnipad.window_manager.instance');

/**
 * Global Input Manager Singleton.
 *
 * Responsible for monitoring global browser events (resize, blur, visibility)
 * and coordinating system-wide resets to prevent stuck inputs.
 */
export class WindowManager {
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
   * Retrieves the global instance of the WindowManager.
   * Ensures uniqueness across multiple bundles or modules.
   */
  public static getInstance(): WindowManager {
    const globalObj = globalThis as any;

    if (!globalObj[WINDOW_MANAGER_KEY]) {
      globalObj[WINDOW_MANAGER_KEY] = new WindowManager();
    }

    return globalObj[WINDOW_MANAGER_KEY];
  }

  /**
   * Manually triggers a system-wide input reset via Registry.
   */
  private handleGlobalReset = (): void => {
    if (import.meta.env?.DEV) {
      console.debug('[OmniPad-DOM] Safety reset triggered by environment change.');
    }
    Registry.getInstance().resetAll();
    Registry.getInstance().markAllRectDirty();
    IframeManager.getInstance().markAllRectDirty();
  };

  private handleResizeReset = (): void => {
    this.throttledReset(null);
  };

  private handleBlurReset = (): void => {
    // Prevent blur caused by reclaiming focus on an iframe element.
    const activeEl = document.activeElement;
    if (activeEl && activeEl.tagName.toLowerCase() === 'iframe') {
      return;
    }
    this.handleGlobalReset();
  };

  private handleScrollReset = (): void => {
    this.throttledReset(null);
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

    // 3. Monitor window scroll (e.g. page animation)
    window.addEventListener('scroll', this.handleScrollReset, {
      capture: true,
      passive: true,
    });

    // 4. Monitor page visibility (e.g., switching browser tabs)
    document.addEventListener('visibilitychange', this.handleVisibilityChangeReset);

    this._isListening = true;

    if (import.meta.env?.DEV) {
      console.log('[OmniPad-DOM] Global WindowManager monitoring started.');
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
        this.handleGlobalReset();

        await target.requestFullscreen();
      } else {
        // Reset once before exiting full screen.
        this.handleGlobalReset();

        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(`[OmniPad-DOM] Fullscreen toggle failed:`, err);
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
    window.removeEventListener('scroll', this.handleScrollReset, { capture: true });
    window.removeEventListener('visibilitychange', this.handleVisibilityChangeReset);
    this._isListening = false;
  }
}
