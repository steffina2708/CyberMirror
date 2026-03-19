import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const CACHE_MS = 60_000; // re-fetch at most once per minute

let _cache = null;
let _cacheTs = 0;

/**
 * useDifficulty()
 * Returns { level, isLoading, refresh }
 * level: 'easy' | 'medium' | 'hard' | 'expert'
 */
const useDifficulty = () => {
  const [level,     setLevel]     = useState('easy');
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async (force = false) => {
    if (!force && _cache && Date.now() - _cacheTs < CACHE_MS) {
      setLevel(_cache);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/difficulty');
      _cache  = data.level;
      _cacheTs = Date.now();
      setLevel(data.level);
    } catch (_) {
      setLevel('easy'); // graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const refresh = () => fetch(true);

  return { level, isLoading, refresh };
};

export default useDifficulty;
