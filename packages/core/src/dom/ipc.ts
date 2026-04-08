import { dispatchLocalPointerEventAtPos, dispatchLocalKeyboardEvent } from './action';
import { OMNIPAD_IPC_SIGNATURE, IpcMessage } from '../types/ipc';

export function initIframeReceiver() {
  // 防止重复初始化
  if ((window as any).__OMNIPAD_RECEIVER_READY__) return;
  (window as any).__OMNIPAD_RECEIVER_READY__ = true;

  window.addEventListener('message', (event) => {
    const data = event.data as IpcMessage;

    // 签名校验，防止处理非本引擎的垃圾消息
    if (data?.signature !== OMNIPAD_IPC_SIGNATURE) return;

    if (data.type === 'pointer') {
      const { x, y, opts } = data.payload;
      // 直接在 iframe 内部调用工具函数
      // 此时 x, y 已经是相对于 iframe 左上角的正确坐标了
      dispatchLocalPointerEventAtPos(data.action, x, y, opts);
    } else if (data.type === 'keyboard') {
      dispatchLocalKeyboardEvent(data.action, data.payload);
    }
  });

  if (import.meta.env?.DEV) console.log('[OmniPad-Guest] Iframe receiver active.');
}
