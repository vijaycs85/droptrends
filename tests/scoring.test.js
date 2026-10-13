import { describe, it } from 'node:test';
import assert from 'node:assert';
import '../extension/src/scoring/dropscore.js';

const { evaluateDropScore } = globalThis;

describe('DropScore Engine Unit Tests', () => {
  it('evaluates a stellar module (like Token) with high A+ grade', () => {
    const mockToken = {
      machineName: 'token',
      title: 'Token',
      isSecurityCovered: true,
      activeInstalls: 520202,
      lastReleaseDaysAgo: 10,
      supportsDrupal11: true,
      supportsDrupal10: true,
      modernPhpSupported: true,
      isRecipeReady: true,
      maintenanceStatus: 'Actively maintained',
      developmentStatus: 'Under active development',
      maintainersCount: 7,
      sponsorsCount: 2,
      openIssuesCount: 461,
      rtbcCount: 11,
      totalIssuesCount: 1896,
      openBugsCount: 185,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true
    };

    const result = evaluateDropScore(mockToken);

    assert.ok(result.score >= 90, `Expected score >= 90, got ${result.score}`);
    assert.strictEqual(result.grade, 'A+');
    assert.strictEqual(result.gradeLabel, 'Exceptional');
    assert.strictEqual(result.pillars.security.score, 25);
    assert.strictEqual(result.pillars.modernity.score, 20);
    assert.strictEqual(result.pillars.quality.score, 15);
    assert.strictEqual(result.pillars.adoption.score, 15);
    assert.ok(result.pillars.maintenance.score >= 20);

    const hasSecurityFlag = result.flags.some(f => f.text.includes('Security Advisory Covered'));
    const hasD11Flag = result.flags.some(f => f.text.includes('Drupal 11 Ready'));
    assert.ok(hasSecurityFlag);
    assert.ok(hasD11Flag);
  });

  it('penalizes unsupported and obsolete modules', () => {
    const mockAbandoned = {
      machineName: 'abandoned_mod',
      title: 'Abandoned Module',
      isSecurityCovered: false,
      activeInstalls: 15,
      lastReleaseDaysAgo: 1200,
      supportsDrupal11: false,
      supportsDrupal10: false,
      maintenanceStatus: 'Unsupported',
      developmentStatus: 'Obsolete',
      maintainersCount: 1,
      sponsorsCount: 0,
      gitlabPipelineStatus: 'failed',
      hasAutomatedTests: false
    };

    const result = evaluateDropScore(mockAbandoned);

    assert.ok(result.score <= 35, `Expected score <= 35 for unsupported project, got ${result.score}`);
    assert.strictEqual(result.grade, 'F');
    assert.strictEqual(result.gradeLabel, 'Critical');

    const hasWarning = result.flags.some(f => f.type === 'critical' || f.type === 'warning');
    assert.ok(hasWarning);
  });

  it('handles empty or missing input gracefully with sensible defaults', () => {
    const result = evaluateDropScore({});

    assert.ok(typeof result.score === 'number');
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(result.grade);
    assert.ok(result.pillars);
    assert.ok(Array.isArray(result.flags));
  });

  it('gives appropriate score to a moderately healthy module', () => {
    const mockModerate = {
      machineName: 'custom_helper',
      title: 'Custom Helper',
      isSecurityCovered: true,
      activeInstalls: 3500,
      lastReleaseDaysAgo: 120,
      supportsDrupal11: false,
      supportsDrupal10: true,
      maintenanceStatus: 'Minimally maintained',
      maintainersCount: 2,
      sponsorsCount: 0,
      gitlabPipelineStatus: 'unknown',
      hasAutomatedTests: true
    };

    const result = evaluateDropScore(mockModerate);
    assert.ok(result.score >= 50 && result.score <= 75, `Expected 50-75, got ${result.score}`);
    assert.ok(['B', 'C'].includes(result.grade));
  });
});
