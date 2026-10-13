import { describe, it } from 'node:test';
import assert from 'node:assert';
import '../extension/src/scoring/dropscore.js';

const { evaluateDropScore } = globalThis;

describe('DropScore Engine Unit Tests', () => {
  it('evaluates a stellar module (Token) with high Exceptional score', () => {
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
    assert.strictEqual(result.gradeLabel, 'Exceptional');
    assert.strictEqual(result.pillars.security.score, 25);
    assert.strictEqual(result.pillars.modernity.score, 20);
    assert.strictEqual(result.pillars.quality.score, 15);
    assert.strictEqual(result.pillars.adoption.score, 15);
  });

  it('correctly evaluates a module with stable release and newer alpha/beta (FlowDrop)', () => {
    const mockFlowDrop = {
      machineName: 'flowdrop',
      title: 'FlowDrop',
      isSecurityCovered: true, // Has covered stable release
      activeInstalls: 433,
      latestVersion: '2.6.0',
      lastReleaseDaysAgo: 21,
      supportsDrupal11: true,
      supportsDrupal10: false,
      modernPhpSupported: true,
      isRecipeReady: false,
      maintainersCount: 4,
      sponsorsCount: 1,
      hasStableRelease: true,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true,
      releases: [
        {
          version: '2.7.0-alpha2',
          isStable: false,
          isRecommended: false,
          isSecurityCovered: false,
          daysAgo: 3,
          supportsD11: true
        },
        {
          version: '2.6.0',
          isStable: true,
          isRecommended: true,
          isSecurityCovered: true,
          daysAgo: 21,
          supportsD11: true
        }
      ]
    };

    const result = evaluateDropScore(mockFlowDrop);

    // Default evaluation should use stable release 2.6.0 and retain security coverage
    assert.ok(result.score >= 70, `Expected score >= 70, got ${result.score}`);
    assert.ok(['Healthy', 'Exceptional', 'Stable'].includes(result.gradeLabel));
    assert.strictEqual(result.pillars.security.score >= 20, true);
    assert.strictEqual(result.activeVersion, '2.6.0');

    const hasSecurityFlag = result.flags.some(f => f.text.includes('Security Covered'));
    assert.ok(hasSecurityFlag);
  });

  it('calibrates emerging projects (like Nightingale site template) fairly with Emerging label', () => {
    const mockNightingale = {
      machineName: 'nightingale',
      title: 'Nightingale',
      projectType: 'Site Template / Recipe',
      createdDaysAgo: 12,
      isEmergingProject: true,
      isSecurityCovered: true,
      activeInstalls: 0,
      lastReleaseDaysAgo: 3,
      latestVersion: '1.0.1',
      supportsDrupal11: true,
      supportsDrupal10: false,
      modernPhpSupported: true,
      isRecipeReady: true,
      maintainersCount: 1,
      sponsorsCount: 2,
      releases: [
        {
          version: '1.0.1',
          isStable: true,
          isRecommended: true,
          isSecurityCovered: true,
          supportsD11: true,
          daysAgo: 3
        }
      ]
    };

    const result = evaluateDropScore(mockNightingale);

    assert.ok(result.score >= 50 && result.score <= 68, `Expected emerging project score between 50 and 68, got ${result.score}`);
    assert.strictEqual(result.gradeLabel, 'Emerging');
    assert.strictEqual(result.isEmergingProject, true);
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
    assert.strictEqual(result.gradeLabel, 'Needs Attention');
  });

  it('automatically infers PHP 8.3+ support from Drupal 11 compatibility', () => {
    const mockD11Module = {
      machineName: 'd11_mod',
      title: 'Drupal 11 Module',
      isSecurityCovered: true,
      activeInstalls: 5000,
      lastReleaseDaysAgo: 20,
      supportsDrupal11: true,
      supportsDrupal10: true,
      modernPhpSupported: false, // Even if false in raw DOM, D11 enforces PHP 8.3+
      maintainersCount: 2,
      sponsorsCount: 1,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true
    };

    const result = evaluateDropScore(mockD11Module);
    assert.strictEqual(result.pillars.modernity.score, 20);
    assert.strictEqual(result.pillars.modernity.breakdown.modernPhp, 2);
    assert.strictEqual(result.pillars.modernity.breakdown.drupal11, 12);
    // Ensure no PHP 8.3 recommendation is raised when D11 is supported
    const hasPhpRecommendation = result.recommendations.some(r => r.topic === 'PHP 8.3+');
    assert.strictEqual(hasPhpRecommendation, false);
  });

  it('flags Drupal 10-only modules with EOL warning badge and recommendation', () => {
    const mockD10Only = {
      machineName: 'd10_only_mod',
      title: 'Drupal 10 Only Module',
      isSecurityCovered: true,
      activeInstalls: 3500,
      lastReleaseDaysAgo: 40,
      supportsDrupal12: false,
      supportsDrupal11: false,
      supportsDrupal10: true,
      maintainersCount: 2,
      sponsorsCount: 1,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true
    };

    const result = evaluateDropScore(mockD10Only);
    // D10 gives 6 pts (out of 20)
    assert.strictEqual(result.pillars.modernity.score, 6);
    assert.strictEqual(result.pillars.modernity.breakdown.drupal10, 6);
    assert.strictEqual(result.pillars.modernity.breakdown.drupal11, 0);

    // Verify warning flag for D10 reaching EOL in Nov 2026
    const eolFlag = result.flags.find(f => f.text.includes('D10 Only (EOL Nov 2026)'));
    assert.ok(eolFlag, 'Expected D10 Only (EOL Nov 2026) flag to be present');
    assert.strictEqual(eolFlag.type, 'warning');

    // Verify recommendation for Drupal 10 EOL
    const eolRec = result.recommendations.find(r => r.topic === 'Drupal 10 EOL');
    assert.ok(eolRec, 'Expected Drupal 10 EOL recommendation to be present');
    assert.ok(eolRec.action.includes('November 2026'));
  });

  it('recognizes Drupal 12 forward-compatibility and awards top modernity priority', () => {
    const mockD12Module = {
      machineName: 'd12_mod',
      title: 'Drupal 12 Forward-Compatible Module',
      isSecurityCovered: true,
      activeInstalls: 12000,
      lastReleaseDaysAgo: 10,
      supportsDrupal12: true,
      supportsDrupal11: true,
      supportsDrupal10: true,
      maintainersCount: 3,
      sponsorsCount: 2,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true
    };

    const result = evaluateDropScore(mockD12Module);
    assert.strictEqual(result.pillars.modernity.score, 20);
    assert.strictEqual(result.pillars.modernity.breakdown.drupal12, 12);

    // Verify Drupal 12 Ready flag
    const d12Flag = result.flags.find(f => f.text === 'Drupal 12 Ready');
    assert.ok(d12Flag, 'Expected Drupal 12 Ready flag');
    assert.strictEqual(d12Flag.type, 'positive');
  });

  it('supports updating core schedule when Drupal 12 releases to prioritize D12', () => {
    const { DropScoreEngine } = globalThis;
    try {
      // Simulate Drupal 12 release era where D12 is active and D11 is LTS
      DropScoreEngine.setCoreSchedule({
        activeMajor: 12,
        upcomingMajor: 13,
        leavingSupportMajor: 11
      });

      const mockModule = {
        machineName: 'future_test',
        title: 'Future Test',
        isSecurityCovered: true,
        activeInstalls: 1000,
        lastReleaseDaysAgo: 5,
        supportsDrupal12: true,
        supportsDrupal11: true,
        supportsDrupal10: true,
        maintainersCount: 2,
        sponsorsCount: 1,
        gitlabPipelineStatus: 'passed',
        hasAutomatedTests: true
      };

      const result = evaluateDropScore(mockModule);
      assert.strictEqual(result.pillars.modernity.score, 20);
      assert.strictEqual(result.pillars.modernity.breakdown.drupal12, 12);
      assert.strictEqual(result.pillars.modernity.breakdown.drupal11, 6); // D11 is now LTS (6 pts)
      assert.strictEqual(result.pillars.modernity.breakdown.drupal10, 0); // D10 is now EOL (0 pts)
    } finally {
      // Reset back to default schedule
      DropScoreEngine.resetCoreSchedule();
    }
  });
});
