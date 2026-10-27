export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const PARSE_MODEL = 'gemini-3.6-flash';
const EMBEDDING_MODEL = 'gemini-embedding-2';

export const RESUME_ERRORS = Object.freeze({
  FILE_MISSING: {
    status: 404, retryable: false,
    message: "We couldn't find the resume file you uploaded.",
    nextStep: 'Upload your resume again.',
  },
  TOO_LARGE: {
    status: 413, retryable: false,
    message: 'Your resume file is larger than 10 MB.',
    nextStep: 'Save a smaller PDF (for example, without large images) and upload it again.',
  },
  NOT_PDF: {
    status: 422, retryable: false,
    message: "This file isn't a readable PDF.",
    nextStep: 'Open your resume in Word or Google Docs, choose File → Download/Save as → PDF, and upload that file.',
  },
  PASSWORD_PROTECTED: {
    status: 422, retryable: false,
    message: 'Your PDF is password-protected, so it can’t be read.',
    nextStep: 'Open it, choose Print → Save as PDF to make an unprotected copy, and upload that copy.',
  },
  NO_TEXT: {
    status: 422, retryable: false,
    message: "We couldn't find any resume details in this file.",
    nextStep: 'It may be a scanned image or a photo. Upload a PDF exported from Word or Google Docs, or click "Edit Data" to fill in your details yourself.',
  },
  NOT_A_RESUME: {
    status: 422, retryable: false,
    message: "This file doesn't look like a resume or CV.",
    nextStep: 'Check that you picked the right file, then upload your resume.',
  },
  READER_BUSY: {
    status: 503, retryable: true,
    message: 'The resume reader is busy right now.',
    nextStep: 'Your file is saved. Click "Try again" in a minute.',
  },
  READER_UNREACHABLE: {
    status: 503, retryable: true,
    message: "We couldn't reach the resume reader.",
    nextStep: 'Your file is saved. Check your connection and click "Try again".',
  },
  SAVE_FAILED: {
    status: 500, retryable: true,
    message: "We read your resume but couldn't save the details to your profile.",
    nextStep: 'Click "Try again".',
  },
  UNKNOWN: {
    status: 500, retryable: true,
    message: 'Something went wrong while reading your resume.',
    nextStep: 'Click "Try again". If it keeps happening, upload a different PDF or click "Edit Data" to fill in your details yourself.',
  },
});

export class ResumeReadError extends Error {
  constructor(code, cause) {
    super(RESUME_ERRORS[code]?.message || code);
    this.code = code;
    this.cause = cause;
  }
}

const NETWORK_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT']);

export function classifyAiError(error) {
  if (error instanceof ResumeReadError) return error.code;
  const status = Number(error?.status);
  const text = String(error?.message || '');
  if (status === 429 || status === 503 || /overloaded|resource exhausted|unavailable/i.test(text)) return 'READER_BUSY';
  if (NETWORK_CODES.has(error?.cause?.code) || text === 'fetch failed') return 'READER_UNREACHABLE';
  if (status === 400 && /pdf|document|mime|invalid argument|unable to process|no pages/i.test(text)) return 'NOT_PDF';
  return 'UNKNOWN';
}

const isTransient = (error) => ['READER_BUSY', 'READER_UNREACHABLE'].includes(classifyAiError(error));

async function withRetries(task, attempts = 3) {
  let delay = 2000;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts || !isTransient(error)) throw error;
      console.warn(`Gemini request failed (${error?.status || error?.cause?.code || error?.message}). Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

export function inspectPdf(buffer) {
  if (buffer.length > MAX_RESUME_BYTES) throw new ResumeReadError('TOO_LARGE');
  const head = buffer.subarray(0, 1024).toString('latin1');
  if (!head.includes('%PDF-')) throw new ResumeReadError('NOT_PDF');
  return { encrypted: buffer.toString('latin1').includes('/Encrypt') };
}

const PROMPT = `
You are an expert HR parsing AI. Read the attached resume document and extract the data into a strict JSON object.
Only return valid JSON, no markdown formatting or extra text.

If the document is clearly not a resume or CV, return exactly {"error": "not_a_resume"}.
If you cannot read any text in it (for example it is a blank page or an unreadable image), return exactly {"error": "unreadable"}.

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

export function interpretReply(text, { encrypted = false } = {}) {
  const raw = String(text || '').replace(/```(?:json)?/gi, '').trim();
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { parsed = null; } }
  }
  const unreadable = encrypted ? 'PASSWORD_PROTECTED' : 'NO_TEXT';
  if (!parsed || typeof parsed !== 'object') throw new ResumeReadError(unreadable);
  if (parsed.error === 'not_a_resume') throw new ResumeReadError('NOT_A_RESUME');
  if (parsed.error) throw new ResumeReadError(unreadable);

  const data = {
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((skill) => typeof skill === 'string' && skill.trim()) : [],
  };
  if (!data.experience.length && !data.education.length && !data.skills.length) throw new ResumeReadError(unreadable);
  return data;
}

export function createParseResumeHandler({ supabase, ai }) {
  const fail = async (res, userId, code, cause) => {
    const info = RESUME_ERRORS[code] || RESUME_ERRORS.UNKNOWN;
    console.error(`Resume read failed [${code}]:`, cause?.message || cause || '');
    await supabase.from('candidate_profiles').update({ resume_status: `Not read: ${code}` }).eq('id', userId)
      .then(() => {}, () => {});
    return res.status(info.status).json({
      success: false, code, message: info.message, nextStep: info.nextStep, retryable: info.retryable,
      error: info.message,
    });
  };

  return async function parseResumeHandler(req, res) {
    const { userId, fileName } = req.body || {};
    if (userId !== req.user.id || !String(fileName || '').startsWith(req.user.id)) {
      return res.status(403).json({ success: false, error: 'You can only parse your own resume.', message: 'You can only read your own resume.' });
    }
    console.log(`Processing file: ${fileName} for user: ${userId}`);

    let buffer;
    try {
      const { data: fileData, error: downloadError } = await supabase.storage.from('resumes').download(fileName);
      if (downloadError || !fileData) throw new ResumeReadError('FILE_MISSING', downloadError);
      buffer = Buffer.from(await fileData.arrayBuffer());
    } catch (error) {
      return fail(res, userId, error.code || 'FILE_MISSING', error);
    }

    let structuredData;
    let vectorArray;
    try {
      const { encrypted } = inspectPdf(buffer);
      const response = await withRetries(() => ai.models.generateContent({
        model: PARSE_MODEL,
        contents: [{ inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } }, PROMPT],
      }));
      structuredData = interpretReply(response?.text, { encrypted });

      const textToEmbed = `Skills: ${structuredData.skills.join(', ')}. Experience: ${JSON.stringify(structuredData.experience)}`;
      const embeddingResult = await withRetries(() => ai.models.embedContent({ model: EMBEDDING_MODEL, contents: textToEmbed }));
      vectorArray = embeddingResult?.embeddings?.[0]?.values;
      if (!Array.isArray(vectorArray)) throw new Error('Embedding service returned no vector.');
    } catch (error) {
      return fail(res, userId, classifyAiError(error), error);
    }

    try {
      const { data: existing } = await supabase.from('candidate_profiles').select('resume_data').eq('id', userId).maybeSingle();
      const links = existing?.resume_data?.links;
      const resumeData = links ? { ...structuredData, links } : structuredData;

      const { error: updateError } = await supabase.from('candidate_profiles').update({
        resume_data: resumeData,
        skills: structuredData.skills,
        experience: structuredData.experience,
        resume_embedding: vectorArray,
        resume_status: 'Parsed successfully',
        last_synced: new Date().toISOString(),
      }).eq('id', userId);
      if (updateError) throw updateError;
      console.log('Resume parsed and vectorized.');
      return res.json({ success: true, data: resumeData, message: 'Resume parsed and vectorized successfully.' });
    } catch (error) {
      return fail(res, userId, 'SAVE_FAILED', error);
    }
  };
}
