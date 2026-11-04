import { useCallback, useEffect, useState } from 'react';
import { createResumeLink, findResumeFile, resumePathFrom } from '../data/services/profileService';

export function useResumeFile(candidateId, submittedValue) {
  const [path, setPath] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      setStatus('loading');
      setError('');
      const submittedPath = resumePathFrom(submittedValue);
      if (submittedPath) {
        if (!cancelled) { setPath(submittedPath); setStatus('ready'); }
        return;
      }
      const { path: foundPath, error: findError } = await findResumeFile(candidateId);
      if (cancelled) return;
      if (findError) {
        setPath(null);
        setStatus('error');
        setError(findError.message || 'Could not check for a resume.');
        return;
      }
      setPath(foundPath);
      setStatus(foundPath ? 'ready' : 'none');
    };
    resolve();
    return () => { cancelled = true; };
  }, [candidateId, submittedValue]);

  const openResume = useCallback(async () => {
    if (!path || isOpening) return false;
    setIsOpening(true);
    setError('');
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    const { data, error: linkError } = await createResumeLink(path);
    setIsOpening(false);
    if (linkError || !data?.signedUrl) {
      tab?.close();
      setError(linkError?.message || 'Could not open the resume. You may not have access to it.');
      return false;
    }
    if (tab) tab.location.href = data.signedUrl;
    else window.location.assign(data.signedUrl);
    return true;
  }, [isOpening, path]);

  return { path, status, error, isOpening, openResume };
}
