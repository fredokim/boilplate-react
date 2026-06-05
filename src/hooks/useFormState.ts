import { useCallback, useState } from 'react';

export function useFormState<T extends Record<string, string>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const setField = useCallback(<TKey extends keyof T>(key: TKey, value: T[TKey]) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return {
    values,
    setField,
    reset,
  };
}
