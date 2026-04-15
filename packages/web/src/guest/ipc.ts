import {
  dispatchCustomKeyboardEvent,
  dispatchCustomPointerEventAtPos,
  reclaimCustomFocusAtPos,
} from '../dom/dispatch';

/**
 * A unique signature used to identify and verify that messages received via
 * window.postMessage originate from the OmniPad system.
 */
export const OMNIPAD_IPC_SIGNATURE = '__OMNIPAD_IPC_V1__';

/**
 * Represents the structure of a data packet used for Inter-Process Communication (IPC)
 * between the Host (main window) and the Guest (iframe).
 */
export interface IpcMessage {
  /** Verification string to filter out external third-party messages */
  signature: typeof OMNIPAD_IPC_SIGNATURE;

  /**
   * The broad category of the input event.
   * Distinguishes between spatial interactions and discrete key signals.
   */
  type: 'pointer' | 'keyboard' | 'focus';

  /**
   * The specific event action name.
   * Corresponds to standard browser event types like 'pointerdown', 'mousemove', 'keydown', etc.
   */
  action: string;

  /**
   * The data payload for the event.
   * For 'pointer' type: Contains relative coordinates {x, y} and event options.
   * For 'keyboard' type: Contains key mapping data {key, code, keyCode}.
   */
  payload: any;

  /**
   * The penetration depth of the event.
   */
  depth: number;
}

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

const MAX_PENETRATION_DEPTH = 3;

let _isInitialized = false;
let _allowedOrigins: string[] | '*' = [];

export function getIframeOrigin(el: HTMLIFrameElement): string {
  try {
    if (!el.src) return '*';

    const url = new URL(el.src, window.location.href);

    if (['about:', 'blob:', 'data:'].includes(url.protocol)) {
      return '*';
    }

    return url.origin;
  } catch (e) {
    return '*';
  }
}

interface IpcTargetInfo {
  rect: DOMRect;
  origin: string;
}

const _targetCacheMap = new WeakMap<HTMLElement, IpcTargetInfo>();

const getOrUpdateTargetInfo = (el: HTMLIFrameElement): IpcTargetInfo => {
  let info = _targetCacheMap.get(el);
  if (!info) {
    const r = el.getBoundingClientRect();
    const o = getIframeOrigin(el);
    info = { rect: r, origin: o };
    _targetCacheMap.set(el, info);
  }
  return info;
};

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

    // depth validation to prevent excessive iframe nesting
    if (!Number.isFinite(data?.depth) || data?.depth >= MAX_PENETRATION_DEPTH) {
      console.warn(
        `[OmniPad-IPC] Max penetration depth (${MAX_PENETRATION_DEPTH}) reached. Dropping signal.`,
      );
      return;
    }

    // Execution: Materialize signals into events
    try {
      if (data.type === 'focus' && data.action === 'reclaim') {
        const { x, y } = data.payload;

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        reclaimCustomFocusAtPos(x, y, (a, b, c) => {
          // Focus logic is executed before each discrete operation.
          // Thus, clear the cache to prepare for the next operation.
          _targetCacheMap.delete(a);

          const { rect, origin } = getOrUpdateTargetInfo(a);

          const localX = b - rect.left;
          const localY = c - rect.top;

          a.contentWindow?.postMessage(
            {
              signature: OMNIPAD_IPC_SIGNATURE,
              type: 'focus',
              action: 'reclaim',
              payload: { x: localX, y: localY },

              depth: data.depth + 1,
            } as IpcMessage,
            origin,
          );
        });
      } else if (data.type === 'pointer') {
        const { x, y, opts } = data.payload;

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        // The x and y coordinates are already translated to local pixels by the Host
        dispatchCustomPointerEventAtPos(data.action, x, y, opts, (a, b, c, d, e) => {
          const { rect, origin } = getOrUpdateTargetInfo(a);
          const localX = c - rect.left;
          const localY = d - rect.top;

          a.contentWindow?.postMessage(
            {
              signature: OMNIPAD_IPC_SIGNATURE,
              type: 'pointer',
              action: b,
              payload: { x: localX, y: localY, e },
              depth: data.depth + 1,
            } as IpcMessage,
            origin,
          );
        });
      } else if (data.type === 'keyboard') {
        // Handle globally broadcasted keyboard signals
        dispatchCustomKeyboardEvent(data.action, data.payload, (a, b, c) => {
          const { origin } = getOrUpdateTargetInfo(a);
          a.contentWindow?.postMessage(
            {
              signature: OMNIPAD_IPC_SIGNATURE,
              type: 'keyboard',
              action: b,
              payload: c,
              depth: data.depth + 1,
            } as IpcMessage,
            origin,
          );
        });
      }
    } catch (err) {
      console.error('[OmniPad-IPC] Error dispatching guest event:', err);
    }
  });

  if (import.meta.env?.DEV) {
    console.log('[OmniPad-IPC] Iframe receiver active and listening for Host commands.');
  }
}
