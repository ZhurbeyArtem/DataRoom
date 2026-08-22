import { useEffect, useState } from 'react';

/**
 * Затримка перед запитом. Без неї кожне натискання клавіші летіло б у
 * мережу: «contracts» — це десять запитів, з яких потрібен лише останній.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
