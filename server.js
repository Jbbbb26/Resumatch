import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
// CORS: only the frontend origins listed in CORS_ORIGINS may call the API.
// Comma-separated; an entry starting with "*." matches any subdomain, e.g.
// CORS_ORIGINS=https://resumatch.vercel.app,*.vercel.app,http://localhost:5173
// If CORS_ORIGINS is empty every origin is allowed (convenient for local dev only).
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

// Verifies the Supabase access token sent by the frontend (Authorization: Bearer <token>)
// and attaches the signed-in user to req.user.
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

const pickJobFields = (body) => {
  const job = {};
  for (const field of JOB_FIELDS) {
    if (typeof body[field] === 'string') job[field] = body[field].trim();
  }
  return job;
};

const embedJob = async ({ title, work_type, employment_type, description, requirements }) => {
  const textToEmbed = `Job Title: ${title}. Work Type: ${work_type}, ${employment_type}. Description: ${description || ''}. Requirements: ${requirements || ''}`;
  const embeddingResult = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: textToEmbed
  });
  return embeddingResult.embeddings[0].values;
};
// Health check (Railway uses this to know the deploy is up).
app.get('/', (req, res) => res.send('ResuMatch API is running.'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email: email, 
    password: password 
  });
  
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  
  res.json({ success: true, data: data });
});
app.post('/api/post-job', requireUser, requireRecruiter, async (req, res) => {
  const job = pickJobFields(req.body);
  if (!job.title) return res.status(400).json({ success: false, message: 'Job title is required.' });

  try {
    const vectorArray = await embedJob(job);

    const { data, error } = await supabase
      .from('job_postings')
      .insert([{
        ...job,
        recruiter_id: req.user.id, // taken from the verified token, not the request body
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

// Recruiters can filter their own listings; archived jobs are excluded by default.
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

// Edit an existing job listing. Only the recruiter who owns it can update it.
// The match vector is regenerated so candidate match scores reflect the new details.
app.put('/api/jobs/:id', requireUser, requireRecruiter, async (req, res) => {
  const updates = pickJobFields(req.body);
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

app.post('/api/parse-resume', requireUser, async (req, res) => {
  const { userId, fileName } = req.body;
  if (userId !== req.user.id || !String(fileName || '').startsWith(req.user.id)) {
    return res.status(403).json({ success: false, error: 'You can only parse your own resume.' });
  }
  console.log(`Processing file: ${fileName} for user: ${userId}`);

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(fileName);

    if (downloadError) throw new Error(`Supabase Download Error: ${downloadError.message}`);

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const prompt = `
      You are an expert HR parsing AI. Read the attached resume document and extract the data into a strict JSON object. 
      Only return valid JSON, no markdown formatting or extra text.
      
      Required JSON Structure:
      {
        "experience": [
          { "title": "Job Title", "company": "Company Name", "startDate": "YYYY", "endDate": "YYYY", "responsibilities": ["task 1", "task 2"] }
        ],
        "education": [
          { "degree": "Degree Name", "school": "School Name", "year": "YYYY-YYYY" }
        ],
        "skills": ["Skill 1", "Skill 2"]
      }
    `;

    let response;
    let retries = 3;
    let delay = 2000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            {
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: "application/pdf"
              }
            },
            prompt
          ],
        });
        break; 
          } catch (error) {
        if (error.status === 503 && retries > 1) {
          console.warn(`Gemini API busy (503). Retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
          delay *= 2; 
        } else {
          throw error; 
        }
      }
    }

    let aiResponseText = response.text;
    
    if (aiResponseText.includes('```json')) {
      aiResponseText = aiResponseText.replace(/```json\n?/, '').replace(/\n?```/, '');
    } else if (aiResponseText.includes('```')) {
      aiResponseText = aiResponseText.replace(/```\n?/, '').replace(/\n?```/, '');
    }

    const structuredData = JSON.parse(aiResponseText.trim());
    console.log("Successfully extracted data via Gemini!");

    const textToEmbed = `Skills: ${structuredData.skills?.join(', ')}. Experience: ${JSON.stringify(structuredData.experience)}`;
    
    const embeddingResult = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: textToEmbed 
    });
    const vectorArray = embeddingResult.embeddings[0].values;
    console.log("Successfully vectorized resume data!");
console.log("Payload size:", vectorArray.length, "dimensions");
console.log("Structured Data:", JSON.stringify(structuredData, null, 2));

    const { error: updateError } = await supabase
      .from('candidate_profiles') 
      .update({
        resume_data: structuredData, 
        skills: structuredData.skills, 
        experience: structuredData.experience, 
        resume_embedding: vectorArray, 
        resume_status: 'Parsed successfully',
        last_synced: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (updateError) throw new Error(`Database update failed: ${updateError.message}`);

    res.json({ 
      success: true, 
      data: structuredData,
      message: "Resume parsed and vectorized successfully."
    });

  } catch (error) {
    console.error("Parsing Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend AI Server running on port ${PORT}`));