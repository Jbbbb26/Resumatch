import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyAiError, createParseResumeHandler } from '../resumeParser.js';

const billingError = Object.assign(new Error(JSON.stringify({ error: {
  code: 403,
  message: 'The Gemini API free tier is not available for this project. Please set up billing to upgrade to the paid tier.',
  status: 'PERMISSION_DENIED',
} })), { status: 403 });

test('Gemini billing denial is not described as temporary overload', () => {
  assert.equal(classifyAiError(billingError), 'BILLING_REQUIRED');
  assert.equal(classifyAiError(Object.assign(new Error('Permission denied'), { status: 403 })), 'READER_ACCESS_DENIED');
  assert.equal(classifyAiError(Object.assign(new Error('Resource exhausted'), { status: 429 })), 'READER_RATE_LIMIT');
  assert.equal(classifyAiError(Object.assign(new Error('Service unavailable'), { status: 503 })), 'READER_BUSY');
});

test('billing denial returns a clear action without automatic Gemini retries', async () => {
  let calls = 0;
  const supabase = {
    storage: { from: () => ({ download: async () => ({ data: new Blob(['%PDF-1.4\n']), error: null }) }) },
    from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
  };
  const ai = { models: { generateContent: async () => { calls += 1; throw billingError; } } };
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await createParseResumeHandler({ supabase, ai })({
    user: { id: 'candidate-1' },
    body: { userId: 'candidate-1', fileName: 'candidate-1-resume.pdf' },
  }, response);
  assert.equal(calls, 1);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'BILLING_REQUIRED');
  assert.equal(response.body.retryable, true);
});
