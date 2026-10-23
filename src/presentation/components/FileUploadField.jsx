import { useRef, useState } from 'react';
import { ATTACHMENT_RULES, formatFileSize } from '../../data/jobAttachments';

const typeIcon = (filename) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'PDF';
  if (extension === 'doc' || extension === 'docx') return 'DOC';
  return 'TXT';
};

export function FileUploadField({
  files,
  attachments,
  validationErrors,
  uploadError,
  isLoading,
  isSubmitting,
  isDarkMode,
  onAddFiles,
  onRemoveFile,
  onRemoveAttachment,
  onDownloadAttachment,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const labelColor = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const secondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const isUnavailable = isSubmitting || isLoading;
  const pendingCount = files.filter((entry) => entry.status !== 'uploaded').length;
  const totalCount = attachments.length + pendingCount;

  const browse = () => {
    if (!isUnavailable) inputRef.current?.click();
  };
  const handleFiles = (selected) => {
    onAddFiles(selected);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Attachments (optional)</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_RULES.extensions.join(',')}
        className="sr-only"
        aria-label="Choose job listing attachments"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div
        role="button"
        tabIndex={isUnavailable ? -1 : 0}
        aria-label="Drag and drop files here, or click to browse"
        aria-disabled={isUnavailable}
        onClick={browse}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !isUnavailable) {
            event.preventDefault();
            browse();
          }
        }}
        onDragEnter={(event) => { event.preventDefault(); if (!isUnavailable) setIsDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!isUnavailable) handleFiles(event.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036] ${isDragging ? 'border-[#ea6036] bg-[#ea6036]/10' : (isDarkMode ? 'border-white/15 hover:border-[#ea6036]/70 hover:bg-white/[0.02]' : 'border-slate-300 hover:border-[#ea6036]/70 hover:bg-orange-50/40')} ${isUnavailable ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Drag and drop files here, or click to browse</span>
        <span className={`mt-1 block text-xs ${secondary}`}>PDF, DOC, DOCX, TXT. Max 5 MB each. Up to 3 files.</span>
        <span className={`mt-1 block text-[11px] ${secondary}`}>{totalCount} of {ATTACHMENT_RULES.maxFiles} files</span>
      </div>

      <div aria-live="polite" className="space-y-1" role="status">
        {validationErrors.map((error, index) => <p key={`${index}-${error}`} className="text-xs text-red-500">{error}</p>)}
        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      </div>

      {(attachments.length > 0 || files.length > 0 || isLoading) && (
        <ul className="space-y-2" aria-label="Selected job attachments">
          {isLoading && <li className={`text-xs ${secondary}`}>Loading existing attachments…</li>}
          {attachments.map((attachment) => (
            <li key={attachment.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${isDarkMode ? 'border-white/10 bg-[#0a121c]' : 'border-slate-200 bg-slate-50'}`}>
              <span className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ea6036]/10 text-[9px] font-black text-[#ea6036]">{typeIcon(attachment.file_name)}</span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{attachment.file_name}</span>
                <span className={`block text-[10px] ${secondary}`}>{formatFileSize(Number(attachment.file_size))}</span>
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-emerald-600">{attachment.uploadStatus ? 'Uploaded' : 'Attached'}</span>
              <button
                type="button"
                onClick={() => onDownloadAttachment(attachment)}
                aria-label={`Download ${attachment.file_name}`}
                className="rounded-md px-2 py-1 text-[11px] font-bold text-[#ea6036] hover:bg-[#ea6036]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036]"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment)}
                disabled={isSubmitting}
                aria-label={`Remove ${attachment.file_name}`}
                className={`rounded-md px-2 py-1 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50 ${isDarkMode ? 'text-slate-400 hover:bg-red-900/20 hover:text-red-300' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
              >
                ×
              </button>
            </li>
          ))}
          {files.filter((entry) => entry.status !== 'uploaded').map((entry) => (
            <li key={entry.id} className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? 'border-white/10 bg-[#0a121c]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ea6036]/10 text-[9px] font-black text-[#ea6036]">{typeIcon(entry.file.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{entry.file.name}</span>
                  <span className={`block text-[10px] ${secondary}`}>{formatFileSize(entry.file.size)}</span>
                </span>
                {entry.status === 'uploaded' ? (
                  <span className="text-[11px] font-semibold text-emerald-600">Uploaded</span>
                ) : entry.status === 'error' ? (
                  <span className="text-[11px] font-semibold text-red-500">Failed</span>
                ) : entry.status === 'uploading' ? (
                  <span className="text-[11px] font-semibold text-[#ea6036]">Uploading…</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemoveFile(entry.id)}
                  disabled={isSubmitting}
                  aria-label={`Remove ${entry.file.name}`}
                  className={`rounded-md px-2 py-1 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50 ${isDarkMode ? 'text-slate-400 hover:bg-red-900/20 hover:text-red-300' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
                >
                  ×
                </button>
              </div>
              {entry.status === 'uploading' && (
                <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} role="progressbar" aria-label={`Uploading ${entry.file.name}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={entry.progress}>
                  <div className="h-full animate-pulse rounded-full bg-[#ea6036] transition-all" style={{ width: `${entry.progress}%` }} />
                </div>
              )}
              {entry.error && <p className="mt-1 text-[10px] text-red-500">{entry.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
