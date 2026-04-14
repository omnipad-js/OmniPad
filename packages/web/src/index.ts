import {
  AbstractGamepad,
  OmniPad,
  setGamepadProvider,
  setGlobalSignalHandler,
  setRafProvider,
} from '@omnipad/core';
import { dispatchKeyboardEvent } from './dom/action';

export * from './dom';
export * from './ts';

export * from './singletons/ElementObserver';
export * from './singletons/IFrameManager';
export * from './singletons/WindowManager';

if (typeof window !== 'undefined') {
  setRafProvider(
    window.requestAnimationFrame.bind(window),
    window.cancelAnimationFrame.bind(window),
  );
}

setGlobalSignalHandler((signal) => {
  if (signal.type === OmniPad.ActionTypes.KEYDOWN || signal.type === OmniPad.ActionTypes.KEYUP) {
    dispatchKeyboardEvent(signal.type as any, signal.payload as any);
  }
});

const gamepadSnapshot: (AbstractGamepad | null)[] = [null, null, null, null];

if (typeof navigator !== 'undefined' && navigator.getGamepads) {
  setGamepadProvider(() => {
    const rawPads = navigator.getGamepads();
    for (let i = 0; i < 4; i++) {
      gamepadSnapshot[i] = rawPads[i] || null;
    }
    return gamepadSnapshot;
  });
}
