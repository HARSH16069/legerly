"use client";
import { useCallback, useEffect, useState } from "react";

// Remembers the last result of every load while the app stays open (it is cleared on a full page reload,
// sign-in and sign-out, so one business's data is never shown to another).
// Coming back to a page shows the remembered data straight away, then fetches fresh data in the background
// and only changes what is on screen if something really changed.
const cache = new Map();
const same = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } };

export function useAsync(fn, deps = []) {
  let key;
  try { key = fn.toString() + "|" + JSON.stringify(deps); } catch { key = fn.toString(); }

  const [state, setState] = useState(() => (cache.has(key) ? { data: cache.get(key), error: null, loading: false } : { data: null, error: null, loading: true }));

  const run = useCallback(async () => {
    // Show what we already have; only show "loading" when there is nothing to show yet.
    setState((s) => (cache.has(key) ? (s.data === cache.get(key) && !s.loading && !s.error ? s : { data: cache.get(key), error: null, loading: false }) : { ...s, loading: true, error: null }));
    try {
      const fresh = await fn();
      const old = cache.get(key);
      const next = cache.has(key) && same(old, fresh) ? old : fresh;   // keep the same object when nothing changed
      cache.set(key, next);
      setState((s) => (s.data === next && !s.loading && !s.error ? s : { data: next, error: null, loading: false }));
    } catch (e) {
      // A failed background refresh keeps the data already on screen.
      setState((s) => (cache.has(key) ? { data: cache.get(key), error: null, loading: false } : { data: null, error: e.message, loading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}