/**
 * Trailing-edge debounce. Batches logger updates at the refresh rate so
 * a burst of requests causes one re-render rather than fifty.
 *
 * Typed with a generic parameter tuple instead of leaning on `Function`
 * and `arguments`, so callers keep their argument types through the
 * wrapper and `@ts-ignore` is not needed.
 */
function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number,
  immediate: boolean = false
): (...args: Args) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return (...args: Args) => {
    if (timeout !== undefined) clearTimeout(timeout);

    if (immediate && timeout === undefined) {
      func(...args);
    }

    timeout = setTimeout(() => {
      timeout = undefined;
      if (!immediate) func(...args);
    }, wait);
  };
}

export default debounce;
