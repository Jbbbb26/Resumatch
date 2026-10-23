import { useEffect, useRef } from 'react';

export function AttachmentPreviewModal({ previewState, isDarkMode, onDownload }) {
  const closeButton = useRef(null);
  useEffect(() => {
    if (!previewState.preview) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        previewState.close();
      }
      if (event.key !== 'Tab') return;
      const focusable = [...document.querySelectorAll('[data-attachment-preview] button:not([disabled]), [data-attachment-preview] a[href], [data-attachment-preview] iframe')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [previewState.close, previewState.preview]);

  if (!previewState.preview) return null;
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div data-attachment-preview className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="attachment-preview-title">
      <button type="button" aria-label="Close attachment preview" onClick={previewState.close} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <section className={`relative z-10 flex h-[min(90dvh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl ${isDarkMode ? 'border border-white/10 bg-[#0d1622]' : 'border border-slate-200 bg-white'}`}>
        <header className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 sm:px-6 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <h2 id="attachment-preview-title" className={`min-w-0 flex-1 truncate text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{previewState.preview.file_name}</h2>
          <button type="button" onClick={() => onDownload(previewState.preview)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#ea6036] hover:bg-[#ea6036]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036]">Download</button>
          <button ref={closeButton} type="button" onClick={previewState.close} aria-label="Close preview" className={`rounded-lg p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${muted}`}>✕</button>
        </header>
        <div className={`min-h-0 flex-1 overflow-auto ${isDarkMode ? 'bg-[#080d14] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
          {previewState.isLoading ? (
            <div role="status" className={`flex h-full items-center justify-center text-sm ${muted}`}>Loading preview…</div>
          ) : previewState.kind === 'error' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p role="alert" className="text-sm text-red-500">We couldn't load this file. Try again or download it.</p>
              <button type="button" onClick={previewState.retry} className="rounded-lg bg-[#ea6036] px-4 py-2 text-xs font-bold text-white">Try again</button>
            </div>
          ) : previewState.kind === 'unsupported' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className={`text-sm ${muted}`}>Preview isn't available for this file type.</p>
              <button type="button" onClick={() => onDownload(previewState.preview)} className="rounded-lg bg-[#ea6036] px-4 py-2 text-xs font-bold text-white">Download file</button>
            </div>
          ) : previewState.kind === 'pdf' ? (
            <iframe title={`Preview of ${previewState.preview.file_name}`} src={previewState.blobUrl} className="h-full min-h-[60vh] w-full border-0" />
          ) : previewState.kind === 'image' ? (
            <div className="flex h-full items-center justify-center p-4"><img src={previewState.blobUrl} alt={previewState.preview.file_name} className="max-h-full max-w-full object-contain" /></div>
          ) : previewState.kind === 'text' ? (
            <pre className="h-full whitespace-pre-wrap break-words p-5 text-sm">{previewState.text}</pre>
          ) : previewState.kind === 'docx' ? (
            <article className={`prose max-w-none p-5 ${isDarkMode ? 'prose-invert' : ''}`} dangerouslySetInnerHTML={{ __html: previewState.html }} />
          ) : null}
        </div>
      </section>
    </div>
  );
}
