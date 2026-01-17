import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { eventsAPI } from '@/api/endpoints';

/**
 * Hook for fetching and auto-refreshing behavioral events.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoRefresh - Enable auto-refresh (default: true)
 * @param {number} options.refreshInterval - Refresh interval in ms (default: 2000)
 * @param {number} options.limit - Max events to fetch (default: 50)
 * @param {string} options.eventType - Filter by event type (optional)
 */
export function useEvents({
  autoRefresh = true,
  refreshInterval = 2000,
  limit = 50,
  eventType = null
} = {}) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const lastTimestampRef = useRef(null);

  const fetchEvents = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }

      const params = { limit };
      if (eventType) {
        params.event_type = eventType;
      }

      const [eventsRes, statsRes] = await Promise.all([
        eventsAPI.getAll(params),
        eventsAPI.getStats()
      ]);

      setEvents(eventsRes.data);
      setStats(statsRes.data);

      // Track latest timestamp for streaming
      if (eventsRes.data.length > 0) {
        lastTimestampRef.current = eventsRes.data[0].timestamp;
      }

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch events:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [limit, eventType]);

  const fetchNewEvents = useCallback(async () => {
    if (!lastTimestampRef.current) {
      return fetchEvents(false);
    }

    try {
      const response = await eventsAPI.getStream(lastTimestampRef.current);
      const newEvents = response.data.events;

      if (newEvents.length > 0) {
        // Prepend new events and limit total
        setEvents(prev => {
          const combined = [...newEvents, ...prev];
          return combined.slice(0, limit);
        });
        lastTimestampRef.current = response.data.latest_timestamp;

        // Also refresh stats
        const statsRes = await eventsAPI.getStats();
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch new events:', err);
    }
  }, [limit, fetchEvents]);

  useEffect(() => {
    fetchEvents(true);

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(fetchNewEvents, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [location.pathname, autoRefresh, refreshInterval, fetchEvents, fetchNewEvents]);

  const refetch = useCallback(() => {
    lastTimestampRef.current = null;
    return fetchEvents(true);
  }, [fetchEvents]);

  const clearEvents = useCallback(async () => {
    try {
      await eventsAPI.clear();
      setEvents([]);
      lastTimestampRef.current = null;
      const statsRes = await eventsAPI.getStats();
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to clear events:', err);
      throw err;
    }
  }, []);

  return {
    events,
    stats,
    loading,
    error,
    refetch,
    clearEvents
  };
}

export default useEvents;
