import { useMemo, useState } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { jobTextOnly } from '../../data/services/jobText';

// Pixel sizes produce inline font-size styles, so they also appear in candidate job descriptions.
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];
const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = FONT_SIZES;
Quill.register(SizeStyle, true);

const toolbar = [
  [{ header: [1, 2, 3, false] }, { size: FONT_SIZES }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'link'],
  ['clean'],
];
const formats = ['header', 'size', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'link'];

export function RichJobEditor({ id, label, value, onChange, placeholder, maxLength, isDarkMode }) {
  const [expanded, setExpanded] = useState(false);
  const modules = useMemo(() => ({ toolbar }), []);
  const length = jobTextOnly(value).length;
  const atLimit = length > maxLength;
  const labelColor = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  return (
    <div className="md:col-span-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>{label}</label>
        <button type="button" onClick={() => setExpanded((open) => !open)} className="rounded-md px-2 py-1 text-xs font-bold text-[#ea6036] hover:bg-[#ea6036]/10">
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div id={id} className={`job-rich-editor overflow-hidden rounded-xl border ${isDarkMode ? 'job-rich-editor-dark border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`}>
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={(html, _delta, _source, editor) => onChange(editor.getText().trim() ? html : '')}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className={expanded ? 'job-rich-expanded' : ''}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className={labelColor}>Select text to apply headings, sizes, bold, or other formatting.</span>
        <span role={atLimit ? 'alert' : undefined} className={atLimit ? 'font-bold text-red-500' : labelColor}>
          {length.toLocaleString()} / {maxLength.toLocaleString()}{atLimit ? ' (limit exceeded)' : ''}
        </span>
      </div>
    </div>
  );
}
