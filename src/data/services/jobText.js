/** Extract the readable words of either legacy plain text or HTML job copy. */
export function jobTextOnly(value) {
  const input = String(value ?? '');
  if (!/<\/?[a-z][^>]*>/i.test(input)) return input;
  if (typeof DOMParser === 'undefined') return input.replace(/<[^>]*>/g, ' ');
  const doc = new DOMParser().parseFromString(input, 'text/html');
  // Preserve breaks when reading formatted copy into search/matching fields.
  doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  doc.querySelectorAll('p, div, h1, h2, h3, li').forEach((el) => el.append(' '));
  return doc.body.textContent || '';
}
