import { useState } from 'react';
import { formatFileSize } from '../../data/jobAttachments';
import { useAttachmentPreview } from '../../hooks/useAttachmentPreview';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

export function AttachmentList({ attachments, isLoading, error, isDarkMode, onDownload }) {
  const previewState = useAttachmentPreview();
  const [downloadError, setDownloadError] = useState('');

  if (isLoading) return <p role="status" className="text-xs text-slate-500">Loading attachments…</p>;
  if (error) return <p role="alert" className="text-xs text-red-500">Attachments could not be loaded: {error}</p>;
  if (!attachments?.length) return null;

  return (
    <>
      <section>
        <h4 className={`mb-3 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Attachments</h4>
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white'}`}>
              <span className={`min-w-0 flex-1 truncate text-xs font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{attachment.file_name}</span>
              <span className="text-[10px] text-slate-500">{formatFileSize(Number(attachment.file_size))}</span>
              <button type="button" onClick={() => previewState.load(attachment)} aria-label={`Preview ${attachment.file_name}`} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#ea6036] hover:bg-[#ea6036]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036]">Preview</button>
              <button type="button" onClick={async () => { setDownloadError(''); const success = await onDownload(attachment); if (!success) setDownloadError(`Could not download ${attachment.file_name}.`); }} aria-label={`Download ${attachment.file_name}`} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'}`}>Download</button>
            </li>
          ))}
        </ul>
        {downloadError && <p role="alert" className="mt-2 text-xs text-red-500">{downloadError}</p>}
      </section>
      <AttachmentPreviewModal previewState={previewState} isDarkMode={isDarkMode} onDownload={onDownload} />
    </>
  );
}
