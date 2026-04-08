import { AbstractRect, IpcMessage, OMNIPAD_IPC_SIGNATURE } from '../types';

const IFRAME_MANAGER_KEY = Symbol.for('omnipad.iframe_manager.instance');

export class IframeManager {
  private rectCache = new WeakMap<HTMLIFrameElement, AbstractRect>();

  private constructor() {}

  public static getInstance(): IframeManager {
    const globalObj = globalThis as any;
    if (!globalObj[IFRAME_MANAGER_KEY]) {
      globalObj[IFRAME_MANAGER_KEY] = new IframeManager();
    }
    return globalObj[IFRAME_MANAGER_KEY];
  }

  /**
   * 被 WindowManager 调用，清空缓存
   */
  public markAllRectDirty() {
    // WeakMap 不能遍历清理，直接 new 一个新的丢弃旧引用
    this.rectCache = new WeakMap();
  }

  private getIframeRect(iframe: HTMLIFrameElement): AbstractRect {
    let rect = this.rectCache.get(iframe);
    if (!rect) {
      rect = iframe.getBoundingClientRect();
      this.rectCache.set(iframe, rect);
    }
    return rect;
  }

  public forwardPointerEvent(
    iframe: HTMLIFrameElement,
    type: string,
    globalX: number,
    globalY: number,
    opts: any,
  ) {
    if (!iframe.contentWindow) return;

    const rect = this.getIframeRect(iframe);
    const localX = globalX - rect.left;
    const localY = globalY - rect.top;

    iframe.contentWindow.postMessage(
      {
        signature: OMNIPAD_IPC_SIGNATURE,
        type: 'pointer',
        action: type,
        payload: { x: localX, y: localY, opts },
      } as IpcMessage,
      '*',
    );
  }

  public forwardKeyboardEvent(iframe: HTMLIFrameElement, type: string, payload: any) {
    if (!iframe.contentWindow) return;

    const message: IpcMessage = {
      signature: OMNIPAD_IPC_SIGNATURE,
      type: 'keyboard',
      action: type,
      payload,
    };

    // 精确的端到端投递
    iframe.contentWindow.postMessage(message, '*');
  }
}
