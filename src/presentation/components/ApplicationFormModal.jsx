import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APPLICATION_FORM_SECTIONS,
  createApplicationForm,
  createEmptyEducation,
  createEmptyLanguage,
  createEmptyQualification,
} from '../../data/applicationForm';
import { RepeatableRows } from './RepeatableRows';

const currentYear = new Date().getFullYear();
const validYear = (value) => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1950 && year <= currentYear + 5;
};

function validateApplication(form) {
  const errors = {};
  const required = ['fullName', 'email', 'phone', 'location'];
  required.forEach((field) => { if (!String(form[field] || '').trim()) errors[field] = 'This field is required.'; });
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (form.phone && !/^\+?[0-9\s().-]{7,20}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number.';
  if (form.summary.length > 500) errors.summary = 'Use 500 characters or fewer.';
  if (!form.education.length) errors['education.0.degreeLevel'] = 'Add at least one education entry.';
  form.education.forEach((row, index) => {
    ['degreeLevel', 'fieldOfStudy', 'school', 'yearGraduated'].forEach((field) => {
      if (!String(row[field] || '').trim()) errors[`education.${index}.${field}`] = 'This field is required.';
    });
    if (row.yearGraduated && !validYear(row.yearGraduated)) errors[`education.${index}.yearGraduated`] = `Enter a year from 1950 to ${currentYear + 5}.`;
  });
  form.qualifications.forEach((row, index) => {
    if (row.yearObtained && !validYear(row.yearObtained)) errors[`qualifications.${index}.yearObtained`] = `Enter a year from 1950 to ${currentYear + 5}.`;
  });
  if (form.skills.length > 15) errors.skills = 'Add no more than 15 skills.';
  if (!form.languages.length) errors['languages.0.language'] = 'Add at least one language.';
  const languageNames = form.languages.map((row) => row.language.trim().toLocaleLowerCase()).filter(Boolean);
  if (new Set(languageNames).size !== languageNames.length) errors['languages.0.language'] = 'Languages must not be duplicated.';
  form.languages.forEach((row, index) => {
    if (!row.language.trim()) errors[`languages.${index}.language`] = 'Language is required.';
    if (!row.proficiency) errors[`languages.${index}.proficiency`] = 'Choose a proficiency.';
  });
  if (form.profileUrl) {
    try { new URL(form.profileUrl); } catch { errors.profileUrl = 'Enter a valid URL.'; }
  }
  if (form.yearsExperience !== '' && (!Number.isFinite(Number(form.yearsExperience)) || Number(form.yearsExperience) < 0)) {
    errors.yearsExperience = 'Enter a non-negative number.';
  }
  if (form.coverNote.length > 1000) errors.coverNote = 'Use 1,000 characters or fewer.';
  return errors;
}

export function ApplicationFormModal({ job, profile, isDarkMode, isSubmitting, submitError, onSubmit, onClose }) {
  const initialForm = useMemo(() => createApplicationForm(profile), [profile]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [skillDraft, setSkillDraft] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const firstFieldRef = useRef(null);
  const inputClass = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#ea6036] focus:ring-1 focus:ring-[#ea6036] ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`;
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    firstFieldRef.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  const requestClose = useCallback(() => {
    if (isSubmitting) return;
    if (isDirty && !window.confirm('Discard your application form changes?')) return;
    onClose();
  }, [isDirty, isSubmitting, onClose]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [requestClose]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const updateRow = (group, index, field, value) => {
    setForm((current) => ({
      ...current,
      [group]: current[group].map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }));
    setIsDirty(true);
    setErrors((current) => ({ ...current, [`${group}.${index}.${field}`]: '' }));
  };

  const input = (label, name, value, onChange, { type = 'text', required = false, maxLength, placeholder = '', inputMode, min, ref } = {}) => {
    const error = errors[name];
    const errorId = `${name.replaceAll('.', '-')}-error`;
    return (
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}{required ? ' *' : ''}</span>
        <input
          ref={ref}
          type={type}
          step={type === 'number' ? 'any' : undefined}
          inputMode={inputMode || (name === 'email' ? 'email' : name === 'phone' ? 'tel' : undefined)}
          name={name}
          value={value}
          aria-required={required}
          maxLength={maxLength}
          min={min}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${inputClass} ${error ? 'border-red-500' : ''}`}
        />
        {error && <span id={errorId} className="text-xs text-red-500">{error}</span>}
      </label>
    );
  };

  const select = (label, name, value, choices, onChange, required = false) => {
    const error = errors[name];
    const errorId = `${name.replaceAll('.', '-')}-error`;
    return (
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}{required ? ' *' : ''}</span>
        <select
          name={name}
          value={value}
          aria-required={required}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${inputClass} ${error ? 'border-red-500' : ''}`}
        >
          <option value="">Select…</option>
          {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select>
        {error && <span id={errorId} className="text-xs text-red-500">{error}</span>}
      </label>
    );
  };

  const addSkill = () => {
    const skill = skillDraft.trim();
    if (!skill) return;
    if (form.skills.length >= 15) {
      setErrors((current) => ({ ...current, skills: 'Add no more than 15 skills.' }));
      return;
    }
    if (!form.skills.some((current) => current.toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      updateField('skills', [...form.skills, skill]);
    }
    setSkillDraft('');
  };

  const section = (id) => APPLICATION_FORM_SECTIONS.find((item) => item.id === id);
  const configuredInput = (field, name, value, onChange, ref) => field.control === 'select'
    ? select(field.label, name, value, field.options, onChange, field.required)
    : input(field.label, name, value, onChange, {
        type: field.type,
        required: field.required,
        maxLength: field.maxLength,
        placeholder: field.placeholder,
        inputMode: field.inputMode,
        min: field.min,
        ref,
      });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateApplication(form);
    setErrors(validationErrors);
    const firstInvalid = Object.keys(validationErrors)[0];
    if (firstInvalid) {
      document.querySelector(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    await onSubmit(form);
  };

  const profileSection = section('profile');
  const educationSection = section('education');
  const qualificationsSection = section('qualifications');
  const languagesSection = section('languages');
  const additionalSection = section('additional');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="application-title">
      <button type="button" aria-label="Close application form" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={requestClose} />
      <form onSubmit={handleSubmit} className={`relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl ${isDarkMode ? 'border border-[#1b2b3b] bg-[#0d1622]' : 'border border-slate-200 bg-white'}`}>
        <header className={`shrink-0 border-b p-5 sm:p-6 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#4fa784]">Application</p>
              <h2 id="application-title" className={`mt-1 text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Apply for {job.title}</h2>
              <p className={`mt-1 text-sm ${muted}`}>{job.company_name}</p>
            </div>
            <button type="button" aria-label="Close application form" onClick={requestClose} className={`rounded-lg p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${muted}`}>✕</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-5 sm:p-6">
          <section className="space-y-4">
            <h3 className={`border-b pb-2 text-sm font-bold ${isDarkMode ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'}`}>{profileSection.label}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {profileSection.fields.map((field) => <Fragment key={field.name}>{field.control === 'textarea' ? (
                <label key={field.name} className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{field.label}</span>
                  <textarea name={field.name} rows="3" maxLength={field.maxLength} value={form[field.name]} onChange={(event) => updateField(field.name, event.target.value)} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${field.name}-error` : `${field.name}-count`} className={`${inputClass} resize-y`} />
                  <span id={`${field.name}-count`} className={`text-right text-[11px] ${muted}`}>{form[field.name].length}/{field.maxLength}</span>
                  {errors[field.name] && <span id={`${field.name}-error`} className="text-xs text-red-500">{errors[field.name]}</span>}
                </label>
              ) : configuredInput(field, field.name, form[field.name], (value) => updateField(field.name, value), field.name === 'fullName' ? firstFieldRef : undefined)}</Fragment>)}
            </div>
          </section>

          <RepeatableRows
            label={educationSection.label}
            rows={form.education}
            minRows={1}
            createRow={createEmptyEducation}
            onAdd={(row) => { setForm((current) => ({ ...current, education: [...current.education, row] })); setIsDirty(true); }}
            onRemove={(index) => { setForm((current) => ({ ...current, education: current.education.filter((_, i) => i !== index) })); setIsDirty(true); }}
            onChange={(index, field, value) => updateRow('education', index, field, value)}
            isDarkMode={isDarkMode}
            renderRow={(row, index, change) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {educationSection.fields.map((field) => <Fragment key={field.name}>{configuredInput(field, `education.${index}.${field.name}`, row[field.name], (value) => change(field.name, value))}</Fragment>)}
              </div>
            )}
          />

          <section className="space-y-4">
            <h3 className={`border-b pb-2 text-sm font-bold ${isDarkMode ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'}`}>{qualificationsSection.label}</h3>
            <RepeatableRows
              label={qualificationsSection.rowLabel}
              rows={form.qualifications}
              minRows={0}
              createRow={createEmptyQualification}
              onAdd={(row) => { setForm((current) => ({ ...current, qualifications: [...current.qualifications, row] })); setIsDirty(true); }}
              onRemove={(index) => { setForm((current) => ({ ...current, qualifications: current.qualifications.filter((_, i) => i !== index) })); setIsDirty(true); }}
              onChange={(index, field, value) => updateRow('qualifications', index, field, value)}
              isDarkMode={isDarkMode}
              renderRow={(row, index, change) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  {qualificationsSection.fields.map((field) => <Fragment key={field.name}>{configuredInput(field, `qualifications.${index}.${field.name}`, row[field.name], (value) => change(field.name, value))}</Fragment>)}
                </div>
              )}
            />
            <div className="space-y-2">
              <label htmlFor="application-skills" className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{qualificationsSection.skills.label} (up to {qualificationsSection.skills.maxCount})</label>
              <div className="flex gap-2">
                <input id="application-skills" name="skills" value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } }} placeholder={qualificationsSection.skills.placeholder} className={inputClass} aria-invalid={Boolean(errors.skills)} aria-describedby={errors.skills ? 'skills-error' : undefined} />
                <button type="button" onClick={addSkill} className="shrink-0 rounded-lg bg-[#ea6036] px-4 text-xs font-bold text-white">Add</button>
              </div>
              {errors.skills && <p id="skills-error" className="text-xs text-red-500">{errors.skills}</p>}
              <div className="flex flex-wrap gap-2">
                {form.skills.map((skill) => <button key={skill} type="button" onClick={() => updateField('skills', form.skills.filter((item) => item !== skill))} aria-label={`Remove skill ${skill}`} className="rounded-full bg-[#ea6036]/10 px-3 py-1 text-xs font-semibold text-[#ea6036]">{skill} ×</button>)}
              </div>
            </div>
          </section>

          <RepeatableRows
            label={languagesSection.label}
            rows={form.languages}
            minRows={1}
            createRow={createEmptyLanguage}
            onAdd={(row) => { setForm((current) => ({ ...current, languages: [...current.languages, row] })); setIsDirty(true); }}
            onRemove={(index) => { setForm((current) => ({ ...current, languages: current.languages.filter((_, i) => i !== index) })); setIsDirty(true); }}
            onChange={(index, field, value) => updateRow('languages', index, field, value)}
            isDarkMode={isDarkMode}
            renderRow={(row, index, change) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {languagesSection.fields.map((field) => <Fragment key={field.name}>{field.suggestions ? (
                  <label key={field.name} className="flex flex-col gap-1.5">
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{field.label}{field.required ? ' *' : ''}</span>
                    <input list="common-languages-list" name={`languages.${index}.${field.name}`} value={row[field.name]} onChange={(event) => change(field.name, event.target.value)} aria-invalid={Boolean(errors[`languages.${index}.${field.name}`])} aria-describedby={errors[`languages.${index}.${field.name}`] ? `languages-${index}-${field.name}-error` : undefined} className={inputClass} />
                    {errors[`languages.${index}.${field.name}`] && <span id={`languages-${index}-${field.name}-error`} className="text-xs text-red-500">{errors[`languages.${index}.${field.name}`]}</span>}
                  </label>
                ) : configuredInput(field, `languages.${index}.${field.name}`, row[field.name], (value) => change(field.name, value))}</Fragment>)}
              </div>
            )}
          />
          <datalist id="common-languages-list">{languagesSection.fields.find((field) => field.suggestions)?.suggestions.map((language) => <option key={language} value={language} />)}</datalist>

          <section className="space-y-4">
            <h3 className={`border-b pb-2 text-sm font-bold ${isDarkMode ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'}`}>{additionalSection.label}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {additionalSection.fields.map((field) => <Fragment key={field.name}>{field.control === 'textarea' ? (
                <label key={field.name} className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{field.label}</span>
                  <textarea name={field.name} rows="4" maxLength={field.maxLength} value={form[field.name]} onChange={(event) => updateField(field.name, event.target.value)} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${field.name}-error` : `${field.name}-count`} className={`${inputClass} resize-y`} />
                  <span id={`${field.name}-count`} className={`text-right text-[11px] ${muted}`}>{form[field.name].length}/{field.maxLength.toLocaleString()}</span>
                  {errors[field.name] && <span id={`${field.name}-error`} className="text-xs text-red-500">{errors[field.name]}</span>}
                </label>
              ) : configuredInput(field, field.name, form[field.name], (value) => updateField(field.name, value))}</Fragment>)}
            </div>
          </section>
          {submitError && <p role="alert" aria-live="assertive" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{submitError}</p>}
        </div>
        <footer className={`flex shrink-0 justify-end gap-3 border-t p-4 sm:px-6 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <button type="button" onClick={requestClose} disabled={isSubmitting} className={`rounded-xl border px-5 py-2.5 text-sm font-bold ${isDarkMode ? 'border-white/10 text-slate-300' : 'border-slate-300 text-slate-700'}`}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-[#ea6036] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </button>
        </footer>
      </form>
    </div>
  );
}
