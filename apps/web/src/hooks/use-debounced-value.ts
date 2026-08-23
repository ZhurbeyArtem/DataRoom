import { useEffect, useState } from 'react';

/**
 * A delay before the request. Without it every keystroke would hit the
 * network: "contracts" is ten requests of which only the last one matters.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
