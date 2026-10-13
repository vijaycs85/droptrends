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

    assert.ok(result.score >= 50 && result.score <= 75, `Expected emerging project score between 50 and 75, got ${result.score}`);
    assert.strictEqual(result.gradeLabel, 'Emerging');
    assert.strictEqual(result.isEmergingProject, true);
  });

  it('penalizes unsupported and obsolete modules with 0 score, disqualification, and disclaimer', () => {
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
    assert.strictEqual(result.score, 0, `Expected score 0, got ${result.score}`);
    assert.strictEqual(result.gradeLabel, 'Obsolete');
    assert.strictEqual(result.isDisqualified, true);
    assert.strictEqual(result.disqualificationReason, 'obsolete');
    assert.ok(result.disclaimer);
    assert.strictEqual(result.disclaimer.type, 'critical');
    assert.strictEqual(result.pillars.security.score, 0);
    assert.strictEqual(result.pillars.maintenance.score, 0);
    assert.strictEqual(result.pillars.modernity.score, 0);
  });

  it('disqualifies unsupported modules with score 0 and Unsupported grade label', () => {
    const mockUnsupported = {
      machineName: 'unsupported_mod',
      title: 'Unsupported Module',
      isSecurityCovered: false,
      maintenanceStatus: 'Unsupported',
      developmentStatus: 'Maintenance fixes only',
      activeInstalls: 500
    };

    const result = evaluateDropScore(mockUnsupported);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.gradeLabel, 'Unsupported');
    assert.strictEqual(result.isDisqualified, true);
    assert.strictEqual(result.disqualificationReason, 'unsupported');
    assert.strictEqual(result.disclaimer.type, 'critical');
  });

  it('disqualifies modules whose security advisory coverage was revoked with score 0', () => {
    const mockRevoked = {
      machineName: 'revoked_mod',
      title: 'Revoked Module',
      isSecurityRevoked: true,
      securityCoverageStatus: 'revoked',
      maintenanceStatus: 'Actively maintained',
      developmentStatus: 'Under active development'
    };

    const result = evaluateDropScore(mockRevoked);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.gradeLabel, 'Security Revoked');
    assert.strictEqual(result.isDisqualified, true);
    assert.strictEqual(result.disqualificationReason, 'security_revoked');
    assert.strictEqual(result.disclaimer.type, 'critical');
  });

  it('applies disclaimer and reduced status score for minimally maintained modules', () => {
    const mockMinimal = {
      machineName: 'minimal_mod',
      title: 'Minimal Module',
      isSecurityCovered: true,
      supportsDrupal11: true,
      maintenanceStatus: 'Minimally maintained',
      activeInstalls: 5000,
      lastReleaseDaysAgo: 45
    };

    const result = evaluateDropScore(mockMinimal);
    assert.strictEqual(result.isDisqualified, false);
    assert.strictEqual(result.pillars.maintenance.breakdown.status, 4);
    assert.ok(result.disclaimer);
    assert.strictEqual(result.disclaimer.type, 'warning');
    assert.strictEqual(result.disclaimer.title, 'Minimally Maintained');
  });

  it('caps score and sets warning disclaimer for modules with no further development', () => {
    const mockNoFurther = {
      machineName: 'legacy_tool',
      title: 'Legacy Tool',
      isSecurityCovered: true,
      supportsDrupal11: true,
      activeInstalls: 50000, // normally high adoption
      developmentStatus: 'No further development'
    };

    const result = evaluateDropScore(mockNoFurther);
    assert.strictEqual(result.isDisqualified, false);
    assert.ok(result.score <= 50, `Expected score <= 50, got ${result.score}`);
    assert.ok(result.disclaimer);
    assert.strictEqual(result.disclaimer.title, 'No Further Development');
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

  it('automatically infers PHP 8.5+ minimum requirement from Drupal 12 compatibility', () => {
    const mockD12Module = {
      machineName: 'd12_php85_mod',
      title: 'Drupal 12 PHP 8.5 Module',
      isSecurityCovered: true,
      activeInstalls: 8000,
      lastReleaseDaysAgo: 15,
      supportsDrupal12: true,
      supportsDrupal11: true,
      supportsDrupal10: true,
      modernPhpSupported: false, // Omitted or false in raw DOM
      maintainersCount: 2,
      sponsorsCount: 1,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true
    };

    const result = evaluateDropScore(mockD12Module);
    assert.strictEqual(result.pillars.modernity.score, 20);
    assert.strictEqual(result.pillars.modernity.breakdown.modernPhp, 2);
    assert.strictEqual(result.pillars.modernity.breakdown.phpLabel, 'PHP 8.5+');
    assert.strictEqual(result.pillars.modernity.breakdown.supportsPhp85, true);
    assert.ok(result.pillars.modernity.breakdown.summaryText.includes('PHP 8.5+: 2/2'));
  });

  it('awards full 20/20 modernity points to Drupal 11-only modules without penalizing for missing D10', () => {
    const mockD11OnlyModule = {
      machineName: 'd11_pure',
      title: 'D11 Pure Module',
      isSecurityCovered: true,
      activeInstalls: 500,
      lastReleaseDaysAgo: 10,
      supportsDrupal12: false,
      supportsDrupal11: true,
      supportsDrupal10: false, // D11 only!
      maintainersCount: 2,
      sponsorsCount: 1,
      gitlabPipelineStatus: 'passed',
      hasAutomatedTests: true
    };

    const result = evaluateDropScore(mockD11OnlyModule);
    assert.strictEqual(result.pillars.modernity.score, 20, 'D11-only modules must receive full 20/20 modernity score');
    assert.strictEqual(result.pillars.modernity.breakdown.corePoints, 18);
    assert.strictEqual(result.pillars.modernity.breakdown.modernPhp, 2);
    // Ensure no recommendation is made to add D10 support
    const hasD10Rec = result.recommendations.some(r => r.topic === 'Drupal 10');
    assert.strictEqual(hasD10Rec, false, 'Must not recommend adding D10 to a D11-ready module');
  });

  it('awards full 20/20 modernity points to Drupal 12-only modules in D12 era without requiring D11', () => {
    const { DropScoreEngine } = globalThis;
    try {
      DropScoreEngine.setCoreSchedule({
        activeMajor: 12,
        upcomingMajor: 13,
        leavingSupportMajor: 11
      });

      const mockD12OnlyModule = {
        machineName: 'd12_pure',
        title: 'D12 Pure Module',
        isSecurityCovered: true,
        activeInstalls: 250,
        lastReleaseDaysAgo: 5,
        supportsDrupal12: true,
        supportsDrupal11: false, // D12 only!
        supportsDrupal10: false,
        maintainersCount: 2,
        sponsorsCount: 1,
        gitlabPipelineStatus: 'passed',
        hasAutomatedTests: true
      };

      const result = evaluateDropScore(mockD12OnlyModule);
      assert.strictEqual(result.pillars.modernity.score, 20, 'D12-only modules must receive full 20/20 in D12 era');
      assert.strictEqual(result.pillars.modernity.breakdown.corePoints, 18);
      assert.strictEqual(result.pillars.modernity.breakdown.modernPhp, 2);
      // Ensure no recommendation is made to add D11 support
      const hasD11Rec = result.recommendations.some(r => r.topic === 'Drupal 11');
      assert.strictEqual(hasD11Rec, false, 'Must not recommend adding D11 to a D12-ready module');
    } finally {
      DropScoreEngine.resetCoreSchedule();
    }
  });

  it('calibrates maintainer count scoring accurately (1 maint -> 1 pt, 2 maint -> 3 pts, 3+ maint -> 5 pts)', () => {
    const baseModule = {
      machineName: 'test_maint',
      title: 'Test Maintainers',
      isSecurityCovered: true,
      activeInstalls: 500,
      supportsDrupal11: true
    };

    assert.strictEqual(evaluateDropScore({ ...baseModule, maintainersCount: 0 }).pillars.adoption.breakdown.contributors, 0);
    assert.strictEqual(evaluateDropScore({ ...baseModule, maintainersCount: 1 }).pillars.adoption.breakdown.contributors, 1);
    assert.strictEqual(evaluateDropScore({ ...baseModule, maintainersCount: 2 }).pillars.adoption.breakdown.contributors, 3);
    assert.strictEqual(evaluateDropScore({ ...baseModule, maintainersCount: 3 }).pillars.adoption.breakdown.contributors, 5);
    assert.strictEqual(evaluateDropScore({ ...baseModule, maintainersCount: 10 }).pillars.adoption.breakdown.contributors, 5);
  });

  it('calibrates usage scoring ladder accurately across all install tiers', () => {
    const baseModule = {
      machineName: 'test_usage',
      title: 'Test Usage',
      isSecurityCovered: true,
      maintainersCount: 2,
      supportsDrupal11: true
    };

    // 0 installs (non-emerging) -> 0 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 0 }).pillars.adoption.breakdown.installs, 0);
    // 1 - usage -> 2 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 1 }).pillars.adoption.breakdown.installs, 2);
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 9 }).pillars.adoption.breakdown.installs, 2);
    // over 10 -> 4 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 10 }).pillars.adoption.breakdown.installs, 4);
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 45 }).pillars.adoption.breakdown.installs, 4);
    // over 50 -> 6 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 50 }).pillars.adoption.breakdown.installs, 6);
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 80 }).pillars.adoption.breakdown.installs, 6);
    // over 100 -> 7 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 100 }).pillars.adoption.breakdown.installs, 7);
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 433 }).pillars.adoption.breakdown.installs, 7);
    // over 1000 -> 8 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 1000 }).pillars.adoption.breakdown.installs, 8);
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 5000 }).pillars.adoption.breakdown.installs, 8);
    // over 10000 -> 9 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 10000 }).pillars.adoption.breakdown.installs, 9);
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 15000 }).pillars.adoption.breakdown.installs, 9);
    // over 20,000 -> 10 points
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 20000 }).pillars.adoption.breakdown.installs, 10);
    assert.strictEqual(evaluateDropScore({ ...baseModule, activeInstalls: 100000 }).pillars.adoption.breakdown.installs, 10);
  });
});
