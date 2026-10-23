import { jobTextOnly } from '../../data/services/jobText';
export function KeywordChips({ job, profile, isDarkMode }) {
  if (!job?.requirements?.trim()) return null;
  const returned = Array.isArray(job.matched_keywords) ? job.matched_keywords : [];
  const skills = returned.length
    ? returned.map((item) => typeof item === 'string'
      ? { label: item, matched: true }
      : { label: item.keyword || item.label || item.name, matched: item.matched !== false })
    : (Array.isArray(profile?.skills) ? profile.skills : profile?.resume_data?.skills || [])
      .map((skill) => typeof skill === 'string' ? skill.trim() : skill?.name?.trim())
      .filter(Boolean)
      .map((skill) => ({ label: skill, matched: `${jobTextOnly(job.requirements)}\n${jobTextOnly(job.description)}`.toLocaleLowerCase().includes(skill.toLocaleLowerCase()) }));
  if (!skills.length) return null;

  return (
    <section>
      <h4 className={`mb-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Matched keywords</h4>
      <div className="flex flex-wrap gap-2">
        {skills.map(({ label: skill, matched }, index) => {
          return (
            <span
              key={`${skill}-${index}`}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${matched
                ? (isDarkMode ? 'border-[#1b4332] bg-[#1b4332]/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800')
                : (isDarkMode ? 'border-white/10 bg-[#0a121c] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}`}
            >
              {skill}
            </span>
          );
        })}
      </div>
    </section>
  );
}
