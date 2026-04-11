import { StickyProvider } from '../runtime/sticky';
import { distillRect } from '../utils/distill';
import { smartQuerySelector } from './query';

/**
 * Creates a StickyProvider pre-configured for the Web environment.
 */
export const createWebStickyProvider = (selector: string) => {
  return new StickyProvider<Element>(
    selector,
    (id) => smartQuerySelector(id) as Element, // finder
    (el) => {
      // rectProvider
      const r = (el as Element).getBoundingClientRect();
      return distillRect(r);
    },
    (el) => el.isConnected, // presenceChecker
  );
};
