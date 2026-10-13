/**
 * DropScore™ Evaluation Engine v1.3
 * Evaluates Drupal module signals across 5 weighted pillars.
 * Focuses on a clean 0-100 numerical score with objective sentiment labels (no A/B/C/D letter grades)
 * and properly prioritizes stable releases over pre-release alphas/betas.
 */

class DropScoreEngine {
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
      supportsDrupal11: (activeRelease?.supportsD11 !== undefined) ? (activeRelease.supportsD11 || data.supportsDrupal11) : data.supportsDrupal11,
      supportsDrupal10: (activeRelease?.supportsD10 !== undefined) ? (activeRelease.supportsD10 || data.supportsDrupal10) : data.supportsDrupal10,
      modernPhpSupported: (activeRelease?.modernPhp !== undefined) ? (activeRelease.modernPhp || data.modernPhpSupported) : data.modernPhpSupported,
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
    const d11Points = effectiveData.supportsDrupal11 ? 12 : 0;
    const d10Points = effectiveData.supportsDrupal10 ? 6 : 0;
    const phpPoints = effectiveData.modernPhpSupported ? 2 : 0;

    const modernityBreakdown = {
      drupal11: d11Points,
      drupal10: d10Points,
      modernPhp: phpPoints
    };
    let modernityScore = Math.max(0, Math.min(20, d11Points + d10Points + phpPoints));

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

    if (effectiveData.supportsDrupal11) {
      flags.push({
        type: 'positive',
        icon: 'rocket',
        text: 'Drupal 11 Ready',
        description: 'Compatible with Drupal 11 core.'
      });
    } else if (effectiveData.supportsDrupal10) {
      flags.push({
        type: 'warning',
        icon: 'clock',
        text: 'Drupal 10 Only',
        description: 'Compatible with Drupal 10; Drupal 11 not yet tagged.'
      });
    } else {
      flags.push({
        type: 'critical',
        icon: 'alertCircle',
        text: 'Legacy Only',
        description: 'No modern Drupal 10 or 11 compatibility found.'
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
    if (!effectiveData.isSecurityCovered) {
      recommendations.push('Review code security independently; releases are not covered by the Drupal Security Advisory policy.');
    }
    if (!effectiveData.supportsDrupal11) {
      recommendations.push('Check the issue queue for Drupal 11 compatibility patches before planning major upgrades.');
    }
    if (maintainers === 1) {
      recommendations.push('Single maintainer identified. Consider contributing or sponsoring to reduce bus factor.');
    }
    if (rtbc >= 5) {
      recommendations.push(`${rtbc} community-reviewed (RTBC) patches waiting in the queue; high community velocity.`);
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
}
