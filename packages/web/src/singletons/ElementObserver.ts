import { createRafThrottler } from '@omnipad/core';

interface PositionObservation {
  left: number;
  top: number;
  connected: boolean;
  callbacks: Map<string, () => void>;
}

/**
 * Unique symbol key for the global ElementObserver instance to ensure
 * singleton persistence across different modules.
 */
const ELEMENT_OBSERVER_KEY = Symbol.for('omnipad.element_observer.instance');

/**
 * A centralized observation pool for DOM elements.
 *
 * This class provides a high-performance wrapper around `ResizeObserver` (RO) and
 * `IntersectionObserver` (IO). By pooling all element observations into single
 * native observer instances and utilizing `requestAnimationFrame` (rAF) throttling,
 * it significantly reduces memory footprint and prevents layout thrashing.
 *
 * It supports deterministic unregistration via UIDs, making it ideal for
 * framework adapters (like Vue or React) where DOM references may become unstable
 * during unmounting.
 */
export class ElementObserver {
  // RO 资源
  private _ro: ResizeObserver;
  private _roRegistry = new Map<string, Element>();
  private _elToRoCbs = new WeakMap<Element, Map<string, () => void>>();

  // IO 资源
  private _io: IntersectionObserver;
  private _ioRegistry = new Map<string, Element>();
  private _elToIoCbs = new WeakMap<Element, Map<string, (isIntersecting: boolean) => void>>();

  // Position tracking is intentionally opt-in. ResizeObserver does not report a
  // same-size element moving because of scrolling, transforms, or parent reflow.
  private _positionRegistry = new Map<Element, PositionObservation>();
  private _positionUidToElement = new Map<string, Element>();
  private _positionFrameId: number | null = null;

  private constructor() {
    // 初始化 ResizeObserver (带 rAF 节流)
    const throttledRoDispatch = createRafThrottler((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        for (const callback of Array.from(this._elToRoCbs.get(entry.target)?.values() || [])) {
          callback();
        }
      }
    });

    this._ro = new ResizeObserver((entries) => {
      throttledRoDispatch(entries);
    });

    // 初始化 IntersectionObserver
    this._io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          for (const callback of Array.from(this._elToIoCbs.get(entry.target)?.values() || [])) {
            callback(entry.isIntersecting);
          }
        }
      },
      { threshold: 0 },
    ); // 只要露出一丁点就触发
  }

  public static getInstance(): ElementObserver {
    const globalObj = globalThis as any;

    if (!globalObj[ELEMENT_OBSERVER_KEY]) {
      globalObj[ELEMENT_OBSERVER_KEY] = new ElementObserver();
    }

    return globalObj[ELEMENT_OBSERVER_KEY];
  }

  /**
   * Starts observing size changes for a specific element.
   *
   * @param uid - The unique entity ID associated with the observation.
   * @param el - The target element to observe.
   * @param cb - Callback triggered when the element's size changes.
   */
  public observeResize(uid: string, el: Element, cb: () => void) {
    this.unobserveResize(uid);
    this._roRegistry.set(uid, el);
    let callbacks = this._elToRoCbs.get(el);
    if (!callbacks) {
      callbacks = new Map();
      this._elToRoCbs.set(el, callbacks);
      this._ro.observe(el);
    }
    callbacks.set(uid, cb);
  }

  /**
   * Stops observing size changes for the entity identified by the UID.
   *
   * @param uid - The unique entity ID to unregister.
   */
  public unobserveResize(uid: string) {
    const el = this._roRegistry.get(uid);
    if (el) {
      const callbacks = this._elToRoCbs.get(el);
      callbacks?.delete(uid);
      if (callbacks?.size === 0) {
        this._ro.unobserve(el);
        this._elToRoCbs.delete(el);
      }
      this._roRegistry.delete(uid);
    }
  }

  /**
   * Starts observing visibility (intersection) changes for a specific element.
   *
   * @param uid - The unique entity ID associated with the observation.
   * @param el - The target element to observe.
   * @param cb - Callback triggered when visibility enters or exits the viewport.
   */
  public observeIntersect(uid: string, el: Element, cb: (isIntersecting: boolean) => void) {
    this.unobserveIntersect(uid);
    this._ioRegistry.set(uid, el);
    let callbacks = this._elToIoCbs.get(el);
    if (!callbacks) {
      callbacks = new Map();
      this._elToIoCbs.set(el, callbacks);
      this._io.observe(el);
    }
    callbacks.set(uid, cb);
  }

  /**
   * Stops observing intersection changes for the entity identified by the UID.
   *
   * @param uid - The unique entity ID to unregister.
   */
  public unobserveIntersect(uid: string) {
    const el = this._ioRegistry.get(uid);
    if (el) {
      const callbacks = this._elToIoCbs.get(el);
      callbacks?.delete(uid);
      if (callbacks?.size === 0) {
        this._io.unobserve(el);
        this._elToIoCbs.delete(el);
      }
      this._ioRegistry.delete(uid);
    }
  }

  /**
   * Observes viewport-position changes for an element whose size may remain stable.
   * Only sticky targets opt into this rAF-based check, avoiding a global per-frame
   * layout read for ordinary widgets.
   */
  public observePosition(uid: string, el: Element, cb: () => void) {
    this.unobservePosition(uid);
    let observation = this._positionRegistry.get(el);
    if (!observation) {
      const rect = el.getBoundingClientRect();
      observation = {
        left: rect.left,
        top: rect.top,
        connected: el.isConnected,
        callbacks: new Map(),
      };
      this._positionRegistry.set(el, observation);
    }
    observation.callbacks.set(uid, cb);
    this._positionUidToElement.set(uid, el);
    this.startPositionLoop();
  }

  /** Stops observing viewport-position changes for a specific entity. */
  public unobservePosition(uid: string) {
    const el = this._positionUidToElement.get(uid);
    if (el) {
      const observation = this._positionRegistry.get(el);
      observation?.callbacks.delete(uid);
      if (observation?.callbacks.size === 0) {
        this._positionRegistry.delete(el);
      }
      this._positionUidToElement.delete(uid);
    }
    if (this._positionRegistry.size === 0) {
      this.stopPositionLoop();
    }
  }

  /**
   * Disconnects all observers (RO and IO) associated with a specific UID.
   * Usually called during component destruction for thorough cleanup.
   *
   * @param uid - The unique entity ID to fully disconnect.
   */
  public disconnect(uid: string) {
    this.unobserveResize(uid);
    this.unobserveIntersect(uid);
    this.unobservePosition(uid);
  }

  private startPositionLoop(): void {
    if (this._positionFrameId !== null || this._positionRegistry.size === 0) return;
    this._positionFrameId = requestAnimationFrame(this.handlePositionFrame);
  }

  private stopPositionLoop(): void {
    if (this._positionFrameId !== null) {
      cancelAnimationFrame(this._positionFrameId);
    }
    this._positionFrameId = null;
  }

  private handlePositionFrame = (): void => {
    for (const [element, observation] of this._positionRegistry) {
      const wasConnected = observation.connected;
      observation.connected = element.isConnected;

      // A framework can replace an element while preserving its selector. Let
      // sticky consumers resolve the replacement even if the detached node's
      // final rect happens to be unchanged.
      if (wasConnected && !observation.connected) {
        for (const callback of Array.from(observation.callbacks.values())) {
          callback();
        }
        continue;
      }

      const rect = element.getBoundingClientRect();
      const reconnected = !wasConnected && observation.connected;
      if (!reconnected && rect.left === observation.left && rect.top === observation.top) continue;

      observation.left = rect.left;
      observation.top = rect.top;
      for (const callback of Array.from(observation.callbacks.values())) {
        callback();
      }
    }

    this._positionFrameId = null;
    this.startPositionLoop();
  };
}
