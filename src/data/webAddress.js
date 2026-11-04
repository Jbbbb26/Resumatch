// Shared rule for web addresses typed by users (company website, candidate profile links).
// Returns '' for an empty value, the normalised https URL for a valid one, and null when invalid.
// A valid address uses http(s), has no spaces, and has a domain with a dot and a 2+ letter ending (example.com).
export const WEB_ADDRESS_MESSAGE = 'Enter a full web address with a domain, like example.com or https://example.com.';

export const normalizeWebAddress = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (/\s/.test(trimmed)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const labels = url.hostname.split('.');
    if (labels.length < 2 || labels.some((label) => !label)) return null;
    if (!/^[a-z]{2,63}$/i.test(labels[labels.length - 1]) && !/^xn--[a-z0-9-]+$/i.test(labels[labels.length - 1])) return null;
    return url.href;
  } catch {
    return null;
  }
};
