import { dispatchLocalPointerEventAtPos, dispatchLocalKeyboardEvent } from '../dom/dispatch';
import { OMNIPAD_IPC_SIGNATURE, IpcMessage } from '../types/ipc';

/**
 * Initializes the Iframe IPC receiver in the current window context.
 *
 * This function sets up a global message listener to capture virtual input signals
 * dispatched from the Host (parent) window. It translates these signals into
 * real DOM events within the iframe's local environment.
 *
 * This must be executed within the target iframe's execution context.
 */
export function initIframeReceiver(): void {
  // 防止重复初始化，确保全局只有一个监听器 / Prevent multiple initializations; ensures only one listener per window
  if ((window as any).__OMNIPAD_RECEIVER_READY__) return;
  (window as any).__OMNIPAD_RECEIVER_READY__ = true;

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as IpcMessage;

    // 签名校验，防止处理来自其他插件或脚本的干扰消息 / Signature validation to ignore unrelated or malicious messages
    if (data?.signature !== OMNIPAD_IPC_SIGNATURE) return;

    if (data.type === 'pointer') {
      const { x, y, opts } = data.payload;

      // 此时 x, y 已经是 Host 端根据 Iframe 偏移量换算好的本地像素坐标
      // The x and y coordinates are already translated to local pixels by the Host
      dispatchLocalPointerEventAtPos(data.action, x, y, opts);
    } else if (data.type === 'keyboard') {
      // 处理全局广播的键盘信号 / Handle globally broadcasted keyboard signals
      dispatchLocalKeyboardEvent(data.action, data.payload);
    }
  });

  if (import.meta.env?.DEV) {
    console.log('[OmniPad-Guest] Iframe receiver active and listening for Host commands.');
  }
}
