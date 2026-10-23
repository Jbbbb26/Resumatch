import { useState } from 'react';

export function JobDescription({ text, isDarkMode, label = 'Description', collapsed = true }) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  if (!text?.trim()) return null;
  const canCollapse = text.length > 240 || text.split(/\r?\n/).length > 4;

  return (
    <div>
      {label && <h4 className={`mb-2 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{label}</h4>}
      <p
        className={`whitespace-pre-line text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
        style={!isExpanded ? {
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 4,
          overflow: 'hidden',
        } : undefined}
      >
        {text}
      </p>
      {canCollapse && (
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="mt-2 text-xs font-bold text-[#ea6036] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
