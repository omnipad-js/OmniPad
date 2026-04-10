import { AbstractRect, ACTION_TYPES, IpcMessage, OMNIPAD_IPC_SIGNATURE } from '../types';
import { ElementObserver } from './ElementObserver';
import { generateUID } from '../utils/id';

/** Unique symbol key for the global IframeManager instance. */
const IFRAME_MANAGER_KEY = Symbol.for('omnipad.iframe_manager.instance');

/** Cache entry for a managed iframe. */
interface IframeCache {
  uid: string;
  rect: AbstractRect;
  origin: string;
  isVisible: boolean;
}

/**
 * Global Iframe Manager.
 * 
 * Manages cross-origin communication between the host page and embedded iframes.
 * Handles coordinate transformation, security whitelisting, and spatial tracking.
 */
export class IframeManager {
  /** Whitelist of trusted origins for postMessage communication */
  private trustedOrigins = new Set<string>();

  /** Cache for verified and managed iframes mapping Element -> Metadata */
  private managedIframes = new Map<HTMLIFrameElement, IframeCache>();

  /** Use WeakSet to track denied iframes to avoid repeated parsing and prevent memory leaks */
  private deniedIframes = new WeakSet<HTMLIFrameElement>();

  private constructor() {
    // 默认信任当前页面自身的源 / Trust the current origin by default
    this.trustedOrigins.add(window.location.origin);
  }

  /**
   * Retrieves the global singleton instance of IframeManager.
   */
  public static getInstance(): IframeManager {
    const globalObj = globalThis as any;
    if (!globalObj[IFRAME_MANAGER_KEY]) {
      globalObj[IFRAME_MANAGER_KEY] = new IframeManager();
    }
    return globalObj[IFRAME_MANAGER_KEY];
  }

  /**
   * Adds a domain to the trusted whitelist.
   * 
   * @param origin - The origin to trust (e.g., "https://example.com").
   */
  public addTrustedOrigin(origin: string): void {
    if (origin === '*') {
      if (import.meta.env?.DEV)
        console.warn('[OmniPad-Security] Wildcard origin "*" is dangerous!');
    }
    this.trustedOrigins.add(origin);
  }

  /**
   * Core admission logic: Checks cache -> Validates whitelist -> Starts monitoring.
   * 
   * @internal
   * @param iframe - The iframe element to verify.
   * @returns Verified cache data or null if untrusted/invalid.
   */
  private getVerifiedIframeData(iframe: HTMLIFrameElement): IframeCache | null {
    // 1. 检查是否在已管理列表 (快速通行) / Check managed list (Fast path)
    const cached = this.managedIframes.get(iframe);
    if (cached) return cached;

    // 2. 检查是否已经被永久拒绝 (快速阻断) / Check denied list (Fast block)
    if (this.deniedIframes.has(iframe)) return null;

    // 3. 解析 Origin 并校验白名单 / Parse Origin and validate whitelist
    const origin = this.getSecureOrigin(iframe);
    const isTrusted = this.trustedOrigins.has('*') || this.trustedOrigins.has(origin);

    if (!isTrusted) {
      if (import.meta.env?.DEV) {
        console.warn(`[OmniPad-Security] Blocking untrusted iframe from origin: ${origin}`);
      }
      this.deniedIframes.add(iframe); // 记录在案，下次直接无视 / Flag as denied
      return null;
    }

    // 4. 通过校验，正式纳管 / Pass validation, start management
    const uid = generateUID('iframe-proxy');
    const rect = this.captureRect(iframe);
    const data: IframeCache = { uid, rect, origin, isVisible: true };

    this.managedIframes.set(iframe, data);

    const observer = ElementObserver.getInstance();

    // 5. 挂载 RO：监听尺寸/位置位移 / Attach RO: Listen for size/position shifts
    observer.observeResize(uid, iframe, () => {
      data.rect = this.captureRect(iframe);
    });

    // 6. 挂载 IO：监听可见性 / Attach IO: Listen for visibility changes
    observer.observeIntersect(uid, iframe, (visible) => {
      data.isVisible = visible;

      // 如果 Iframe 突然消失，强制重置按键状态防止卡死 / If Iframe hidden, reset keys to prevent sticking
      if (!visible) {
        if (import.meta.env?.DEV)
          console.debug(`[OmniPad-IPC] Iframe ${uid} hidden, sending safety reset.`);
        this.forwardKeyboardEvent(iframe, ACTION_TYPES.KEYUP, { all: true });
      }
    });

    return data;
  }

  /**
   * Transforms and forwards a pointer event to the target iframe.
   * 
   * @param iframe - The destination iframe.
   * @param type - Event type (e.g., 'pointermove').
   * @param globalX - X coordinate in the host viewport.
   * @param globalY - Y coordinate in the host viewport.
   * @param opts - Original event options.
   */
  public forwardPointerEvent(
    iframe: HTMLIFrameElement,
    type: string,
    globalX: number,
    globalY: number,
    opts: any,
  ) {
    if (!iframe.contentWindow || !Number.isFinite(globalX) || !Number.isFinite(globalY)) return;

    const data = this.getVerifiedIframeData(iframe);
    if (!data) return; 

    // 坐标系转换：全局坐标 - Iframe偏移 = 内部本地坐标
    // Coordinate conversion: Global - Offset = Local
    const localX = globalX - data.rect.left;
    const localY = globalY - data.rect.top;

    iframe.contentWindow.postMessage(
      {
        signature: OMNIPAD_IPC_SIGNATURE,
        type: 'pointer',
        action: type,
        payload: { x: localX, y: localY, opts },
      } as IpcMessage,
      data.origin,
    );
  }

  /**
   * Forwards a keyboard event to the target iframe.
   * 
   * @param iframe - The destination iframe.
   * @param type - Event type (e.g., 'keydown').
   * @param payload - Key mapping data.
   */
  public forwardKeyboardEvent(iframe: HTMLIFrameElement, type: string, payload: any) {
    if (!iframe.contentWindow) return;

    const data = this.getVerifiedIframeData(iframe);
    if (!data) return;

    iframe.contentWindow.postMessage(
      {
        signature: OMNIPAD_IPC_SIGNATURE,
        type: 'keyboard',
        action: type,
        payload,
      } as IpcMessage,
      data.origin,
    );
  }

  // --- Helpers & Cleanup ---

  private captureRect(iframe: HTMLIFrameElement): AbstractRect {
    const r = iframe.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
    };
  }

  private getSecureOrigin(iframe: HTMLIFrameElement): string {
    try {
      if (!iframe.src) return 'null';
      const url = new URL(iframe.src, window.location.href);
      return ['about:', 'blob:', 'data:'].includes(url.protocol) ? 'null' : url.origin;
    } catch {
      return 'null';
    }
  }

  /**
   * Forcefully invalidates and refreshes all cached iframe rectangles.
   * Called during global window resize or scroll events.
   */
  public markAllRectDirty(): void {
    if (import.meta.env?.DEV)
      console.debug('[OmniPad-IPC] Refreshing all iframe rects due to environment change.');

    this.managedIframes.forEach((data, iframe) => {
      // 1. 自动执行“墓地清理” / Perform "Graveyard Cleanup" for detached elements
      if (!document.contains(iframe)) {
        this.unmanageIframe(iframe, data.uid);
        return;
      }

      // 2. 强制实时重算 Rect / Force immediate gBCR re-calibration
      data.rect = this.captureRect(iframe);
    });
  }

  /**
   * Unregisters an iframe and disconnects its observers.
   * 
   * @param iframe - The element to remove.
   * @param uid - The unique ID associated with the iframe.
   */
  private unmanageIframe(iframe: HTMLIFrameElement, uid: string) {
    ElementObserver.getInstance().disconnect(uid);
    this.managedIframes.set(iframe, undefined as any); // 协助 GC
    this.managedIframes.delete(iframe);
    this.deniedIframes.delete(iframe);
  }

  /**
   * Fully clears the manager state.
   */
  public clearAll(): void {
    this.managedIframes.forEach((data, iframe) => {
      this.unmanageIframe(iframe, data.uid);
    });
  }
}
