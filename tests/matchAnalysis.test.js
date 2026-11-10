import assert from 'node:assert/strict';
import test from 'node:test';
import { jobItems, resumeItems, scoreAnalysis } from '../src/data/services/matchAnalysis.js';
import { explainMatchScore } from '../src/data/matchExplanation.js';

const decileSkills = ['JavaScript', 'React', 'Node.js', 'AWS', 'SQL', 'Python', 'Docker', 'Kubernetes', 'TypeScript', 'Git'];
const decileVector = (index) => Array.from({ length: decileSkills.length + 1 }, (_, dimension) => Number(dimension === index));
const decileRequirements = jobItems({ requirements: decileSkills.join('\n'), description: '' })
  .map((item, index) => ({ ...item, vector: decileVector(index) }));
const midpointOverallScores = [8, 16, 25, 33, 42, 50, 60, 70, 80, 90, 100];
const highOverallScores = [15, 24, 32, 41, 49, 58, 66, 75, 83, 92, 100];

for (let count = 0; count <= decileSkills.length; count += 1) {
  const expectedCoverage = count * 10;
  test(`${expectedCoverage}% requirement coverage has the expected score and breakdown`, () => {
    const profile = { skills: ['Nursing', ...decileSkills.slice(0, count)] };
    const evidence = resumeItems(profile).map((item) => ({
      ...item,
      vector: decileVector(decileSkills.indexOf(item.text) < 0 ? decileSkills.length : decileSkills.indexOf(item.text)),
    }));
    const lowOverall = scoreAnalysis({ requirements: decileRequirements, evidence, overallSimilarity: 0.7 });
    const midpointOverall = scoreAnalysis({ requirements: decileRequirements, evidence, overallSimilarity: 0.832 });
    const highOverall = scoreAnalysis({ requirements: decileRequirements, evidence, overallSimilarity: 0.9 });
    const noOverall = scoreAnalysis({ requirements: decileRequirements, evidence, overallSimilarity: NaN });
    const explanation = explainMatchScore(lowOverall);

    assert.equal(lowOverall.coverage, count / decileSkills.length);
    assert.equal(lowOverall.score, expectedCoverage);
    assert.equal(midpointOverall.score, midpointOverallScores[count]);
    assert.equal(highOverall.score, highOverallScores[count]);
    assert.equal(noOverall.score, expectedCoverage);
    assert.equal(lowOverall.requirements.filter((row) => row.status === 'met').length, count);
    assert.equal(lowOverall.requirements.filter((row) => row.status === 'missing').length, decileSkills.length - count);
    assert.ok(Math.abs(explanation.coveragePoints - expectedCoverage * 0.85) < 1e-9);
    assert.ok(Math.abs(explanation.overallPoints - expectedCoverage * 0.15) < 1e-9);
    assert.equal(explanation.score, expectedCoverage);
  });
}

test('short skill requirements are compared instead of dropped', () => {
  const items = jobItems({ requirements: 'Required skills\nPython\nSQL\nC++', description: '' });
  assert.deepEqual(items.map((item) => item.text), ['Python', 'SQL', 'C++']);
  assert.ok(items.every((item) => item.source === 'requirement'));
});

test('HTML skill bullets remain separate requirements', () => {
  const items = jobItems({ requirements: '<ul><li>React</li><li>Node.js</li></ul>', description: '' });
  assert.deepEqual(items.map((item) => item.text), ['React', 'Node.js']);
});

test('description paragraphs and separate lines produce the same responsibilities and score', () => {
  const requirements = ['JavaScript', 'React', 'Node.js', 'AWS', 'SQL', 'System design', 'Software architecture'];
  const responsibilities = [
    'Lead software architecture for scalable web applications and APIs.',
    'Design reliable systems, guide engineering teams, and review technical decisions.',
    'Build and maintain cloud services on AWS.',
  ];
  const job = (description) => ({ requirements: requirements.join('\n'), description });
  const multiline = jobItems(job(responsibilities.join('\n')));
  const paragraph = jobItems(job(responsibilities.join(' ')));
  const html = jobItems(job(`<p>${responsibilities.join(' ')}</p>`));
  assert.deepEqual(paragraph, multiline);
  assert.deepEqual(html, multiline);
  assert.equal(paragraph.filter((item) => item.source === 'description').length, 3);

  const vector = (index) => Array.from({ length: multiline.length }, (_, dimension) => Number(dimension === index));
  const evidence = multiline.flatMap((item, index) => item.text === 'SQL' ? [] : [{
    text: item.text, type: item.source === 'requirement' ? 'skill' : 'experience', vector: vector(index),
  }]);
  const score = (items) => scoreAnalysis({
    requirements: items.map((item, index) => ({ ...item, vector: vector(index) })),
    evidence,
    overallSimilarity: 0.7,
  });
  assert.equal(score(multiline).score, 88);
  assert.deepEqual(score(paragraph), score(multiline));
});

test('a job with no usable requirements cannot get full coverage from overall similarity alone', () => {
  const result = scoreAnalysis({
    requirements: [],
    evidence: [{ text: 'Some resume content', type: 'summary', vector: [1, 0] }],
    overallSimilarity: 0.9,
  });
  assert.equal(result.coverage, 0);
  assert.equal(result.score, 15);
});

test('complete evidence ranks above partial and unrelated evidence', () => {
  const requirements = [
    { text: 'Python', source: 'requirement', weight: 1, vector: [1, 0, 0] },
    { text: 'SQL', source: 'requirement', weight: 1, vector: [0, 1, 0] },
  ];
  const evidence = (entries) => entries.map(([text, vector]) => ({ text, type: 'skill', vector }));
  const complete = scoreAnalysis({ requirements, evidence: evidence([['Python', [1, 0, 0]], ['SQL', [0, 1, 0]]]), overallSimilarity: 0.9 });
  const partial = scoreAnalysis({ requirements, evidence: evidence([['Python', [1, 0, 0]]]), overallSimilarity: 0.8 });
  const unrelated = scoreAnalysis({ requirements, evidence: evidence([['Nursing', [0, 0, 1]]]), overallSimilarity: 0.7 });
  assert.ok(complete.score > partial.score && partial.score > unrelated.score);
  assert.equal(complete.score, 100);
  assert.equal(unrelated.score, 0);
});

test('SQL cannot partly cover JavaScript just because their embeddings are close', () => {
  const sqlVector = [0.76, Math.sqrt(1 - 0.76 ** 2)];
  const analysis = scoreAnalysis({
    requirements: [
      { text: 'JavaScript', source: 'requirement', weight: 1, vector: [1, 0] },
      { text: 'SQL', source: 'requirement', weight: 1, vector: sqlVector },
    ],
    evidence: [{ text: 'SQL', type: 'skill', vector: sqlVector }],
    overallSimilarity: 0.66,
  });
  assert.equal(analysis.requirements[0].status, 'missing');
  assert.equal(analysis.requirements[0].credit, 0);
  assert.equal(analysis.requirements[0].noDirectEvidence, true);
  assert.equal(analysis.requirements[1].status, 'met');
});

test('a missing SQL skill keeps the near-90% resume below 100 despite similar experience', () => {
  const names = ['JavaScript', 'React', 'Node.js', 'AWS', 'SQL', 'System design', 'Software architecture'];
  const vector = (index) => Array.from({ length: 10 }, (_, dimension) => Number(dimension === index));
  const requirements = [
    ...names.map((text, index) => ({ text, source: 'requirement', weight: 1, vector: vector(index) })),
    ...['Lead software architecture', 'Design reliable systems', 'Build AWS cloud services']
      .map((text, index) => ({ text, source: 'description', weight: 0.5, vector: vector(index + 7) })),
  ];
  const evidence = [
    ...names.filter((text) => text !== 'SQL').map((text) => ({
      text, type: 'skill', vector: vector(names.indexOf(text)),
    })),
    ...requirements.slice(7).map(({ text, vector: itemVector }) => ({ text, type: 'experience', vector: itemVector })),
    { text: 'Built web applications with JavaScript', type: 'experience',
      vector: vector(4).map((value, index) => index === 4 ? 0.95 : index === 0 ? Math.sqrt(1 - 0.95 ** 2) : value) },
  ];
  const analysis = scoreAnalysis({ requirements, evidence, overallSimilarity: 0.9 });

  assert.equal(analysis.requirements[4].status, 'missing');
  assert.equal(analysis.requirements[4].noDirectEvidence, true);
  assert.equal(analysis.coverage, 0.882);
  assert.equal(analysis.score, 90);
});

test('a strong semantic experience match can still cover a short requirement', () => {
  const analysis = scoreAnalysis({
    requirements: [{ text: 'Team leadership', source: 'requirement', weight: 1, vector: [1, 0] }],
    evidence: [{ text: 'Guided engineering teams', type: 'experience', vector: [0.82, Math.sqrt(1 - 0.82 ** 2)] }],
    overallSimilarity: 0.7,
  });
  assert.equal(analysis.requirements[0].status, 'met');
  assert.equal(analysis.requirements[0].noDirectEvidence, false);
});

test('full requirement coverage reaches 100 even when whole-document similarity is lower', () => {
  const requirements = [
    { text: 'JavaScript', source: 'requirement', weight: 1, vector: [1, 0] },
    { text: 'Build cloud services', source: 'description', weight: 0.5, vector: [0, 1] },
  ];
  const evidence = [
    { text: 'JavaScript', type: 'skill', vector: [1, 0] },
    { text: 'Build cloud services', type: 'experience', vector: [0, 1] },
  ];
  const analysis = scoreAnalysis({ requirements, evidence, overallSimilarity: 0.81 });
  const explanation = explainMatchScore(analysis);
  assert.equal(analysis.coverage, 1);
  assert.equal(analysis.score, 100);
  assert.equal(explanation.coveragePoints, 85);
  assert.equal(explanation.overallPoints, 15);
  assert.ok(explanation.rawOverallCredit < 0.4);
});
