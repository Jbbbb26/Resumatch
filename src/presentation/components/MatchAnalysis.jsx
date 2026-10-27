const pct = (value) => Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);

const STATUS = {
  met: { label: 'Covered', icon: '✓', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', dark: 'bg-emerald-950/40 text-emerald-300 border-emerald-900' },
  partial: { label: 'Partly covered', icon: '~', light: 'bg-amber-50 text-amber-700 border-amber-200', dark: 'bg-amber-950/30 text-amber-300 border-amber-900' },
  missing: { label: 'Not found', icon: '✕', light: 'bg-red-50 text-red-700 border-red-200', dark: 'bg-red-950/30 text-red-300 border-red-900' },
};

const EVIDENCE_LABEL = { skill: 'Skill', experience: 'Experience', education: 'Education', summary: 'Summary' };

function headlineExplanation(job, analysis, recruiter) {
  if (job.qualification_mismatch) {
    return 'This shows 0% because it is a clinical nursing role and no nursing degree, nursing experience or clinical skills were found on your profile.';
  }
  if (!analysis) {
    if (job.matchAnalysisError) return `The match analysis could not be loaded: ${job.matchAnalysisError}`;
    return 'There is no match score for this job yet. Either it was not in your top recommendations, or your profile does not have enough parsed resume data to compare.';
  }
  if (recruiter) {
    return `Each requirement in this posting was compared with every skill, duty and qualification on the candidate's resume using AI embeddings. The ${analysis.score}% mostly reflects how many requirements have close evidence on their resume.`;
  }
  return `Each requirement in this posting was compared with every skill, duty and qualification on your resume using AI embeddings. Your ${analysis.score}% mostly reflects how many requirements have close evidence on your resume.`;
}

function RequirementRow({ row, isDarkMode, whose = 'your' }) {
  const status = STATUS[row.status] || STATUS.missing;
  return (
    <li className={`rounded-xl border p-3 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${isDarkMode ? status.dark : status.light}`} aria-hidden="true">{status.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-snug ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.text}</p>
          <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="font-semibold">{status.label}</span>
            {' · '}{row.status === 'missing'
              ? `closest line on ${whose} resume is only ${pct(row.similarity)}% similar (73% needed)`
              : `${pct(row.similarity)}% similar to ${whose} resume`}
            {row.source === 'description' && ' · from job description'}
          </p>
          {row.evidence && (
            <p className={`mt-1.5 border-l-2 pl-2 text-xs italic leading-relaxed ${isDarkMode ? 'border-white/15 text-slate-300' : 'border-slate-300 text-slate-600'}`}>
              {EVIDENCE_LABEL[row.evidenceType] ? `${EVIDENCE_LABEL[row.evidenceType]}: ` : ''}{row.evidence}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function MatchAnalysis({ job, isDarkMode, className = '', audience = 'candidate', title = 'Why this score?', isLoading = false }) {
  const recruiter = audience === 'recruiter';
  const whose = recruiter ? "the candidate's" : 'your';
  const analysis = job?.matchAnalysis || null;
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const heading = isDarkMode ? 'text-white' : 'text-slate-900';
  const rows = analysis?.requirements || [];
  const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
  const requirementRows = rows.filter((row) => row.source === 'requirement');
  const descriptionRows = rows.filter((row) => row.source !== 'requirement');

  return (
    <section className={`space-y-4 ${className}`} aria-labelledby={`match-analysis-${job.id}`}>
      <div className="space-y-1.5">
        <h4 id={`match-analysis-${job.id}`} className={`text-xs font-bold uppercase tracking-wider ${heading}`}>{title}</h4>
        <p className={`text-sm leading-relaxed ${muted}`}>
          {isLoading && !analysis
            ? 'Comparing your resume with each requirement in this job. This takes a few seconds the first time…'
            : headlineExplanation(job, analysis, recruiter)}
        </p>
      </div>

      {analysis && rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {['met', 'partial', 'missing'].map((key) => (
              <div key={key} className={`rounded-xl border px-2 py-2.5 ${isDarkMode ? STATUS[key].dark : STATUS[key].light}`}>
                <div className="text-lg font-extrabold leading-none">{counts[key] || 0}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{STATUS[key].label}</div>
              </div>
            ))}
          </div>

          {requirementRows.length > 0 && (
            <div className="space-y-2">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}>Requirements</p>
              <ul className="space-y-2">{requirementRows.map((row) => <RequirementRow key={row.text} row={row} isDarkMode={isDarkMode} whose={whose} />)}</ul>
            </div>
          )}

          {descriptionRows.length > 0 && (
            <details className="group">
              <summary className={`cursor-pointer text-[11px] font-bold uppercase tracking-wider ${muted}`}>
                Responsibilities from the description ({descriptionRows.length})
              </summary>
              <ul className="mt-2 space-y-2">{descriptionRows.map((row) => <RequirementRow key={row.text} row={row} isDarkMode={isDarkMode} whose={whose} />)}</ul>
            </details>
          )}

          <p className={`border-t pt-3 text-xs leading-relaxed ${isDarkMode ? 'border-white/10' : 'border-slate-200'} ${muted}`}>
            How it's calculated: requirement coverage {pct(analysis.coverage)}% (85% of the score; listed requirements count twice as much as description lines)
            {analysis.overallSimilarity != null && <> plus overall resume similarity {pct(analysis.overallSimilarity)}% (15%)</>}.
            {!recruiter && ' To raise it, add true, specific evidence to your resume for the requirements marked "Not found".'}
          </p>
        </>
      )}

      {analysis && rows.length === 0 && (
        <p className={`text-sm ${muted}`}>This posting has no separate requirement lines, so the score is based on overall resume similarity only.</p>
      )}
    </section>
  );
}
