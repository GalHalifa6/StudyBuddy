import { useEffect, useState } from 'react';

export const useDebouncedValue = <T,>(value: T, delay = 400) => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
};
