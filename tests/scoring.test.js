import { describe, it } from 'node:test';
import assert from 'node:assert';
import '../extension/src/scoring/dropscore.js';

const { evaluateDropScore } = globalThis;

describe('DropScore Engine Unit Tests', () => {
  it('evaluates a stellar module (Token) with high A+ grade', () => {
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
  });

  it('calibrates emerging projects (like Nightingale site template) fairly', () => {
    const mockNightingale = {
      machineName: 'nightingale',
      title: 'Nightingale',
      projectType: 'Site Template / Recipe',
      createdDaysAgo: 12,
      isEmergingProject: true,
      isSecurityCovered: true,
      activeInstalls: 5,
      lastReleaseDaysAgo: 3,
      latestVersion: '1.0.1',
      supportsDrupal11: true,
      supportsDrupal10: true,
      modernPhpSupported: true,
      isRecipeReady: true,
      maintainersCount: 1,
      sponsorsCount: 2,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true,
      releases: [
        {
          version: '1.0.1',
          isRecommended: true,
          isSecurityCovered: true,
          supportsD11: true,
          daysAgo: 3
        },
        {
          version: '1.x-dev',
          isRecommended: false,
          isSecurityCovered: false,
          supportsD11: true,
          daysAgo: 5
        }
      ]
    };

    const result = evaluateDropScore(mockNightingale);

    // Emerging project should get healthy score rather than an unfair low F/D
    assert.ok(result.score >= 70, `Expected emerging project score >= 70, got ${result.score}`);
    assert.ok(['A+', 'A', 'B'].includes(result.grade));
    assert.strictEqual(result.isEmergingProject, true);

    const hasEmergingFlag = result.flags.some(f => f.text.includes('Emerging Project'));
    assert.ok(hasEmergingFlag);

    // Test specific release evaluation
    const devResult = evaluateDropScore(mockNightingale, '1.x-dev');
    assert.strictEqual(devResult.activeVersion, '1.x-dev');
    assert.strictEqual(devResult.pillars.security.breakdown.coverage, 0); // 1.x-dev is not security covered
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
    assert.ok(result.score <= 35, `Expected score <= 35, got ${result.score}`);
    assert.strictEqual(result.grade, 'F');
  });
});
