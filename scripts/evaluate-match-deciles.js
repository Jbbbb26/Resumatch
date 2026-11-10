/**
 * Read-only live embedding evaluation for 0-100% requirement coverage.
 * Uses synthetic skills, the production embedding model and scoring function.
 * Run with: node scripts/evaluate-match-deciles.js
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { configuredGeminiKeys, createGeminiFailover } from '../geminiFailover.js';
import { EMBEDDING_MODEL, cosine, jobItems, resumeItems, scoreAnalysis } from '../src/data/services/matchAnalysis.js';
import { interpretReply, RESUME_PARSE_MODEL, RESUME_PARSE_PROMPT } from '../resumeParser.js';
import { explainMatchScore } from '../src/data/matchExplanation.js';

dotenv.config({ quiet: true });

const skills = ['JavaScript', 'React', 'Node.js', 'AWS', 'SQL', 'Python', 'Docker', 'Kubernetes', 'TypeScript', 'Git'];
const job = { title: 'Software Engineer', work_type: 'Remote', employment_type: 'Full-time', description: '', requirements: skills.join('\n') };
const usePdfs = process.argv.includes('--pdf');
const ai = createGeminiFailover({
  keys: configuredGeminiKeys(),
  makeClient: (apiKey) => new GoogleGenAI({ apiKey }),
});
const vectors = new Map();

async function embed(text) {
  if (!vectors.has(text)) {
    const result = await ai.models.embedContent({ model: EMBEDDING_MODEL, contents: text });
    const vector = result?.embeddings?.[0]?.values;
    assert.ok(Array.isArray(vector) && vector.length > 0, `No embedding returned for ${text}`);
    vectors.set(text, vector);
  }
  return vectors.get(text);
}

const jobText = `Job Title: ${job.title}. Work Type: ${job.work_type}, ${job.employment_type}. Description: ${job.description}. Requirements: ${job.requirements}`;
console.log(usePdfs ? 'Parsing 11 synthetic PDFs and embedding their extracted resumes...' : 'Embedding synthetic job and resume text with the production model...');
const jobVector = await embed(jobText);
for (const skill of [...skills, 'Nursing']) await embed(skill);
const requirements = jobItems(job).map((item) => ({ ...item, vector: vectors.get(item.text) }));
const results = [];
const problems = [];
const canonical = (value) => String(value).toLowerCase().replace(/[^a-z0-9+#]/g, '');

for (let count = 0; count <= skills.length; count += 1) {
  let profile = { skills: ['Nursing', ...skills.slice(0, count)], experience: [] };
  if (usePdfs) {
    console.log(`Parsing ${count * 10}% PDF...`);
    const pdfPath = fileURLToPath(new URL(`../output/pdf/decile-tests/match-${String(count * 10).padStart(3, '0')}.pdf`, import.meta.url));
    const pdf = await readFile(pdfPath);
    let response;
    try {
      response = await ai.models.generateContent({
        model: RESUME_PARSE_MODEL,
        contents: [{ inlineData: { data: pdf.toString('base64'), mimeType: 'application/pdf' } }, RESUME_PARSE_PROMPT],
      });
    } catch (error) {
      throw new Error(`Could not parse the ${count * 10}% PDF (Gemini HTTP ${error?.status || 'network'}): ${error?.message || error}`);
    }
    profile = interpretReply(response?.text);
  }
  const parsedSkills = new Set(profile.skills.map(canonical));
  const parsedTargets = skills.filter((skill) => parsedSkills.has(canonical(skill)));
  const parsedTargetCount = parsedTargets.length;
  if (JSON.stringify(parsedTargets) !== JSON.stringify(skills.slice(0, count))) {
    problems.push(`${count * 10}% ${usePdfs ? 'PDF' : 'profile'}: parsed target skills ${JSON.stringify(parsedTargets)} instead of ${JSON.stringify(skills.slice(0, count))}`);
  }
  const items = resumeItems(profile);
  for (const item of items) await embed(item.text);
  const evidence = items.map((item) => ({ ...item, vector: vectors.get(item.text) }));
  const resumeText = `Skills: ${profile.skills.join(', ')}. Experience: ${JSON.stringify(profile.experience)}`;
  const overallSimilarity = cosine(await embed(resumeText), jobVector);
  const analysis = scoreAnalysis({ requirements, evidence, overallSimilarity });
  const explanation = explainMatchScore(analysis);
  const coveragePercent = count * 10;
  const scoreCeiling = Math.round(0.85 * coveragePercent + 15 + 1e-9);

  if (analysis.coverage !== count / skills.length) problems.push(`${coveragePercent}% case: coverage was ${analysis.coverage}`);
  if (analysis.requirements.filter((row) => row.status === 'met').length !== count) problems.push(`${coveragePercent}% case: wrong covered count`);
  if (analysis.requirements.filter((row) => row.status === 'missing').length !== skills.length - count) problems.push(`${coveragePercent}% case: wrong missing count`);
  if (analysis.score < coveragePercent || analysis.score > scoreCeiling) problems.push(`${coveragePercent}% case: score ${analysis.score}% is outside ${coveragePercent}-${scoreCeiling}%`);
  if (count !== skills.length && analysis.score === 100) problems.push(`${coveragePercent}% case: unsupported 100% score`);
  if (Math.abs(explanation.total - analysis.score) >= 0.51) problems.push(`${coveragePercent}% case: explanation disagrees with score`);
  results.push({ coverage: `${coveragePercent}%`, parsedSkills: parsedTargetCount, score: `${analysis.score}%`, overallSimilarity: overallSimilarity?.toFixed(3) ?? 'none', overallCredit: `${Math.round(explanation.rawOverallCredit * 100)}%` });
}

console.table(results);
for (let index = 1; index < results.length; index += 1) {
  if (Number.parseInt(results[index].score, 10) < Number.parseInt(results[index - 1].score, 10)) {
    problems.push(`Score fell between ${results[index - 1].coverage} and ${results[index].coverage}`);
  }
}
assert.deepEqual(problems, [], problems.join('\n'));
console.log(`PASS: all 11 ${usePdfs ? 'PDF' : 'profile'} levels have consistent statuses, bounds, and increasing scores.`);
