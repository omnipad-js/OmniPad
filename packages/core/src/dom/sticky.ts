import { StickyProvider } from '../runtime/sticky';
import { smartQuerySelector } from './query';

/**
 * Creates a StickyProvider pre-configured for the Web environment.
 */
export const createWebStickyProvider = (selector: string) => {
  return new StickyProvider(
    selector,
    (id) => smartQuerySelector(id), // finder
    (el) => {
      // rectProvider
      const r = (el as Element).getBoundingClientRect();
      return r;
    },
    (el) => document.contains(el as Node), // presenceChecker
  );
};
