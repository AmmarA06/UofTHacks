import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { classesAPI } from '@/api/endpoints';

export function useClasses(params = {}) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await classesAPI.getAll(params);
      setClasses(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [JSON.stringify(params), location.pathname]); // Refetch when params OR route changes

  return { classes, loading, error, refetch: fetchClasses };
}

export function useClass(classId) {
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  const fetchClass = async () => {
    if (!classId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await classesAPI.getById(classId);
      setClassData(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch class:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClass();
  }, [classId, location.pathname]); // Refetch when classId or route changes

  return { classData, loading, error, refetch: fetchClass };
}
