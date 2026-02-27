/**
 * High-Frequency Event Throttler Based on requestAnimationFrame
 */
export function createRafThrottler<T = any>(callback: (payload: T) => void) {
  let ticking = false;
  let latestPayload: T | null = null;

  return function (payload: T) {
    latestPayload = payload;

    if (!ticking) {
      ticking = true;

      window.requestAnimationFrame(() => {
        if (latestPayload !== null) {
          callback(latestPayload);
        }
        ticking = false;
      });
    }
  };
}
