/**
 * DropScore™ Evaluation Engine v1.3
 * Evaluates Drupal module signals across 5 weighted pillars.
 * Focuses on a clean 0-100 numerical score with objective sentiment labels (no A/B/C/D letter grades)
 * and properly prioritizes stable releases over pre-release alphas/betas.
 */

const DEFAULT_DRUPAL_CORE_SCHEDULE = {
  activeMajor: 11,
  upcomingMajor: 12,
  leavingSupportMajor: 10,
  leavingSupportDate: 'November 2026',
  versions: {
    12: { major: 12, label: 'Drupal 12', minPhp: '8.3+', status: 'upcoming' },
    11: { major: 11, label: 'Drupal 11', minPhp: '8.3+', status: 'active' },
    10: { major: 10, label: 'Drupal 10', minPhp: '8.1+', status: 'leaving_support', eolDate: 'November 2026' }
  }
};

class DropScoreEngine {
  static coreSchedule = { ...DEFAULT_DRUPAL_CORE_SCHEDULE };

  static getCoreSchedule() {
    return { ...this.coreSchedule };
  }

  static setCoreSchedule(customSchedule) {
    this.coreSchedule = { ...this.coreSchedule, ...customSchedule };
  }

  static resetCoreSchedule() {
    this.coreSchedule = { ...DEFAULT_DRUPAL_CORE_SCHEDULE };
  }

  /**
   * Evaluate a module given extracted/enriched metadata.
   * @param {Object} data - Module signals conforming to RawModuleData / EnrichedModuleData
   * @param {string} [targetVersion] - Optional specific release version to evaluate
   * @returns {Object} Full evaluation report
   */
  static evaluate(data = {}, targetVersion = null) {
    // If a specific version is targeted, locate it
    const activeRelease = (targetVersion && Array.isArray(data.releases))
      ? data.releases.find(r => r.version === targetVersion)
      : (data.releases?.find(r => r.isRecommended) || data.releases?.[0] || null);

    // Merge version-specific overrides if evaluating a specific release
    // If evaluating the project generally (targetVersion is null), prefer stable release signals
    const effectiveData = {
      ...data,
      isSecurityCovered: (activeRelease?.isSecurityCovered !== undefined) ? activeRelease.isSecurityCovered : data.isSecurityCovered,
      supportsDrupal12: (activeRelease?.supportsD12 !== undefined) ? (activeRelease.supportsD12 || data.supportsDrupal12) : Boolean(data.supportsDrupal12),
      supportsDrupal11: (activeRelease?.supportsD11 !== undefined) ? (activeRelease.supportsD11 || data.supportsDrupal11) : Boolean(data.supportsDrupal11),
      supportsDrupal10: (activeRelease?.supportsD10 !== undefined) ? (activeRelease.supportsD10 || data.supportsDrupal10) : Boolean(data.supportsDrupal10),
      modernPhpSupported: (activeRelease?.modernPhp !== undefined)
        ? (activeRelease.modernPhp || Boolean(activeRelease.supportsD12) || Boolean(activeRelease.supportsD11) || data.modernPhpSupported)
        : (Boolean(data.supportsDrupal12) || Boolean(data.supportsDrupal11) || data.modernPhpSupported),
      lastReleaseDaysAgo: (activeRelease?.daysAgo !== undefined && activeRelease.daysAgo !== null) ? activeRelease.daysAgo : data.lastReleaseDaysAgo,
      activeVersion: activeRelease?.version || data.latestVersion || 'Latest'
    };

    // 1. Pillar: Security & Trust (25 pts)
    const securityBreakdown = {
      coverage: effectiveData.isSecurityCovered ? 16 : 0,
      maintainers: (effectiveData.maintainersCount >= 2) ? 5 : (effectiveData.maintainersCount === 1 ? 2 : 0),
      sponsors: (effectiveData.sponsorsCount && effectiveData.sponsorsCount > 0) ? Math.min(4, effectiveData.sponsorsCount * 2) : 0
    };
    let securityScore = securityBreakdown.coverage + securityBreakdown.maintainers + securityBreakdown.sponsors;
    securityScore = Math.max(0, Math.min(25, securityScore));

    // 2. Pillar: Maintenance & Velocity (25 pts)
    let statusPoints = 6;
    let statusLabel = 'Maintained';
    const maintStatus = (effectiveData.maintenanceStatus || '').toLowerCase();
    const devStatus = (effectiveData.developmentStatus || '').toLowerCase();

    if (maintStatus.includes('actively maintained') || devStatus.includes('active development')) {
      statusPoints = 10;
      statusLabel = 'Active';
    } else if (maintStatus.includes('minimally maintained') || devStatus.includes('maintenance fixes only')) {
      statusPoints = 6;
      statusLabel = 'Maintenance Only';
    } else if (maintStatus.includes('seeking co-maintainer')) {
      statusPoints = 5;
      statusLabel = 'Seeking Co-maintainer';
    } else if (maintStatus.includes('seeking new maintainer')) {
      statusPoints = 2;
      statusLabel = 'Seeking Maintainer';
    } else if (maintStatus.includes('unsupported') || devStatus.includes('obsolete') || devStatus.includes('no further')) {
      statusPoints = 0;
      statusLabel = 'Unsupported';
    } else {
      // Status unstated on Drupal.org node: infer from release activity and recency
      const days = typeof effectiveData.lastReleaseDaysAgo === 'number' ? effectiveData.lastReleaseDaysAgo : null;
      if (days !== null && days <= 365) {
        statusPoints = 10;
        statusLabel = 'Active';
      } else if (days !== null && days <= 730) {
        statusPoints = 8;
        statusLabel = 'Maintained';
      } else {
        statusPoints = 6;
        statusLabel = 'Unstated';
      }
    }

    let recencyPoints = 0;
    const daysAgo = typeof effectiveData.lastReleaseDaysAgo === 'number' ? effectiveData.lastReleaseDaysAgo : null;
    if (daysAgo !== null) {
      if (daysAgo <= 30) recencyPoints = 8;
      else if (daysAgo <= 90) recencyPoints = 7;
      else if (daysAgo <= 180) recencyPoints = 5;
      else if (daysAgo <= 365) recencyPoints = 3;
      else if (daysAgo <= 730) recencyPoints = 1;
      else recencyPoints = 0;
    } else {
      recencyPoints = 3;
    }

    let issuePoints = 3;
    const totalIssues = effectiveData.totalIssuesCount || 0;
    const openBugs = effectiveData.openBugsCount || 0;
    const rtbc = effectiveData.rtbcCount || 0;

    let rtbcPoints = 1;
    if (rtbc >= 5) rtbcPoints = 3;
    else if (rtbc >= 1) rtbcPoints = 2;

    let bugRatioPoints = 3;
    if (totalIssues > 0 && openBugs >= 0) {
      const bugRatio = openBugs / totalIssues;
      if (bugRatio <= 0.25) bugRatioPoints = 4;
      else if (bugRatio <= 0.50) bugRatioPoints = 3;
      else if (bugRatio <= 0.75) bugRatioPoints = 2;
      else bugRatioPoints = 1;
    } else {
      bugRatioPoints = 3;
    }
    issuePoints = Math.min(7, rtbcPoints + bugRatioPoints);

    const maintenanceBreakdown = {
      status: statusPoints,
      statusLabel,
      recency: recencyPoints,
      issues: issuePoints
    };
    let maintenanceScore = Math.max(0, Math.min(25, statusPoints + recencyPoints + issuePoints));

    // 3. Pillar: Modernity & Compatibility (20 pts)
    const schedule = DropScoreEngine.coreSchedule || DEFAULT_DRUPAL_CORE_SCHEDULE;
    const isD12Active = schedule.activeMajor >= 12;

    const hasD12 = Boolean(effectiveData.supportsDrupal12);
    const hasD11 = Boolean(effectiveData.supportsDrupal11);
    const hasD10 = Boolean(effectiveData.supportsDrupal10);
    // Drupal 11 & 12 require PHP 8.3 minimum; D11/D12 support guarantees PHP 8.3+
    const hasModernPhp = hasD12 || hasD11 || Boolean(effectiveData.modernPhpSupported);

    let activeCorePoints = 0;
    let ltsCorePoints = 0;
    let phpPoints = hasModernPhp ? 2 : 0;
    let summaryText = '';

    if (isD12Active) {
      // Future era when Drupal 12 is released and primary
      // Drupal 12: 12 pts (primary)
      // Drupal 11: 6 pts (LTS)
      // Drupal 10: 0 pts (fully EOL)
      activeCorePoints = hasD12 ? 12 : 0;
      ltsCorePoints = hasD11 ? 6 : 0;
      summaryText = `Drupal 12: ${activeCorePoints}/12 · Drupal 11 (LTS): ${ltsCorePoints}/6 · PHP 8.3+: ${phpPoints}/2`;
    } else {
      // Current era: Drupal 11 active, D12 upcoming, D10 leaving support in Nov 2026
      // Supporting Drupal 12 or Drupal 11 awards the primary 12 pts
      activeCorePoints = (hasD12 || hasD11) ? 12 : 0;
      ltsCorePoints = hasD10 ? 6 : 0;
      const primaryLabel = hasD12 ? 'Drupal 12/11' : 'Drupal 11';
      summaryText = `${primaryLabel}: ${activeCorePoints}/12 · Drupal 10 (EOL Nov '26): ${ltsCorePoints}/6 · PHP 8.3+: ${phpPoints}/2`;
    }

    const modernityScore = Math.max(0, Math.min(20, activeCorePoints + ltsCorePoints + phpPoints));

    const modernityBreakdown = {
      drupal12: hasD12 ? (isD12Active ? activeCorePoints : 12) : 0,
      drupal11: hasD11 ? (isD12Active ? ltsCorePoints : activeCorePoints) : 0,
      drupal10: hasD10 ? (isD12Active ? 0 : ltsCorePoints) : 0,
      modernPhp: phpPoints,
      activeCore: activeCorePoints,
      ltsCore: ltsCorePoints,
      summaryText,
      d10EolNotice: 'November 2026'
    };

    // 4. Pillar: Code Quality & CI (15 pts)
    let pipelinePoints = 4;
    const pipelineStatus = (effectiveData.gitlabPipelineStatus || 'unknown').toLowerCase();
    if (pipelineStatus === 'passed' || pipelineStatus === 'success') {
      pipelinePoints = 10;
    } else if (pipelineStatus === 'running' || pipelineStatus === 'manual') {
      pipelinePoints = 5;
    } else if (pipelineStatus === 'failed') {
      pipelinePoints = 0;
    } else {
      pipelinePoints = 4;
    }

    const testPoints = effectiveData.hasAutomatedTests ? 5 : 2;
    const qualityBreakdown = {
      pipeline: pipelinePoints,
      tests: testPoints
    };
    let qualityScore = Math.max(0, Math.min(15, pipelinePoints + testPoints));

    // 5. Pillar: Adoption & Community (15 pts)
    let installPoints = 1;
    const installs = effectiveData.activeInstalls || 0;
    if (installs >= 100000) installPoints = 10;
    else if (installs >= 20000) installPoints = 8;
    else if (installs >= 5000) installPoints = 6;
    else if (installs >= 1000) installPoints = 4;
    else if (installs >= 200) installPoints = 2;
    else {
      installPoints = 1;
    }

    let contribPoints = 1;
    const maintainers = effectiveData.maintainersCount || 0;
    if (maintainers >= 5) contribPoints = 5;
    else if (maintainers >= 3) contribPoints = 4;
    else if (maintainers >= 2) contribPoints = 3;
    else if (maintainers >= 1) contribPoints = 2;
    else contribPoints = 0;

    const adoptionBreakdown = {
      installs: installPoints,
      contributors: contribPoints
    };
    let adoptionScore = Math.max(0, Math.min(15, installPoints + contribPoints));

    // Total Score
    let rawScore = securityScore + maintenanceScore + modernityScore + qualityScore + adoptionScore;

    // Penalty for explicitly unsupported or obsolete projects
    let isUnsupported = maintStatus.includes('unsupported') || devStatus.includes('obsolete');
    if (isUnsupported) {
      rawScore = Math.min(rawScore, 35);
    }

    const totalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Modern Benchmarking Labels (No academic school letter grades A/B/C/D)
    // Brand-new projects (<90 days) are explicitly labeled "Emerging"
    let gradeLabel = 'Needs Attention';
    let gradeColor = '#dc2626'; // Crimson

    if (effectiveData.isEmergingProject && totalScore >= 45) {
      gradeLabel = 'Emerging';
      gradeColor = '#d97706'; // Amber / Bronze
    } else if (totalScore >= 90) {
      gradeLabel = 'Exceptional';
      gradeColor = '#059669'; // Emerald
    } else if (totalScore >= 75) {
      gradeLabel = 'Healthy';
      gradeColor = '#0891b2'; // Teal / Cyan
    } else if (totalScore >= 60) {
      gradeLabel = 'Stable';
      gradeColor = '#2563eb'; // Royal Blue
    } else if (totalScore >= 45) {
      gradeLabel = 'Maturing';
      gradeColor = '#d97706'; // Amber / Bronze
    }

    // Flags & Signals
    const flags = [];

    if (effectiveData.isEmergingProject) {
      flags.push({
        type: 'positive',
        icon: 'sprout',
        text: 'Emerging Project',
        description: `Created within the last ${effectiveData.createdDaysAgo || 90} days. High release momentum.`
      });
    }

    if (effectiveData.isSecurityCovered) {
      flags.push({
        type: 'positive',
        icon: 'shieldCheck',
        text: 'Security Covered',
        description: 'Releases are audited under the Drupal Security Advisory policy.'
      });
    } else {
      flags.push({
        type: 'warning',
        icon: 'shieldAlert',
        text: 'No Advisory Coverage',
        description: 'Releases are NOT covered by Drupal Security Advisories. Audit manually.'
      });
    }

    if (hasD12) {
      flags.push({
        type: 'positive',
        icon: 'rocket',
        text: 'Drupal 12 Ready',
        description: 'Forward-compatible with upcoming Drupal 12 core.'
      });
    }

    if (hasD11) {
      flags.push({
        type: 'positive',
        icon: 'rocket',
        text: 'Drupal 11 Ready',
        description: 'Compatible with Drupal 11 core.'
      });
    } else if (hasD10) {
      flags.push({
        type: 'warning',
        icon: 'clock',
        text: 'D10 Only (EOL Nov 2026)',
        description: 'Compatible with Drupal 10 only. Drupal 10 reaches End-of-Life in November 2026; upgrade to Drupal 11+ is urgently needed before support terminates.'
      });
    } else {
      flags.push({
        type: 'critical',
        icon: 'alertCircle',
        text: 'Legacy Only',
        description: 'No modern Drupal 10, 11, or 12 compatibility found.'
      });
    }

    if (daysAgo !== null && daysAgo <= 45) {
      flags.push({
        type: 'positive',
        icon: 'zap',
        text: 'Recently Released',
        description: `Latest release published ${daysAgo} days ago.`
      });
    } else if (daysAgo !== null && daysAgo > 365) {
      flags.push({
        type: 'warning',
        icon: 'moon',
        text: 'Stale Releases (>1 Year)',
        description: `No new releases in over ${Math.floor(daysAgo / 30)} months.`
      });
    }

    if (installs >= 20000) {
      flags.push({
        type: 'positive',
        icon: 'users',
        text: `${installs.toLocaleString()} Active Sites`,
        description: 'Battle-tested across thousands of Drupal installations.'
      });
    }

    if (pipelineStatus === 'passed' || pipelineStatus === 'success') {
      flags.push({
        type: 'positive',
        icon: 'flask',
        text: 'GitLab CI Green',
        description: 'Automated test pipeline passing on git.drupalcode.org.'
      });
    } else if (pipelineStatus === 'failed') {
      flags.push({
        type: 'critical',
        icon: 'alertCircle',
        text: 'GitLab CI Failing',
        description: 'Automated pipeline currently has failing tests.'
      });
    }

    if (isUnsupported) {
      flags.push({
        type: 'critical',
        icon: 'alertCircle',
        text: 'Unsupported / Obsolete',
        description: 'Maintainers marked this project as unsupported or obsolete.'
      });
    }

    const recommendations = [];

    // 1. Security & Trust Recommendations
    if (!effectiveData.isSecurityCovered) {
      recommendations.push({
        topic: 'Security Advisory',
        action: 'Releases are not covered by the Drupal Security Advisory policy. Maintainers can opt in via Drupal.org project settings (+16 pts); site builders should perform manual security audits.'
      });
    }
    if (maintainers === 1 && !effectiveData.isEmergingProject) {
      recommendations.push({
        topic: 'Bus Factor',
        action: 'Single maintainer identified. Onboard active contributors as co-maintainers on Drupal.org to safeguard continuity (+3 pts).'
      });
    }
    const sponsors = effectiveData.sponsorsCount || 0;
    if (sponsors === 0 && installs >= 1000) {
      recommendations.push({
        topic: 'Sponsorship',
        action: 'No supporting organizations listed. Sponsoring organizations can link their Drupal.org profile to improve trust signals (+4 pts).'
      });
    }

    // 2. Maintenance & Velocity Recommendations
    if (daysAgo !== null && daysAgo > 180) {
      const months = Math.floor(daysAgo / 30);
      recommendations.push({
        topic: 'Release Cadence',
        action: `Latest stable release (${effectiveData.activeVersion}) is over ${months} months old. Tagging a new release from the dev branch will ship accumulated bugfixes and recover up to +5 velocity points.`
      });
    }
    if (maintStatus.includes('seeking co-maintainer')) {
      recommendations.push({
        topic: 'Co-maintainer',
        action: 'Maintainers are actively seeking assistance. Community developers can apply in the Drupal.org issue queue.'
      });
    }
    if (isUnsupported) {
      recommendations.push({
        topic: 'Unsupported Project',
        action: 'Maintainers marked this project as unsupported or obsolete. Adopt this module via Drupal\'s project ownership process or migrate to an active alternative.'
      });
    }
    if (rtbc >= 5) {
      recommendations.push({
        topic: 'Queue Velocity',
        action: `${rtbc} community-reviewed (RTBC) patches are waiting in the queue. Review and commit them to clear the backlog.`
      });
    }
    if (totalIssues > 10 && openBugs / totalIssues > 0.5) {
      recommendations.push({
        topic: 'Issue Triage',
        action: 'Over 50% of open issues are bug reports. Prioritize triaging bug reports and merging available community fixes.'
      });
    }

    // 3. Modernity & Compatibility Recommendations
    if (isD12Active) {
      if (!hasD12) {
        recommendations.push({
          topic: 'Drupal 12',
          action: 'Missing Drupal 12 support. Update core_version_requirement to include ^12 in .info.yml and test against D12 core (+12 pts).'
        });
      }
      if (!hasD11) {
        recommendations.push({
          topic: 'Drupal 11',
          action: 'Missing Drupal 11 LTS support. Run Upgrade Status or drupal-check to resolve deprecated APIs (+6 pts).'
        });
      }
    } else {
      // D11 active era
      if (!hasD11 && !hasD12) {
        if (hasD10) {
          recommendations.push({
            topic: 'Drupal 10 EOL',
            action: 'Drupal 10 reaches End-of-Life in November 2026. This module lacks Drupal 11+ compatibility. Update core_version_requirement to ^10 || ^11 and test against D11 to prevent site upgrade blockers (+12 pts).'
          });
        } else {
          recommendations.push({
            topic: 'Drupal 11',
            action: 'Missing Drupal 11 support. Update core_version_requirement to ^10 || ^11 in .info.yml and test against D11 core (+12 pts).'
          });
        }
      }
      if (!hasD10 && !hasD12) {
        recommendations.push({
          topic: 'Drupal 10',
          action: 'Missing Drupal 10 support. Run mglaman/drupal-check or Upgrade Status to fix deprecated APIs (+6 pts).'
        });
      }
      if (!hasD11 && !hasD12 && !hasModernPhp) {
        recommendations.push({
          topic: 'PHP 8.3+',
          action: 'Ensure codebase is tested against PHP 8.3 and PHP 8.4 runtimes (Drupal 11 baseline) to prevent runtime deprecation warnings (+2 pts).'
        });
      }
    }

    // 4. Code Quality & CI Recommendations
    if (pipelineStatus === 'failed') {
      recommendations.push({
        topic: 'GitLab CI',
        action: 'Automated GitLab CI pipeline is failing on git.drupalcode.org. Inspect pipeline build logs and resolve test failures (+10 pts).'
      });
    } else if (pipelineStatus === 'unknown') {
      recommendations.push({
        topic: 'GitLab CI',
        action: 'Automated testing not detected. Add standard Drupal GitLab CI templates to .gitlab-ci.yml on git.drupalcode.org (+6 pts).'
      });
    }
    if (!effectiveData.hasAutomatedTests) {
      recommendations.push({
        topic: 'Test Suite',
        action: 'No automated tests found. Adding PHPUnit kernel/functional tests will improve code quality and prevent regressions (+3 pts).'
      });
    }

    // 5. Positive Reinforcement when in exceptional health
    if (recommendations.length === 0) {
      recommendations.push({
        topic: 'Exceptional Health',
        action: 'All objective health pillars are in excellent standing. Maintain regular release cadence and green GitLab CI status.'
      });
    }

    return {
      score: totalScore,
      gradeLabel,
      gradeColor,
      activeVersion: effectiveData.activeVersion,
      isEmergingProject: effectiveData.isEmergingProject,
      pillars: {
        security: {
          score: securityScore,
          max: 25,
          label: 'Security & Trust',
          breakdown: securityBreakdown
        },
        maintenance: {
          score: maintenanceScore,
          max: 25,
          label: 'Maintenance & Velocity',
          breakdown: maintenanceBreakdown
        },
        modernity: {
          score: modernityScore,
          max: 20,
          label: 'Modernity & Compatibility',
          breakdown: modernityBreakdown
        },
        quality: {
          score: qualityScore,
          max: 15,
          label: 'Code Quality & CI',
          breakdown: qualityBreakdown
        },
        adoption: {
          score: adoptionScore,
          max: 15,
          label: 'Adoption & Community',
          breakdown: adoptionBreakdown
        }
      },
      flags,
      recommendations
    };
  }
}

function evaluateDropScore(data, targetVersion = null) {
  return DropScoreEngine.evaluate(data, targetVersion);
}

if (typeof globalThis !== 'undefined') {
  globalThis.DropScoreEngine = DropScoreEngine;
  globalThis.evaluateDropScore = evaluateDropScore;
  globalThis.DEFAULT_DRUPAL_CORE_SCHEDULE = DEFAULT_DRUPAL_CORE_SCHEDULE;
}
