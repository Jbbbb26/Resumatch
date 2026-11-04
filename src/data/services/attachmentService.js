import { supabase } from '../../../supabaseClient.js';

export const ATTACHMENT_BUCKET = 'job-attachments';
const ATTACHMENT_SELECT = 'id, job_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at';

export const getAuthSession = () => supabase.auth.getSession();
export const getAuthUser = () => supabase.auth.getUser();

export const listJobAttachments = (jobId) => supabase
  .from('job_listing_attachments')
  .select(ATTACHMENT_SELECT)
  .eq('job_id', jobId)
  .order('created_at', { ascending: true });

export const insertJobAttachment = (row) => supabase
  .from('job_listing_attachments')
  .insert([row])
  .select(ATTACHMENT_SELECT)
  .single();

export const restoreJobAttachment = (row) => supabase.from('job_listing_attachments').insert([row]);

export const deleteJobAttachmentRow = (attachmentId) => supabase
  .from('job_listing_attachments')
  .delete()
  .eq('id', attachmentId);

export const removeAttachmentFiles = (paths) => supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);

export const createAttachmentSignedUrl = (path, seconds) => supabase.storage
  .from(ATTACHMENT_BUCKET)
  .createSignedUrl(path, seconds);

export const downloadAttachment = (path) => supabase.storage.from(ATTACHMENT_BUCKET).download(path);

export const uploadFileWithProgress = async (path, file, onProgress) => {
  const { data: { session }, error: sessionError } = await getAuthSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error('Your session has expired. Sign in again to upload attachments.');

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${ATTACHMENT_BUCKET}/${encodedPath}`;
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
