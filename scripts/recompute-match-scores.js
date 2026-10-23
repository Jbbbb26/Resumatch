import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  calculateCosineSimilarity,
  calculateMatchScore,
} from '../src/data/services/matchScoring.js';

const PAGE_SIZE = 500;
const ID_BATCH_SIZE = 100;
const shouldApply = process.argv.includes('--apply');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment.');
}

const supabase = createClient(supabaseUrl, serviceKey);

async function fetchAll(createQuery) {
  const rows = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await createQuery().range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function fetchByIds(table, columns, ids) {
  const rows = [];
  for (let start = 0; start < ids.length; start += ID_BATCH_SIZE) {
    const idBatch = ids.slice(start, start + ID_BATCH_SIZE);
    rows.push(...await fetchAll(() => supabase.from(table).select(columns).in('id', idBatch)));
  }
  return rows;
}

function vectorValues(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.round((sorted.length - 1) * fraction)];
}

function uniqueIds(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))];
}

async function main() {
  const applications = await fetchAll(() =>
    supabase.from('applications')
      .select('id,candidate_id,job_id,match_score,applicant_details')
      .order('applied_at', { ascending: true }),
  );
  const [profiles, jobs] = await Promise.all([
    fetchByIds('candidate_profiles', 'id,resume_embedding', uniqueIds(applications, 'candidate_id')),
    fetchByIds('job_postings', 'id,title,description,requirements,job_embedding', uniqueIds(applications, 'job_id')),
  ]);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const rawSimilarities = [];
  const unrelatedSimilarities = [];
  const relevantSimilarities = [];
  const updates = [];

  for (const application of applications) {
    const profile = profileById.get(application.candidate_id);
    const job = jobById.get(application.job_id);
    if (!job) throw new Error(`Could not load job ${application.job_id} for application ${application.id}.`);

    const semanticSimilarity = calculateCosineSimilarity(
      vectorValues(profile?.resume_embedding),
      vectorValues(job.job_embedding),
    );
    const applicant = application.applicant_details || {};
    const components = calculateMatchScore({ applicant, job });
    const result = calculateMatchScore({ applicant, job, semanticSimilarity });

    if (semanticSimilarity !== null) {
      rawSimilarities.push(semanticSimilarity);
      if (components.breakdown.skills === 0 && components.breakdown.education <= 0.05) {
        unrelatedSimilarities.push(semanticSimilarity);
      }
      if (components.breakdown.skills >= 0.6 &&
          Math.max(components.breakdown.role, components.breakdown.education) >= 0.25) {
        relevantSimilarities.push(semanticSimilarity);
      }
    }
    if (Number(application.match_score) !== result.score) {
      updates.push({ id: application.id, score: result.score });
    }
  }

  console.log(`Applications examined: ${applications.length}`);
  console.log(`Scores that would change: ${updates.length}`);
  console.log(`Mode: ${shouldApply ? 'apply updates' : 'dry run (no writes)'}`);
  console.log('Raw cosine similarity percentiles:', {
    count: rawSimilarities.length,
    p10: percentile(rawSimilarities, 0.1),
    median: percentile(rawSimilarities, 0.5),
    p90: percentile(rawSimilarities, 0.9),
  });
  console.log('Low-overlap applicant cosine sample:', {
    count: unrelatedSimilarities.length,
    p90: percentile(unrelatedSimilarities, 0.9),
  });
  console.log('Strongly relevant applicant cosine sample:', {
    count: relevantSimilarities.length,
    p10: percentile(relevantSimilarities, 0.1),
  });

  if (!shouldApply) {
    console.log('Run again with --apply to persist the recomputed scores.');
    return;
  }

  for (const update of updates) {
    const { error } = await supabase.from('applications')
      .update({ match_score: update.score })
      .eq('id', update.id);
    if (error) throw error;
  }
  console.log(`Updated ${updates.length} application scores.`);
}

main().catch((error) => {
  console.error('Match score recomputation failed:', error.message);
  process.exitCode = 1;
});
