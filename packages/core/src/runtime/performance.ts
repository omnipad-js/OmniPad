/**
 * Types for frame request and cancellation.
 * Compatible with both Web and custom engine timings.
 */
export type FrameRequestCallback = (time: number) => void;
export type RequestFrameFn = (callback: FrameRequestCallback) => any;
export type CancelFrameFn = (handle: any) => void;

// 默认提供一个基于 setTimeout 的降级方案，确保在 Node.js 环境下测试不报错
// Default fallback using setTimeout to ensure compatibility in Node.js/Non-browser environments.
let _requestFrame: RequestFrameFn = (cb) => setTimeout(() => cb(Date.now()), 16);
let _cancelFrame: CancelFrameFn = (id) => clearTimeout(id);

/**
 * Injects a custom timing provider (e.g., window.requestAnimationFrame).
 * Highly recommended for Web environments and H5 Game Engines to ensure 60fps+ performance.
 */
export function setRafProvider(request: RequestFrameFn, cancel: CancelFrameFn) {
  _requestFrame = request;
  _cancelFrame = cancel;
}

/**
 * Creates a throttled version of a function that only executes once per animation frame.
 * Only the latest payload provided within the frame will be processed.
 *
 * @template T - The type of the payload passed to the callback.
 * @param callback - The function to execute.
 * @returns A throttled function receiving the latest payload.
 */
export function createRafThrottler<T = any>(callback: (payload: T, timestamp: number) => void) {
  let ticking = false;
  let latestPayload: T | undefined;

  return function (payload: T) {
    latestPayload = payload;

    if (!ticking) {
      ticking = true;

      _requestFrame((timestamp) => {
        callback(latestPayload as T, timestamp);
        ticking = false;
      });
    }
  };
}

/**
 * A utility to manage a continuous execution loop driven by the system's refresh rate.
 * Ideal for velocity-based movement or physics calculations.
 *
 * @param callback - The function to execute on every tick.
 * @returns An object containing start and stop controls.
 */
export function createTicker(callback: () => void) {
  let tickId: number | ReturnType<typeof setTimeout> | null = null;

  const loop = () => {
    callback();
    tickId = _requestFrame(loop);
  };

  return {
    start: () => {
      if (tickId === null) loop();
    },
    stop: () => {
      if (tickId !== null) {
        _cancelFrame(tickId as any);
        tickId = null;
      }
    },
  };
}

/**
 * Delay the specified number of rendering frames.
 * @param frames Count of frames to delay.
 */
export const delayFrames = (frames: number = 1): Promise<void> => {
  return new Promise((resolve) => {
    let count = 0;
    const loop = () => {
      if (++count >= frames) resolve();
      else _requestFrame(loop);
    };
    _requestFrame(loop);
  });
};
