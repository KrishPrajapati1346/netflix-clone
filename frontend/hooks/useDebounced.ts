'use client';

import { useEffect, useState } from 'react';

/**
 * Debounces a rapidly-changing value.
 *
 * Search runs on every keystroke, and without this a six-letter query is six
 * round trips of which only the last matters. 250ms is the usual sweet spot:
 * short enough to feel instant, long enough to collapse a burst of typing into
 * one request.
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Clearing on change is what makes this a debounce rather than a throttle:
    // the timer only fires once typing pauses.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
