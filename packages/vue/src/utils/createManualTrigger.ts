import { ref } from 'vue';

/**
 * Creates a reactive signal to force computed re-evaluation.
 */
export function createManualTrigger() {
  const tick = ref(0);
  return {
    /** Call this inside computed to track dependency */
    depend: () => tick.value,
    /** Trigger the update */
    notify: () => {
      tick.value = (tick.value + 1) % 65535;
    },
  };
}
