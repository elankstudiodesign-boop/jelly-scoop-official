import { useEffect, useRef, useState } from 'react';

function isQuotaExceededError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as any;
  const name = typeof anyErr.name === 'string' ? anyErr.name : '';
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function sanitizeForStorage<T>(key: string, value: T): T {
  if (key === 'scoop_products' && Array.isArray(value)) {
    return value.map((item: any) => {
      const imageUrl = typeof item?.imageUrl === 'string' ? item.imageUrl : '';
      const shouldStrip = imageUrl.startsWith('data:') || imageUrl.length > 5000;
      if (!shouldStrip) return item;
      return { ...item, imageUrl: '' };
    }) as any as T;
  }
  return value;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const persistenceDisabledRef = useRef(false);

  useEffect(() => {
    if (persistenceDisabledRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      if (isQuotaExceededError(error)) {
        try {
          const sanitized = sanitizeForStorage(key, storedValue);
          window.localStorage.setItem(key, JSON.stringify(sanitized));
          return;
        } catch {
          persistenceDisabledRef.current = true;
          return;
        }
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
