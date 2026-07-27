import { useState, useEffect, useCallback } from 'react';

// Custom hook for API calls with loading, error, and data states
export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      console.error('API Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  // Reset data when dependencies change
  useEffect(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, dependencies);

  return { data, loading, error, execute };
};

// Hook for paginated API calls
export const usePaginatedApi = (apiFunction, initialPage = 1) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      const result = await apiFunction(page + 1);
      
      if (result.data && result.data.length > 0) {
        setData(prev => [...prev, ...result.data]);
        setPage(prev => prev + 1);
        setHasMore(result.hasMore !== false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFunction, page, loading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
    setLoading(false);
  }, [initialPage]);

  return { data, loading, error, loadMore, reset, page, hasMore };
};

// Hook for real-time data with WebSocket
export const useRealtimeData = (socket, event, initialData = []) => {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (!socket) return;

    const handleEvent = (newData) => {
      setData(prev => {
        // Handle different event types
        if (typeof newData === 'object' && newData.id) {
          // Single item update/add
          const existingIndex = prev.findIndex(item => item.id === newData.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newData;
            return updated;
          } else {
            return [...prev, newData];
          }
        } else if (Array.isArray(newData)) {
          // Array of items
          return [...prev, ...newData];
        }
        return prev;
      });
    };

    socket.on(event, handleEvent);

    return () => {
      socket.off(event, handleEvent);
    };
  }, [socket, event]);

  return { data, setData };
};

// Hook for caching API responses
export const useCachedApi = (apiFunction, cacheKey, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    // Check cache first
    const cache = JSON.parse(localStorage.getItem(`api_cache_${cacheKey}`) || '{}');
    const cacheKeyArgs = JSON.stringify(args);
    
    if (cache[cacheKeyArgs] && cache[cacheKeyArgs].timestamp > Date.now() - 5 * 60 * 1000) {
      // Use cached data if less than 5 minutes old
      setData(cache[cacheKeyArgs].data);
      return cache[cacheKeyArgs].data;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      
      // Cache the result
      const newCache = {
        ...cache,
        [cacheKeyArgs]: {
          data: result,
          timestamp: Date.now()
        }
      };
      localStorage.setItem(`api_cache_${cacheKey}`, JSON.stringify(newCache));
      
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      console.error('API Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, cacheKey]);

  // Clear cache when dependencies change
  useEffect(() => {
    localStorage.removeItem(`api_cache_${cacheKey}`);
    setData(null);
    setError(null);
    setLoading(false);
  }, dependencies);

  return { data, loading, error, execute };
};

export default useApi;
