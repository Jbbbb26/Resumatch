import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMatchScore } from '../src/data/services/matchScoring.js';

const softwareArchitectJob = {
  title: 'Software Architect',
  requirements: 'Required: JavaScript, React, Node.js, AWS, SQL, and system design.',
  description: 'Lead software architecture, design scalable systems and APIs, and guide engineering teams.',
};

const cases = [
  {
    name: 'Relevant CS graduate with matching skills',
    applicant: {
      skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'SQL', 'system design'],
      education: [{ degreeLevel: "Bachelor's", fieldOfStudy: 'Computer Science' }],
      experience: [{
        title: 'Software Engineer',
        responsibilities: ['Designed software architecture and scalable systems for engineering teams.'],
      }],
      summary: 'Software engineer focused on architecture and system design.',
    },
    semanticSimilarity: 0.82,
    minimum: 70,
    maximum: 100,
  },
  {
    name: 'Partially relevant IT graduate with some overlapping skills',
    applicant: {
      skills: ['Python', 'AWS', 'SQL'],
      education: [{ degreeLevel: "Bachelor's", fieldOfStudy: 'Information Technology' }],
      experience: [{
        title: 'IT Support Analyst',
        responsibilities: ['Managed AWS cloud infrastructure and SQL databases for software teams.'],
      }],
      summary: 'IT analyst supporting cloud infrastructure and software teams.',
    },
    semanticSimilarity: 0.7,
    minimum: 35,
    maximum: 65,
  },
  {
    name: 'Unrelated nursing graduate without technical skills',
    applicant: {
      skills: ['patient care', 'triage'],
      education: [{ degreeLevel: "Bachelor's", fieldOfStudy: 'Nursing' }],
      experience: [{ title: 'Registered Nurse', responsibilities: ['Provided patient care and triage.'] }],
      summary: 'Registered nurse with clinical experience.',
    },
    semanticSimilarity: 0.78,
    minimum: 0,
    maximum: 24,
  },
  {
    name: 'Empty resume',
    applicant: { skills: [], education: [], experience: [], summary: '' },
    semanticSimilarity: 0.88,
    minimum: 0,
    maximum: 10,
  },
];

for (const example of cases) {
  test(example.name, () => {
    const result = calculateMatchScore({
      applicant: example.applicant,
      job: softwareArchitectJob,
      semanticSimilarity: example.semanticSimilarity,
    });
    console.log(`${example.name}: ${JSON.stringify({ score: result.score, ...result.breakdown })}`);
    assert.ok(result.score >= example.minimum, `expected at least ${example.minimum}, got ${result.score}`);
    assert.ok(result.score <= example.maximum, `expected at most ${example.maximum}, got ${result.score}`);
    assert.ok(Number.isInteger(result.score));
    assert.ok(Array.isArray(result.breakdown.capsApplied));
  });
}
