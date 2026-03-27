import { createRafThrottler } from '../utils/performance';

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
  private _elToRoCb = new WeakMap<Element, () => void>();

  // IO 资源
  private _io: IntersectionObserver;
  private _ioRegistry = new Map<string, Element>();
  private _elToIoCb = new WeakMap<Element, (isIntersecting: boolean) => void>();

  private constructor() {
    // 初始化 ResizeObserver (带 rAF 节流)
    const throttledRoDispatch = createRafThrottler((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        this._elToRoCb.get(entry.target)?.();
      }
    });

    this._ro = new ResizeObserver((entries) => {
      throttledRoDispatch(entries);
    });

    // 初始化 IntersectionObserver
    this._io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          this._elToIoCb.get(entry.target)?.(entry.isIntersecting);
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
   * @param el - The target DOM element to observe.
   * @param cb - Callback triggered when the element's size changes.
   */
  public observeResize(uid: string, el: Element, cb: () => void) {
    this.unobserveResize(uid); // 避免重复注册
    this._roRegistry.set(uid, el);
    this._elToRoCb.set(el, cb);
    this._ro.observe(el);
  }

  /**
   * Stops observing size changes for the entity identified by the UID.
   *
   * @param uid - The unique entity ID to unregister.
   */
  public unobserveResize(uid: string) {
    const el = this._roRegistry.get(uid);
    if (el) {
      this._ro.unobserve(el);
      this._elToRoCb.delete(el);
      this._roRegistry.delete(uid);
    }
  }

  /**
   * Starts observing visibility (intersection) changes for a specific element.
   *
   * @param uid - The unique entity ID associated with the observation.
   * @param el - The target DOM element to observe.
   * @param cb - Callback triggered when visibility enters or exits the viewport.
   */
  public observeIntersect(uid: string, el: Element, cb: (isIntersecting: boolean) => void) {
    this.unobserveIntersect(uid);
    this._ioRegistry.set(uid, el);
    this._elToIoCb.set(el, cb);
    this._io.observe(el);
  }

  /**
   * Stops observing intersection changes for the entity identified by the UID.
   *
   * @param uid - The unique entity ID to unregister.
   */
  public unobserveIntersect(uid: string) {
    const el = this._ioRegistry.get(uid);
    if (el) {
      this._io.unobserve(el);
      this._elToIoCb.delete(el);
      this._ioRegistry.delete(uid);
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
  }
}
