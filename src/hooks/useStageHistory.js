import { useEffect, useState } from 'react';
import { listStageHistory } from '../data/services/pipelineService';

export function useStageHistory(applicationId, refreshKey) {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!applicationId) return undefined;
    let cancelled = false;
    const load = async () => {
      setError('');
      const { data, error: loadError } = await listStageHistory(applicationId);
      if (cancelled) return;
      if (loadError) setError(loadError.message);
      else setHistory(data || []);
    };
    load();
    return () => { cancelled = true; };
  }, [applicationId, refreshKey]);

  return { history, error };
}
