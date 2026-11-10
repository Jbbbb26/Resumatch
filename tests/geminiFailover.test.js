import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredGeminiKeys, createGeminiFailover } from '../geminiFailover.js';

const errorWithStatus = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const silent = { warn() {} };

test('configured keys include backups without repeating identical credentials', () => {
  const keys = configuredGeminiKeys({ GEMINI_API_KEY: 'primary', RESUMATCH_1: 'backup', RESUMATCH_2: 'primary' });
  assert.deepEqual(keys.map(({ label }) => label), ['GEMINI_API_KEY', 'RESUMATCH_1']);
});

test('a limited key fails over and the working key handles later model calls', async () => {
  const used = [];
  const ai = createGeminiFailover({
    keys: [{ label: 'primary', key: 'one' }, { label: 'backup', key: 'two' }],
    makeClient: (key) => ({ models: {
      generateContent: async () => { used.push(`${key}:generate`); if (key === 'one') throw errorWithStatus(429); return { text: 'ok' }; },
      embedContent: async () => { used.push(`${key}:embed`); return { embeddings: [{ values: [1] }] }; },
    } }),
    logger: silent,
  });
  assert.equal((await ai.models.generateContent({})).text, 'ok');
  await ai.models.embedContent({});
  assert.deepEqual(used, ['one:generate', 'two:generate', 'two:embed']);
});

test('permission denial tries a backup but invalid input does not', async () => {
  const used = [];
  const ai = createGeminiFailover({
    keys: [{ label: 'primary', key: 'one' }, { label: 'backup', key: 'two' }],
    makeClient: (key) => ({ models: { generateContent: async () => {
      used.push(key);
      if (key === 'one') throw errorWithStatus(403);
      return { text: 'ok' };
    } } }),
    logger: silent,
  });
  assert.equal((await ai.models.generateContent({})).text, 'ok');
  assert.deepEqual(used, ['one', 'two']);

  let calls = 0;
  const badInput = createGeminiFailover({
    keys: [{ label: 'primary', key: 'one' }, { label: 'backup', key: 'two' }],
    makeClient: () => ({ models: { embedContent: async () => { calls += 1; throw errorWithStatus(400); } } }),
    logger: silent,
  });
  await assert.rejects(badInput.models.embedContent({}), { status: 400 });
  assert.equal(calls, 1);
});

test('exhausted keys cool down instead of repeating failed requests immediately', async () => {
  let clock = 0;
  let calls = 0;
  const ai = createGeminiFailover({
    keys: [{ label: 'primary', key: 'one' }, { label: 'backup', key: 'two' }],
    makeClient: () => ({ models: { embedContent: async () => { calls += 1; throw errorWithStatus(429); } } }),
    now: () => clock,
    logger: silent,
  });
  await assert.rejects(ai.models.embedContent({}), { status: 429 });
  assert.equal(calls, 2);
  await assert.rejects(ai.models.embedContent({}), { status: 429 });
  assert.equal(calls, 2);
  clock = 60_001;
  await assert.rejects(ai.models.embedContent({}), { status: 429 });
  assert.equal(calls, 4);
});
