export const ATTACHMENT_RULES = Object.freeze({
  extensions: ['.pdf', '.doc', '.docx', '.txt'],
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  mimeTypes: {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
  },
});

/**
 * @typedef {{ id: string, job_id: string, file_name: string, file_path: string, file_size: number, mime_type: string, uploaded_by: string, created_at: string, uploadStatus?: 'uploaded' }} JobAttachment
 */

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function sanitizeFilename(filename) {
  const normalized = filename.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^[_\.]+|[_\.]+$/g, '');
  return safe || 'attachment';
}

export function validateJobAttachment(file) {
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const expectedMime = ATTACHMENT_RULES.mimeTypes[extension];
  if (!expectedMime || !ATTACHMENT_RULES.extensions.includes(extension)) {
    return `${file.name}: only PDF, DOC, DOCX, and TXT files are allowed.`;
  }
  if (file.type !== expectedMime) {
    return `${file.name}: the file type does not match its ${extension} extension.`;
  }
  if (file.size <= 0 || file.size > ATTACHMENT_RULES.maxFileSize) {
    return `${file.name}: files must be larger than 0 bytes and no larger than 5 MB.`;
  }
  return '';
}
