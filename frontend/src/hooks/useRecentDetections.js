import { useState, useEffect } from 'react';
import { detectionsAPI } from '@/api/endpoints';

export function useRecentDetections(limit = 15, refreshInterval = 5000) {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetections = async () => {
    try {
      const response = await detectionsAPI.getRecent(limit);
      setDetections(response.data);
      setError(null);
    } catch (err) {
      console.error('[useRecentDetections] Error fetching detections:', err);
      setError(err.message || 'Failed to fetch recent detections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetections();

    // Set up polling for real-time updates
    const interval = setInterval(fetchDetections, refreshInterval);

    return () => clearInterval(interval);
  }, [limit, refreshInterval]);

  return { detections, loading, error, refetch: fetchDetections };
}
