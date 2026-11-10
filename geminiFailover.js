const KEY_NAMES = ['GEMINI_API_KEY', 'RESUMATCH_1', 'RESUMATCH_2', 'RESUMATCH_3', 'RESUMATCH_4', 'RESUMATCH_5'];
const NETWORK_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT']);

export function configuredGeminiKeys(env = process.env) {
  const seen = new Set();
  return KEY_NAMES.flatMap((label) => {
    const key = String(env[label] || '').trim();
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{ label, key }];
  });
}

const statusOf = (error) => Number(error?.status ?? error?.error?.code);
const networkError = (error) => NETWORK_CODES.has(error?.cause?.code) || error?.message === 'fetch failed';

function cooldownFor(error) {
  const status = statusOf(error);
  if (status === 429) return 60_000;
  if (status === 401 || status === 403) return 30_000;
  if ([500, 502, 503, 504].includes(status) || networkError(error)) return 15_000;
  return 0;
}

/**
 * Server-side Gemini client for the two model methods used by ResuMatch.
 * A failed key is skipped briefly; request errors (for example invalid input)
 * are returned without repeating the same request on every key.
 */
export function createGeminiFailover({ keys, makeClient, now = Date.now, logger = console }) {
  if (!Array.isArray(keys) || keys.length === 0) throw new Error('Configure GEMINI_API_KEY or at least one RESUMATCH_1..5 key.');
  const entries = keys.map(({ label, key }) => ({ label, client: makeClient(key), blockedUntil: 0 }));
  let preferred = 0;
  let lastError = null;

  const call = async (method, args) => {
    for (let offset = 0; offset < entries.length; offset += 1) {
      const index = (preferred + offset) % entries.length;
      const entry = entries[index];
      if (entry.blockedUntil > now()) continue;
      try {
        const result = await entry.client.models[method](args);
        preferred = index;
        lastError = null;
        return result;
      } catch (error) {
        const cooldown = cooldownFor(error);
        if (!cooldown) throw error;
        entry.blockedUntil = now() + cooldown;
        lastError = error;
        logger.warn(`Gemini ${method} failed using ${entry.label} (HTTP ${statusOf(error) || 'network'}); checking another configured key.`);
      }
    }
    throw lastError || new Error('No Gemini API key is available right now.');
  };

  return { models: {
    generateContent: (args) => call('generateContent', args),
    embedContent: (args) => call('embedContent', args),
  } };
}
