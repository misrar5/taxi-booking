'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState that also saves to localStorage, so a half-filled form survives a
 * dropped connection or reload. Storage can be unavailable (private mode,
 * blocked site data) — then it quietly behaves like plain useState.
 */
export function useDraft<T extends object>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(initial);
  const loaded = useRef(false);

  // Restore after mount (not during render) to avoid hydration mismatches
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      // Ignore corrupt or unavailable storage
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage full or blocked — draft just won't persist
    }
  }, [key, state]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clear
    }
  }, [key]);

  return [state, setState, clear];
}
