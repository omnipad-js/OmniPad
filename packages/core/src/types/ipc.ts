export const OMNIPAD_IPC_SIGNATURE = '__OMNIPAD_IPC_V1__';

export interface IpcMessage {
  signature: typeof OMNIPAD_IPC_SIGNATURE;
  type: 'pointer' | 'keyboard';
  action: string; // 'pointerdown', 'keydown' 等
  payload: any; // 坐标(已经是 iframe 内部坐标) 或 按键码
}
