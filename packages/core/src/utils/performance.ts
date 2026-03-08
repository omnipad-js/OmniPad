/**
 * Internal safe reference to requestAnimationFrame.
 * Fallbacks to setTimeout for non-browser environments (e.g., Node.js, Vitest).
 */
const rAF =
  typeof globalThis !== 'undefined' && globalThis.requestAnimationFrame
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (cb: () => void): number => setTimeout(cb, 16) as unknown as number;

/**
 * Internal safe reference to cancelAnimationFrame.
 */
const cAF =
  typeof globalThis !== 'undefined' && globalThis.cancelAnimationFrame
    ? globalThis.cancelAnimationFrame.bind(globalThis)
    : (id: any) => clearTimeout(id);

/**
 * Creates a throttled version of a function that only executes once per animation frame.
 * Only the latest payload provided within the frame will be processed.
 *
 * @template T - The type of the payload passed to the callback.
 * @param callback - The function to execute.
 * @returns A throttled function receiving the latest payload.
 */
export function createRafThrottler<T = any>(callback: (payload: T) => void) {
  let ticking = false;
  let latestPayload: T | null = null;

  return function (payload: T) {
    latestPayload = payload;

    if (!ticking) {
      ticking = true;

      rAF(() => {
        if (latestPayload !== null) {
          callback(latestPayload);
        }
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
    tickId = rAF(loop);
  };

  return {
    start: () => {
      if (tickId === null) loop();
    },
    stop: () => {
      if (tickId !== null) {
        cAF(tickId as any);
        tickId = null;
      }
    },
  };
}

/**
 * Delay the specified number of rendering frames.
 * @param frames Count of frames to delay.
 */
export const delayFrames = (frames: number = 2): Promise<void> => {
  return new Promise((resolve) => {
    let count = 0;
    const loop = () => {
      if (++count >= frames) resolve();
      else rAF(loop);
    };
    rAF(loop);
  });
};
