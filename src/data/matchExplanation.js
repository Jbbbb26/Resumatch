export const MATCH_SCORE_DEFAULTS = Object.freeze({
  coverageWeight: 0.85,
  overallWeight: 0.15,
  overallFloor: 0.764,
  overallCeiling: 0.9,
  partialAt: 0.73,
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const toNumber = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

export function overallCreditFor(similarity, floor = MATCH_SCORE_DEFAULTS.overallFloor, ceiling = MATCH_SCORE_DEFAULTS.overallCeiling) {
  const value = toNumber(similarity);
  if (value === null || !Number.isFinite(value)) return 0;
  return clamp01((value - floor) / (ceiling - floor));
}

export function explainMatchScore(analysis) {
  if (!analysis) return null;
  const coverageWeight = Number(analysis.coverageWeight ?? MATCH_SCORE_DEFAULTS.coverageWeight);
  const overallWeight = Number(analysis.overallWeight ?? MATCH_SCORE_DEFAULTS.overallWeight);
  const floor = Number(analysis.overallFloor ?? MATCH_SCORE_DEFAULTS.overallFloor);
  const ceiling = Number(analysis.overallCeiling ?? MATCH_SCORE_DEFAULTS.overallCeiling);
  const coverage = clamp01(Number(analysis.coverage) || 0);
  const similarity = toNumber(analysis.overallSimilarity);
  const overallCredit = analysis.overallCredit != null
    ? clamp01(Number(analysis.overallCredit))
    : overallCreditFor(similarity, floor, ceiling);
  const coveragePoints = 100 * coverageWeight * coverage;
  const overallPoints = 100 * overallWeight * overallCredit;
  return {
    coverage,
    coveragePoints,
    coverageWeight,
    similarity,
    overallCredit,
    overallPoints,
    overallWeight,
    floor,
    ceiling,
    total: coveragePoints + overallPoints,
    score: Number.isFinite(Number(analysis.score)) ? Math.round(Number(analysis.score)) : Math.round(coveragePoints + overallPoints),
  };
}
