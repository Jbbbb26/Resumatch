import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { analyzeJobsForCandidate } from './matchAnalysis.js';
import { EXPERIENCE_LEVELS, JOB_CATEGORIES, SALARY_MAX_ALLOWED } from './src/data/jobOptions.js';
import dns from 'node:dns';
import { createLoginHandler } from './loginLimiter.js';
import { createParseResumeHandler } from './resumeParser.js';

dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const app = express();
app.set('trust proxy', Number.isNaN(Number(process.env.TRUST_PROXY)) ? process.env.TRUST_PROXY : Number(process.env.TRUST_PROXY ?? 1));
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
const isAllowedOrigin = (origin) => allowedOrigins.some((allowed) =>
  allowed.startsWith('*.') ? new URL(origin).hostname.endsWith(allowed.slice(1)) : origin === allowed);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
}));
app.use(express.json());

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'GEMINI_API_KEY'];
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missingEnv.length) {
  console.error(`Missing environment variables: ${missingEnv.join(', ')}. Set them in Railway > Variables (or .env locally).`);
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const requireUser = async (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Please sign in again.' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });

  req.user = data.user;
  next();
};

const requireRecruiter = (req, res, next) => {
  if (req.user?.user_metadata?.role !== 'recruiter') {
    return res.status(403).json({ success: false, message: 'Only recruiter accounts can manage job listings.' });
  }
  next();
};

const JOB_FIELDS = ['title', 'location', 'work_type', 'employment_type', 'description', 'requirements'];
const HIRING_STATUSES = ['open', 'closed'];

const CHOICE_FIELDS = { experience_level: EXPERIENCE_LEVELS, job_category: JOB_CATEGORIES };
const SALARY_FIELDS = ['salary_min', 'salary_max'];

const pickJobFields = (body = {}) => {
  const job = {};
  for (const field of JOB_FIELDS) {
    if (typeof body[field] === 'string') job[field] = body[field].trim();
  }
  for (const [field, allowed] of Object.entries(CHOICE_FIELDS)) {
    if (!(field in body)) continue;
    const value = typeof body[field] === 'string' ? body[field].trim() : body[field];
    if (value === '' || value === null) job[field] = null;
    else if (allowed.includes(value)) job[field] = value;
    else return { job, error: `Invalid ${field.replace('_', ' ')}.` };
  }
  for (const field of SALARY_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw === '' || raw === null) { job[field] = null; continue; }
    const value = Number(String(raw).replace(/[,\s₱]/g, ''));
    if (!Number.isInteger(value) || value < 0 || value > SALARY_MAX_ALLOWED) {
      return { job, error: 'Salary must be a whole number of pesos per month.' };
    }
    job[field] = value;
  }
  if (job.salary_min != null && job.salary_max != null && job.salary_max < job.salary_min) {
    return { job, error: 'Maximum salary must be at least the minimum salary.' };
  }
  return { job, error: null };
};

const embedJob = async ({ title, work_type, employment_type, description, requirements }) => {
  const textToEmbed = `Job Title: ${title}. Work Type: ${work_type}, ${employment_type}. Description: ${description || ''}. Requirements: ${requirements || ''}`;
  const embeddingResult = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: textToEmbed
  });
  return embeddingResult.embeddings[0].values;
};
app.get('/', (req, res) => res.send('ResuMatch API is running.'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/login', createLoginHandler({
  supabase,
  secret: process.env.LOGIN_HASH_SECRET || process.env.SUPABASE_SERVICE_KEY,
  createAuthClient: () => createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  ),
}));
app.post('/api/post-job', requireUser, requireRecruiter, async (req, res) => {
  const { job, error: fieldError } = pickJobFields(req.body);
  if (fieldError) return res.status(400).json({ success: false, message: fieldError });
  if (!job.title) return res.status(400).json({ success: false, message: 'Job title is required.' });

  try {
    const vectorArray = await embedJob(job);

    const { data, error } = await supabase
      .from('job_postings')
      .insert([{
        ...job,
        recruiter_id: req.user.id,
        status: 'active',
        hiring_status: 'open',
        is_archived: false,
        archived_at: null,
        closed_at: null,
        job_embedding: vectorArray
      }])
      .select()
      .single();

    if (error) throw new Error(`Database insert failed: ${error.message}`);

    res.json({ success: true, data: data });

  } catch (error) {
    console.error("Job Posting Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/jobs', requireUser, requireRecruiter, async (req, res) => {
  const status = req.query.status || 'all';
  if (!['open', 'closed', 'archived', 'all'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be open, closed, archived, or all.' });
  }

  try {
    let query = supabase
      .from('job_postings')
      .select('*')
      .eq('recruiter_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status === 'open') query = query.eq('is_archived', false).eq('hiring_status', 'open');
    if (status === 'closed') query = query.eq('is_archived', false).eq('hiring_status', 'closed');
    if (status === 'archived') query = query.eq('is_archived', true);
    if (status === 'all') query = query.eq('is_archived', false);

    const { data, error } = await query;
    if (error) throw new Error(`Database query failed: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Job List Error:', error);
    res.status(500).json({ success: false, message: 'Unable to load job listings.' });
  }
});

const updateOwnedJob = async (req, res, updates, operation, requireUnarchived = false) => {
  try {
    let query = supabase
      .from('job_postings')
      .update(updates)
      .eq('id', req.params.id)
      .eq('recruiter_id', req.user.id);
    if (requireUnarchived) query = query.eq('is_archived', false);
    const { data, error } = await query.select().maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ success: false, message: 'Job listing not found or it must be restored first.' });
    return res.json({ success: true, data });
  } catch (error) {
    console.error(`${operation} Error:`, error);
    return res.status(500).json({ success: false, message: `Unable to ${operation.toLowerCase()} this listing.` });
  }
};

app.patch('/api/jobs/:id/archive', requireUser, requireRecruiter, async (req, res) => {
  return updateOwnedJob(req, res, { is_archived: true, archived_at: new Date().toISOString() }, 'Archive Job');
});

app.patch('/api/jobs/:id/restore', requireUser, requireRecruiter, async (req, res) => {
  return updateOwnedJob(req, res, { is_archived: false, archived_at: null }, 'Restore Job');
});

app.patch('/api/jobs/:id/hiring-status', requireUser, requireRecruiter, async (req, res) => {
  const { hiringStatus } = req.body || {};
  if (!HIRING_STATUSES.includes(hiringStatus)) {
    return res.status(400).json({ success: false, message: 'Hiring status must be open or closed.' });
  }

  const updates = {
    hiring_status: hiringStatus,
    closed_at: hiringStatus === 'closed' ? new Date().toISOString() : null,
  };
  return updateOwnedJob(req, res, updates, 'Update Hiring Status', true);
});

app.put('/api/jobs/:id', requireUser, requireRecruiter, async (req, res) => {
  const { job: updates, error: fieldError } = pickJobFields(req.body);
  if (fieldError) return res.status(400).json({ success: false, message: fieldError });
  if ('title' in updates && !updates.title) {
    return res.status(400).json({ success: false, message: 'Job title is required.' });
  }

  try {
    const { data: existing, error: findError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw new Error(findError.message);
    if (!existing) return res.status(404).json({ success: false, message: 'Job listing not found.' });
    if (existing.recruiter_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own listings.' });
    }

    const merged = { ...existing, ...updates };
    const textChanged = ['title', 'work_type', 'employment_type', 'description', 'requirements']
      .some((field) => field in updates && updates[field] !== existing[field]);
    if (textChanged) updates.job_embedding = await embedJob(merged);

    const { data, error } = await supabase
      .from('job_postings')
      .update(updates)
      .eq('id', req.params.id)
      .eq('recruiter_id', req.user.id)
      .select()
      .single();

    if (error) throw new Error(`Database update failed: ${error.message}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error("Job Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/parse-resume', requireUser, createParseResumeHandler({ supabase, ai }));

app.post('/api/match-analysis', requireUser, async (req, res) => {
  if (req.user?.user_metadata?.role !== 'job_seeker') {
    return res.status(403).json({ success: false, message: 'Only candidate accounts have match analysis.' });
  }
  const jobIds = [...new Set(Array.isArray(req.body?.jobIds) ? req.body.jobIds : [])]
    .filter((id) => typeof id === 'string' && id.length <= 64)
    .slice(0, 25);
  if (!jobIds.length) return res.json({ success: true, data: {} });

  try {
    const data = await analyzeJobsForCandidate({ supabase, ai, candidateId: req.user.id, jobIds });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Match Analysis Error:', error.message, '\n  cause:', error.cause?.cause || error.cause || 'none');
    res.status(500).json({ success: false, message: error.message || 'Could not analyse your match.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend AI Server running on port ${PORT}`));
