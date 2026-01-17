import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { objectsAPI } from '@/api/endpoints';

export function useObjects(params = {}, autoRefresh = true, refreshInterval = 2000) {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  const fetchObjects = async () => {
    try {
      setLoading(true);
      setError(null);
      // Always use search endpoint - it handles both empty and non-empty queries
      const response = await objectsAPI.search(params);
      setObjects(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch objects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();

    // Auto-refresh for real-time status updates (present/absent)
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(async () => {
        try {
          setError(null);
          const response = await objectsAPI.search(params);
          setObjects(response.data);
        } catch (err) {
          console.error('Failed to refresh objects:', err);
        }
      }, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [JSON.stringify(params), location.pathname, autoRefresh, refreshInterval]); // Refetch when params OR route changes

  return { objects, loading, error, refetch: fetchObjects };
}
