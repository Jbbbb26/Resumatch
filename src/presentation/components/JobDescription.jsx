import { useState } from 'react';
import DOMPurify from 'dompurify';
import { jobTextOnly } from '../../data/services/jobText';

export function JobDescription({ text, isDarkMode, label = 'Description', collapsed = true }) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const readable = jobTextOnly(text);
  if (!readable.trim()) return null;
  const canCollapse = readable.length > 240 || readable.split(/\r?\n/).length > 4;
  const isHtml = /<\/?(?:p|h[1-3]|strong|em|span|ol|ul|li|blockquote|div|br|a)\b/i.test(text);
  const contentClass = `job-rich-text ql-editor !p-0 text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`;
  const collapseStyle = !isExpanded ? {
    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 4, overflow: 'hidden',
  } : undefined;

  return (
    <div>
      {label && <h4 className={`mb-2 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{label}</h4>}
      {isHtml ? (
        <div className={contentClass} style={collapseStyle} dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(text, {
            ALLOWED_TAGS: ['p', 'div', 'br', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'blockquote', 'ol', 'ul', 'li', 'a'],
            ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'data-list'],
          }),
        }} />
      ) : (
        <div className={`${contentClass} whitespace-pre-wrap`} style={collapseStyle}>{text}</div>
      )}
      {canCollapse && (
        <button type="button" onClick={() => setIsExpanded((expanded) => !expanded)}
          className="mt-2 text-xs font-bold text-[#ea6036] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]">
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
