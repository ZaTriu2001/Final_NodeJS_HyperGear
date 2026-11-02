import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
export function useResource(path) {
  const [result, setResult] = useState({ path: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api(path, { signal: controller.signal }).then(data => setResult({ path, version, data })).catch(error => {
      if (error.name !== 'AbortError') setResult({ path, version, error: error.message });
    });
    return () => controller.abort();
  }, [path, version]);
  return { ...(result.path === path && result.version === version ? result : {}), loading: Boolean(path && (result.path !== path || result.version !== version)), reload };
}
