import { ACTION_TYPES, setGlobalSignalHandler } from '@omnipad/core';
import { dispatchKeyboardEvent } from './dom/action';

export * from './dom';
export * from './ts';

export * from './singletons/ElementObserver';
export * from './singletons/IFrameManager';
export * from './singletons/WindowManager';

setGlobalSignalHandler((signal) => {
  if (signal.type === ACTION_TYPES.KEYDOWN || signal.type === ACTION_TYPES.KEYUP) {
    dispatchKeyboardEvent(signal.type as any, signal.payload as any);
  }
});
