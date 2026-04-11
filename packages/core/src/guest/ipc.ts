import { dispatchLocalPointerEventAtPos, dispatchLocalKeyboardEvent } from '../dom/dispatch';
import { OMNIPAD_IPC_SIGNATURE, IpcMessage } from '../types/ipc';

let _isInitialized = false;
let _allowedOrigins: string[] | '*' = [];

/**
 * Options for configuring the Iframe receiver security.
 */
export interface ReceiverOptions {
  /**
   * A whitelist of allowed parent origins.
   * Only messages from these origins will be processed.
   * Use '*' to allow all (not recommended for production).
   * @example ['https://your-main-site.com', 'http://localhost:5173']
   */
  allowedOrigins: string[] | '*';
}

/**
 * Initializes the Iframe IPC receiver.
 * Must be executed within the context of the guest iframe.
 *
 * @param options - Security configuration for the receiver.
 */
export function initIframeReceiver(options: ReceiverOptions): void {
  // Prevent multiple initializations; ensures only one listener per window
  if (_isInitialized) return;

  _allowedOrigins = options.allowedOrigins;
  _isInitialized = true;

  window.addEventListener('message', (event: MessageEvent) => {
    // Security: Verify sender's origin
    if (_allowedOrigins !== '*') {
      if (!_allowedOrigins.includes(event.origin)) {
        if (import.meta.env?.DEV) {
          console.warn(`[OmniPad-IPC] Blocked message from unauthorized origin: ${event.origin}`);
        }
        return;
      }
    } else {
      if (!import.meta.env?.DEV) {
        throw new Error("Security Risk: Origin wildcard '*' is forbidden in production.");
      }
    }

    const data = event.data as IpcMessage;

    // Signature validation to ignore unrelated or malicious messages
    if (data?.signature !== OMNIPAD_IPC_SIGNATURE) {
      console.warn('[OmniPad-IPC] Blocked message with invalid signature.');
      return;
    }

    // Execution: Materialize signals into events
    try {
      if (data.type === 'pointer') {
        const { x, y, opts } = data.payload;

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        // The x and y coordinates are already translated to local pixels by the Host
        dispatchLocalPointerEventAtPos(data.action, x, y, opts);
      } else if (data.type === 'keyboard') {
        // Handle globally broadcasted keyboard signals
        dispatchLocalKeyboardEvent(data.action, data.payload);
      }
    } catch (err) {
      console.error('[OmniPad-IPC] Error dispatching guest event:', err);
    }
  });

  if (import.meta.env?.DEV) {
    console.log('[OmniPad-IPC] Iframe receiver active and listening for Host commands.');
  }
}
