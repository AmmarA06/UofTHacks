import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { statsAPI } from '@/api/endpoints';

export function useStats(autoRefresh = true, refreshInterval = 2000) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await statsAPI.getSummary();
        setStats(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Auto-refresh for real-time updates
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(async () => {
        try {
          const response = await statsAPI.getSummary();
          setStats(response.data);
        } catch (err) {
          console.error('Failed to refresh stats:', err);
        }
      }, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [location.pathname, autoRefresh, refreshInterval]); // Refetch whenever route changes

  return { stats, loading, error };
}
