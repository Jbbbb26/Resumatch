import { createHash } from 'node:crypto';

export const EMBEDDING_MODEL = 'gemini-embedding-2';
const ANALYSIS_VERSION = 1;
const EMBED_CONCURRENCY = 6;

const num = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};
export const MATCH_SETTINGS = Object.freeze({
  floor: num('MATCH_SIM_FLOOR', 0.68),
  ceiling: num('MATCH_SIM_CEILING', 0.85),
  metAt: num('MATCH_SIM_MET', 0.8),
  partialAt: num('MATCH_SIM_PARTIAL', 0.73),
  overallFloor: num('MATCH_OVERALL_FLOOR', 0.764),
  overallCeiling: num('MATCH_OVERALL_CEILING', 0.9),
  coverageWeight: 0.85,
  overallWeight: 0.15,
  requirementWeight: 1,
  responsibilityWeight: 0.5,
  maxRequirements: 15,
  maxResponsibilities: 10,
  maxEvidence: 60,
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const decodeEntities = (text) => text
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

export function plainText(value) {
  return decodeEntities(String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '));
}

const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

const isHeading = (line) => wordCount(line) <= 5 && !/[.!?]$/.test(line)
  && line.split(/\s+/).every((word) => /^[A-Z&/]/.test(word) || /^(and|or|of|the|for|to|&)$/i.test(word));

export function splitLines(value) {
  const lines = [];
  for (const raw of plainText(value).split(/\n|•|▪|◦|·/)) {
    const line = raw.replace(/^\s*(?:[-*–]|\d+[.)])\s+/, '').replace(/\s+/g, ' ').trim();
    if (wordCount(line) < 3 || /:$/.test(line) || isHeading(line)) continue;
    const parts = wordCount(line) > 35 ? line.split(/(?<=[.!?])\s+(?=[A-Z])/) : [line];
    for (const part of parts) if (wordCount(part) >= 3) lines.push(part.trim());
  }
  return [...new Set(lines)];
}

export function jobItems(job) {
  const { maxRequirements, maxResponsibilities, requirementWeight, responsibilityWeight } = MATCH_SETTINGS;
  const requirements = splitLines(job.requirements).slice(0, maxRequirements)
    .map((text) => ({ text, source: 'requirement', weight: requirementWeight }));
  const seen = new Set(requirements.map((item) => item.text));
  const responsibilities = splitLines(job.description).filter((text) => !seen.has(text))
    .slice(0, maxResponsibilities)
    .map((text) => ({ text, source: 'description', weight: responsibilityWeight }));
  return [...requirements, ...responsibilities];
}

const asArray = (value) => (Array.isArray(value) ? value : []);
const firstList = (...lists) => lists.find((list) => Array.isArray(list) && list.length) || [];
const skillName = (skill) => (typeof skill === 'string' ? skill : skill?.name || '').trim();

export function resumeItems(profile) {
  const resume = profile?.resume_data && typeof profile.resume_data === 'object' ? profile.resume_data : {};
  const items = [];
  const add = (text, type) => {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (clean && !items.some((item) => item.text === clean)) items.push({ text: clean, type });
  };

  const summary = resume.summary || resume.professionalSummary || profile?.summary || '';
  for (const sentence of plainText(summary).split(/(?<=[.!?])\s+/)) if (wordCount(sentence) >= 3) add(sentence, 'summary');

  for (const entry of firstList(profile?.experience, resume.experience)) {
    const title = [entry?.title, entry?.company && `at ${entry.company}`].filter(Boolean).join(' ');
    if (title) add(title, 'experience');
    const duties = [...asArray(entry?.responsibilities), entry?.description].filter(Boolean);
    for (const duty of duties) add(entry?.title ? `${entry.title}: ${duty}` : duty, 'experience');
  }

  for (const entry of firstList(profile?.education, resume.education)) {
    add([entry?.degree, entry?.degreeLevel, entry?.fieldOfStudy || entry?.field, entry?.school && `from ${entry.school}`]
      .filter(Boolean).join(' '), 'education');
  }

  const skills = [...new Set([...asArray(profile?.skills), ...asArray(resume.skills)].map(skillName).filter(Boolean))];
  for (const skill of skills) add(skill, 'skill');

  return items.slice(0, MATCH_SETTINGS.maxEvidence);
}

export function cosine(left, right) {
  if (!left || !right || left.length !== right.length || !left.length) return null;
  let dot = 0; let l = 0; let r = 0;
  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i]; l += left[i] * left[i]; r += right[i] * right[i];
  }
  const denominator = Math.sqrt(l * r);
  return denominator > 0 ? dot / denominator : null;
}

export function parseVector(value) {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try { return JSON.parse(value).map(Number); } catch { return null; }
  }
  return null;
}

const credit = (similarity) => clamp01((similarity - MATCH_SETTINGS.floor) / (MATCH_SETTINGS.ceiling - MATCH_SETTINGS.floor));
const statusFor = (similarity) => (similarity >= MATCH_SETTINGS.metAt ? 'met'
  : similarity >= MATCH_SETTINGS.partialAt ? 'partial' : 'missing');

export function scoreAnalysis({ requirements, evidence, overallSimilarity }) {
  const rows = requirements.map((requirement) => {
    let best = null;
    for (const item of evidence) {
      const similarity = cosine(requirement.vector, item.vector);
      if (similarity != null && (!best || similarity > best.similarity)) best = { item, similarity };
    }
    const similarity = best?.similarity ?? 0;
    return {
      text: requirement.text,
      source: requirement.source,
      weight: requirement.weight,
      similarity: Math.round(similarity * 1000) / 1000,
      credit: Math.round(credit(similarity) * 1000) / 1000,
      status: best ? statusFor(similarity) : 'missing',
      evidence: best && statusFor(similarity) !== 'missing' ? best.item.text : null,
      evidenceType: best && statusFor(similarity) !== 'missing' ? best.item.type : null,
    };
  });

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const overall = Number.isFinite(overallSimilarity)
    ? clamp01((overallSimilarity - MATCH_SETTINGS.overallFloor) / (MATCH_SETTINGS.overallCeiling - MATCH_SETTINGS.overallFloor))
    : 0;
  const coverage = totalWeight ? rows.reduce((sum, row) => sum + row.credit * row.weight, 0) / totalWeight : overall;
  const hasEvidence = evidence.length > 0;
  const score = hasEvidence
    ? Math.round(100 * clamp01(MATCH_SETTINGS.coverageWeight * coverage + MATCH_SETTINGS.overallWeight * overall))
    : 0;

  return {
    score,
    coverage: Math.round(coverage * 1000) / 1000,
    overallSimilarity: Number.isFinite(overallSimilarity) ? Math.round(overallSimilarity * 1000) / 1000 : null,
    requirements: rows,
  };
}

function stepError(step, error) {
  const cause = error?.cause;
  const causeText = cause ? (cause.code || cause.message || String(cause)) : '';
  const base = error?.message || String(error);
  const details = error?.details || error?.hint || '';
  const wrapped = new Error(`${step} failed: ${base}${causeText ? ` (${causeText})` : ''}${details ? ` - ${details}` : ''}`);
  wrapped.cause = error;
  return wrapped;
}

const TRANSIENT_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT']);
const isTransient = (error) => TRANSIENT_CODES.has(error?.cause?.code)
  || [429, 500, 503].includes(error?.status) || error?.message === 'fetch failed';

const vectorCache = new Map();
const VECTOR_CACHE_LIMIT = 5000;

async function embedOne(ai, text) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const result = await ai.models.embedContent({ model: EMBEDDING_MODEL, contents: text });
      const values = result?.embeddings?.[0]?.values;
      if (!Array.isArray(values) || !values.length) throw new Error('Embedding service returned no vector.');
      return values;
    } catch (error) {
      if (attempt >= 4 || !isTransient(error)) throw stepError('Gemini embedding request', error);
      const wait = (error?.status === 429 ? 3000 : 1000) * attempt;
      console.warn(`[match-analysis] Gemini request failed (${error.cause?.code || error.status || error.message}), retrying in ${wait / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

async function embedTexts(ai, texts) {
  const missing = [...new Set(texts)].filter((text) => !vectorCache.has(text));
  let next = 0;
  const worker = async () => {
    while (next < missing.length) {
      const text = missing[next];
      next += 1;
      const vector = await embedOne(ai, text);
      if (vectorCache.size >= VECTOR_CACHE_LIMIT) vectorCache.delete(vectorCache.keys().next().value);
      vectorCache.set(text, vector);
    }
  };
  await Promise.all(Array.from({ length: Math.min(EMBED_CONCURRENCY, missing.length) }, worker));
  return texts.map((text) => vectorCache.get(text));
}

function inputHash(jobList, evidence) {
  const { maxEvidence, ...settings } = MATCH_SETTINGS; // eslint-disable-line no-unused-vars
  return createHash('sha256').update(JSON.stringify({
    v: ANALYSIS_VERSION, model: EMBEDDING_MODEL, settings,
    job: jobList.map(({ text, source }) => [text, source]),
    resume: evidence.map(({ text, type }) => [text, type]),
  })).digest('hex');
}

const toResult = (row) => ({
  jobId: row.job_id,
  score: row.score,
  coverage: row.coverage,
  overallSimilarity: row.overall_similarity,
  requirements: row.requirements || [],
  computedAt: row.computed_at,
});

export async function analyzeJobsForCandidate({ supabase, ai, candidateId, jobIds }) {
  const [{ data: profile, error: profileError }, { data: jobs, error: jobsError }, { data: cached, error: cacheError }] = await Promise.all([
    supabase.from('candidate_profiles').select('*').eq('id', candidateId).maybeSingle(),
    supabase.from('job_postings')
      .select('id,title,description,requirements,job_embedding,status,is_archived')
      .in('id', jobIds),
    supabase.from('job_match_analysis').select('*').eq('candidate_id', candidateId).in('job_id', jobIds),
  ]);
  if (profileError) throw stepError('Supabase read of candidate_profiles', profileError);
  if (jobsError) throw stepError('Supabase read of job_postings', jobsError);
  if (cacheError) throw stepError('Supabase read of job_match_analysis (has the migration been run?)', cacheError);

  const evidence = resumeItems(profile);
  const cacheByJob = new Map((cached || []).map((row) => [row.job_id, row]));
  const results = {};
  const pending = [];

  for (const job of jobs || []) {
    if (job.status && job.status !== 'active') continue;
    if (job.is_archived) continue;
    const items = jobItems(job);
    const hash = inputHash(items, evidence);
    const hit = cacheByJob.get(job.id);
    if (hit && hit.input_hash === hash) results[job.id] = toResult(hit);
    else pending.push({ job, items, hash });
  }
  if (!pending.length) return results;

  const resumeTexts = evidence.map((item) => item.text);
  const jobTexts = pending.flatMap(({ items }) => items.map((item) => item.text));
  const vectors = await embedTexts(ai, [...resumeTexts, ...jobTexts]);
  const evidenceVectors = evidence.map((item, index) => ({ ...item, vector: vectors[index] }));
  const resumeVector = parseVector(profile?.resume_embedding);

  let offset = resumeTexts.length;
  const rows = [];
  for (const { job, items, hash } of pending) {
    const requirements = items.map((item, index) => ({ ...item, vector: vectors[offset + index] }));
    offset += items.length;
    const overallSimilarity = cosine(resumeVector, parseVector(job.job_embedding));
    const analysis = scoreAnalysis({ requirements, evidence: evidenceVectors, overallSimilarity: overallSimilarity ?? NaN });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[match-analysis] ${job.title}: score ${analysis.score}, coverage ${analysis.coverage}, overall ${analysis.overallSimilarity}`);
      for (const row of analysis.requirements) console.log(`  ${row.similarity.toFixed(3)} ${row.status.padEnd(7)} ${row.text.slice(0, 70)}`);
    }

    const row = {
      candidate_id: candidateId,
      job_id: job.id,
      input_hash: hash,
      score: analysis.score,
      coverage: analysis.coverage,
      overall_similarity: analysis.overallSimilarity,
      requirements: analysis.requirements,
      computed_at: new Date().toISOString(),
    };
    rows.push(row);
    results[job.id] = toResult(row);
  }

  const { error: saveError } = await supabase.from('job_match_analysis').upsert(rows, { onConflict: 'candidate_id,job_id' });
  if (saveError) console.error('Could not cache match analysis:', saveError.message);
  return results;
}
