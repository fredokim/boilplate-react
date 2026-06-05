import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const scrollMap = new Map<string, number>();

export function useScrollMemory() {
  const location = useLocation();

  useEffect(() => {
    const key = location.key;
    const savedY = scrollMap.get(key);
    window.scrollTo({ top: savedY ?? 0 });

    return () => {
      scrollMap.set(key, window.scrollY);

      if (scrollMap.size > 50) {
        const oldestKey = scrollMap.keys().next().value;
        if (oldestKey) {
          scrollMap.delete(oldestKey);
        }
      }
    };
  }, [location.key]);
}
