import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { ATTACHMENT_RULES, sanitizeFilename, validateJobAttachment } from '../data/jobAttachments';

const BUCKET = 'job-attachments';
const SIGNED_URL_SECONDS = 60 * 60;
const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const uploadFileWithProgress = async (path, file, onProgress) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error('Your session has expired. Sign in again to upload attachments.');

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedPath}`;
  await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    request.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
    request.setRequestHeader('Content-Type', file.type);
    request.setRequestHeader('x-upsert', 'false');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.min(90, Math.round((event.loaded / event.total) * 90)));
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        let responseMessage = `Storage upload failed (${request.status}).`;
        try {
          const response = JSON.parse(request.responseText);
          responseMessage = response.message || response.error || responseMessage;
        } catch {
          if (request.responseText) responseMessage = request.responseText;
        }
        reject(new Error(responseMessage));
      }
    });
    request.addEventListener('error', () => reject(new Error('Network error while uploading this attachment.')));
    request.addEventListener('abort', () => reject(new Error('Attachment upload was interrupted.')));
    request.send(file);
  });
};

export function useJobAttachments(jobId, recruiterId, enabled = true) {
  const [attachments, setAttachments] = useState([]);
  const [files, setFiles] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!jobId || !enabled) {
      setAttachments([]);
      return;
    }
    setIsLoading(true);
    const { data, error: queryError } = await supabase
      .from('job_listing_attachments')
      .select('id, job_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    setIsLoading(false);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setError('');
    setAttachments(data || []);
  }, [enabled, jobId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addFiles = useCallback((selectedFiles) => {
    const incoming = Array.from(selectedFiles || []);
    const errors = [];
    const staged = [];
    const names = new Set(attachments.map((attachment) => `${attachment.file_name}:${attachment.file_size}`));
    files.forEach((entry) => names.add(`${entry.file.name}:${entry.file.size}`));

    incoming.forEach((file) => {
      const validationError = validateJobAttachment(file);
      if (validationError) {
        errors.push(validationError);
        return;
      }
      const identity = `${file.name}:${file.size}`;
      if (names.has(identity)) {
        errors.push(`${file.name}: a file with the same name and size is already attached or selected.`);
        return;
      }
      const selectedCount = files.filter((entry) => entry.status !== 'uploaded').length;
      if (attachments.length + selectedCount + staged.length >= ATTACHMENT_RULES.maxFiles) {
        errors.push(`You can attach up to ${ATTACHMENT_RULES.maxFiles} files.`);
        return;
      }
      names.add(identity);
      staged.push({ id: createId(), file, status: 'ready', progress: 0, error: '' });
    });

    setFiles((current) => [...current, ...staged]);
    setValidationErrors(errors);
    return errors;
  }, [attachments, files]);

  const removeFile = useCallback((fileId) => {
    setFiles((current) => current.filter((entry) => entry.id !== fileId));
    setValidationErrors([]);
  }, []);

  const uploadAttachments = useCallback(async (targetJobId, uploadFiles) => {
    if (!recruiterId) {
      setError('Your recruiter session is not available. Sign in again and retry.');
      return { success: false, failed: uploadFiles.map((entry) => entry.id) };
    }
    setError('');
    const pending = uploadFiles.filter((entry) => entry.status !== 'uploaded');
    const failed = [];

    for (const entry of pending) {
      const filePath = `${recruiterId}/${targetJobId}/${createId()}-${sanitizeFilename(entry.file.name)}`;
      setFiles((current) => current.map((item) => item.id === entry.id
        ? { ...item, status: 'uploading', progress: 0, error: '' }
        : item));
      try {
        await uploadFileWithProgress(filePath, entry.file, (progress) => {
          setFiles((current) => current.map((item) => item.id === entry.id
            ? { ...item, progress }
            : item));
        });
      } catch (uploadError) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([filePath]);
        if (cleanupError) {
          console.error('Failed upload cleanup error:', cleanupError);
          setError(`Upload failed for ${entry.file.name}, and cleanup failed: ${cleanupError.message}`);
        }
        failed.push(entry.id);
        setFiles((current) => current.map((item) => item.id === entry.id
          ? { ...item, status: 'error', progress: 0, error: uploadError.message }
          : item));
        continue;
      }

      setFiles((current) => current.map((item) => item.id === entry.id
        ? { ...item, status: 'uploading', progress: 95 }
        : item));
      const { data: authData } = await supabase.auth.getUser();
      const { data: attachment, error: insertError } = await supabase
        .from('job_listing_attachments')
        .insert([{
          job_id: targetJobId,
          file_name: entry.file.name,
          file_path: filePath,
          file_size: entry.file.size,
          mime_type: entry.file.type,
          uploaded_by: authData.user?.id || recruiterId,
        }])
        .select('id, job_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at')
        .single();

      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([filePath]);
        if (cleanupError) {
          console.error('Attachment cleanup failed:', cleanupError);
          setError(`Could not save ${entry.file.name}; file cleanup also failed: ${cleanupError.message}`);
        }
        failed.push(entry.id);
        setFiles((current) => current.map((item) => item.id === entry.id
          ? { ...item, status: 'error', progress: 0, error: insertError.message }
          : item));
        if (!cleanupError) setError(`Could not save ${entry.file.name}: ${insertError.message}`);
        continue;
      }

      setAttachments((current) => [...current, { ...attachment, uploadStatus: 'uploaded' }]);
      setFiles((current) => current.map((item) => item.id === entry.id
        ? { ...item, status: 'uploaded', progress: 100, error: '' }
        : item));
    }

    return { success: failed.length === 0, failed, error: failed.length ? 'One or more attachments failed to upload. Retry the failed files.' : '' };
  }, [recruiterId]);

  const deleteAttachment = useCallback(async (attachmentId) => {
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment) return false;
    setError('');

    const { error: rowError } = await supabase
      .from('job_listing_attachments')
      .delete()
      .eq('id', attachmentId);
    if (rowError) {
      setError(rowError.message);
      return false;
    }

    setAttachments((current) => current.filter((item) => item.id !== attachmentId));
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.file_path]);
    if (storageError) {
      const { error: restoreError } = await supabase.from('job_listing_attachments').insert([{
        id: attachment.id,
        job_id: attachment.job_id,
        file_name: attachment.file_name,
        file_path: attachment.file_path,
        file_size: attachment.file_size,
        mime_type: attachment.mime_type,
        uploaded_by: attachment.uploaded_by,
        created_at: attachment.created_at,
      }]);
      if (restoreError) {
        console.error('Attachment metadata restore failed:', restoreError);
        setError(`The file could not be removed and its attachment record could not be restored: ${restoreError.message}`);
      } else {
        setAttachments((current) => [...current, attachment]);
        setError(storageError.message);
      }
      return false;
    }
    return true;
  }, [attachments]);

  const getDownloadUrl = useCallback(async (path) => {
    const { data, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signedUrlError) {
      setError(signedUrlError.message);
      return null;
    }
    return data.signedUrl;
  }, []);

  const reset = useCallback(() => {
    setAttachments([]);
    setFiles([]);
    setValidationErrors([]);
    setError('');
  }, []);

  return {
    attachments,
    files,
    validationErrors,
    error,
    isLoading,
    addFiles,
    removeFile,
    uploadAttachments,
    deleteAttachment,
    getDownloadUrl,
    refetch,
    reset,
  };
}
