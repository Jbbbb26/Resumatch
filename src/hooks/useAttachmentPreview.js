import { useCallback, useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { supabase } from '../../supabaseClient.js';

const BUCKET = 'job-attachments';

export function useAttachmentPreview() {
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [html, setHtml] = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const [kind, setKind] = useState('');
  const blobUrlRef = useRef('');
  const requestId = useRef(0);

  const revokeBlobUrl = () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = '';
    setBlobUrl('');
  };

  const clear = useCallback(() => {
    requestId.current += 1;
    setPreview(null);
    setError('');
    setText('');
    setHtml('');
    setKind('');
    revokeBlobUrl();
  }, []);

  const load = useCallback(async (attachment) => {
    const currentRequestId = ++requestId.current;
    setPreview(attachment);
    setIsLoading(true);
    setError('');
    setText('');
    setHtml('');
    setKind('');
    revokeBlobUrl();

    const extension = attachment.file_name.split('.').pop()?.toLowerCase();
    if (extension === 'doc') {
      setKind('unsupported');
      setIsLoading(false);
      return;
    }

    try {
      const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(attachment.file_path);
      if (downloadError) throw downloadError;
      if (!file) throw new Error('The file download returned no data.');
      if (requestId.current !== currentRequestId) return;

      if (extension === 'txt' || attachment.mime_type === 'text/plain') {
        const content = await file.text();
        if (requestId.current !== currentRequestId) return;
        setText(content);
        setKind('text');
      } else if (extension === 'docx') {
        const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        if (requestId.current !== currentRequestId) return;
        setHtml(DOMPurify.sanitize(result.value));
        setKind('docx');
      } else if (extension === 'pdf' || attachment.mime_type === 'application/pdf') {
        const url = URL.createObjectURL(file);
        if (requestId.current !== currentRequestId) {
          URL.revokeObjectURL(url);
          return;
        }
        blobUrlRef.current = url;
        setBlobUrl(url);
        setKind('pdf');
      } else if (['png', 'jpg', 'jpeg'].includes(extension)) {
        const url = URL.createObjectURL(file);
        if (requestId.current !== currentRequestId) {
          URL.revokeObjectURL(url);
          return;
        }
        blobUrlRef.current = url;
        setBlobUrl(url);
        setKind('image');
      } else {
        setKind('unsupported');
      }
    } catch (loadError) {
      if (requestId.current !== currentRequestId) return;
      setError(loadError.message || "We couldn't load this file. Try again or download it.");
      setKind('error');
    } finally {
      if (requestId.current === currentRequestId) setIsLoading(false);
    }
  }, []);

  useEffect(() => () => {
    requestId.current += 1;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  return { preview, isLoading, error, text, html, blobUrl, kind, load, retry: () => preview && load(preview), close: clear };
}
