export function RepeatableRows({
  label,
  rows,
  onChange,
  onAdd,
  onRemove,
  createRow,
  renderRow,
  minRows = 0,
  isDarkMode,
}) {
  return (
    <fieldset className="space-y-3">
      <legend className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{label}</legend>
      {rows.map((row, index) => (
        <div key={row.id || index} className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-[#0a121c]' : 'border-slate-200 bg-slate-50'}`}>
          {renderRow(row, index, (field, value) => onChange(index, field, value), () => onRemove(index))}
          {rows.length > minRows && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="mt-3 text-xs font-bold text-red-500 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              aria-label={`Remove ${label.toLowerCase()} row ${index + 1}`}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onAdd(createRow())}
        className="rounded-lg border border-dashed border-[#ea6036]/50 px-3 py-2 text-xs font-bold text-[#ea6036] hover:bg-[#ea6036]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]"
      >
        + Add {label.replace(/s$/, '').toLowerCase()}
      </button>
    </fieldset>
  );
}
