/**
 * DropScore™ Evaluation Engine v1.0
 * Evaluates Drupal module signals across 5 weighted pillars (0-100 score).
 */

class DropScoreEngine {
  /**
   * Evaluate a module given extracted/enriched metadata.
   * @param {Object} data - Module signals conforming to RawModuleData / EnrichedModuleData
   * @returns {Object} Full evaluation report
   */
  static evaluate(data = {}) {
    // 1. Pillar: Security & Trust (25 pts)
    const securityBreakdown = {
      coverage: data.isSecurityCovered ? 16 : 0,
      maintainers: (data.maintainersCount >= 2) ? 5 : (data.maintainersCount === 1 ? 2 : 0),
      sponsors: (data.sponsorsCount && data.sponsorsCount > 0) ? Math.min(4, data.sponsorsCount * 2) : 0
    };
    let securityScore = securityBreakdown.coverage + securityBreakdown.maintainers + securityBreakdown.sponsors;
    securityScore = Math.max(0, Math.min(25, securityScore));

    // 2. Pillar: Maintenance & Velocity (25 pts)
    let statusPoints = 5; // Default if unspecified
    const maintStatus = (data.maintenanceStatus || '').toLowerCase();
    const devStatus = (data.developmentStatus || '').toLowerCase();

    if (maintStatus.includes('actively maintained') || devStatus.includes('active development')) {
      statusPoints = 10;
    } else if (maintStatus.includes('minimally maintained') || devStatus.includes('maintenance fixes only')) {
      statusPoints = 6;
    } else if (maintStatus.includes('seeking co-maintainer')) {
      statusPoints = 5;
    } else if (maintStatus.includes('seeking new maintainer')) {
      statusPoints = 2;
    } else if (maintStatus.includes('unsupported') || devStatus.includes('obsolete') || devStatus.includes('no further')) {
      statusPoints = 0;
    }

    let recencyPoints = 0;
    const daysAgo = typeof data.lastReleaseDaysAgo === 'number' ? data.lastReleaseDaysAgo : null;
    if (daysAgo !== null) {
      if (daysAgo <= 30) recencyPoints = 8;
      else if (daysAgo <= 90) recencyPoints = 7;
      else if (daysAgo <= 180) recencyPoints = 5;
      else if (daysAgo <= 365) recencyPoints = 3;
      else if (daysAgo <= 730) recencyPoints = 1;
      else recencyPoints = 0;
    } else {
      recencyPoints = 3; // Neutral default if untracked
    }

    let issuePoints = 3;
    const totalIssues = data.totalIssuesCount || 0;
    const openBugs = data.openBugsCount || 0;
    const rtbc = data.rtbcCount || 0;

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
    }
    issuePoints = Math.min(7, rtbcPoints + bugRatioPoints);

    const maintenanceBreakdown = {
      status: statusPoints,
      recency: recencyPoints,
      issues: issuePoints
    };
    let maintenanceScore = Math.max(0, Math.min(25, statusPoints + recencyPoints + issuePoints));

    // 3. Pillar: Modernity & Compatibility (20 pts)
    const d11Points = data.supportsDrupal11 ? 10 : 0;
    const d10Points = data.supportsDrupal10 ? 6 : 0;
    const phpPoints = data.modernPhpSupported ? 2 : 1;
    const recipePoints = data.isRecipeReady ? 2 : 1;

    const modernityBreakdown = {
      drupal11: d11Points,
      drupal10: d10Points,
      modernPhp: phpPoints,
      recipes: recipePoints
    };
    let modernityScore = Math.max(0, Math.min(20, d11Points + d10Points + phpPoints + recipePoints));

    // 4. Pillar: Code Quality & CI (15 pts)
    let pipelinePoints = 4; // Default unknown
    const pipelineStatus = (data.gitlabPipelineStatus || 'unknown').toLowerCase();
    if (pipelineStatus === 'passed' || pipelineStatus === 'success') {
      pipelinePoints = 10;
    } else if (pipelineStatus === 'running' || pipelineStatus === 'manual') {
      pipelinePoints = 5;
    } else if (pipelineStatus === 'failed') {
      pipelinePoints = 0;
    } else {
      pipelinePoints = 4;
    }

    const testPoints = data.hasAutomatedTests ? 5 : 2;
    const qualityBreakdown = {
      pipeline: pipelinePoints,
      tests: testPoints
    };
    let qualityScore = Math.max(0, Math.min(15, pipelinePoints + testPoints));

    // 5. Pillar: Adoption & Community (15 pts)
    let installPoints = 1;
    const installs = data.activeInstalls || 0;
    if (installs >= 100000) installPoints = 10;
    else if (installs >= 200000 || installs >= 20000) installPoints = 8;
    else if (installs >= 5000) installPoints = 6;
    else if (installs >= 1000) installPoints = 4;
    else if (installs >= 200) installPoints = 2;
    else installPoints = 1;

    let contribPoints = 1;
    const maintainers = data.maintainersCount || 0;
    if (maintainers >= 5) contribPoints = 5;
    else if (maintainers >= 3) contribPoints = 4;
    else if (maintainers >= 2) contribPoints = 3;
    else if (maintainers >= 1) contribPoints = 1;
    else contribPoints = 0;

    const adoptionBreakdown = {
      installs: installPoints,
      contributors: contribPoints
    };
    let adoptionScore = Math.max(0, Math.min(15, installPoints + contribPoints));

    // Calculate Raw Total
    let rawScore = securityScore + maintenanceScore + modernityScore + qualityScore + adoptionScore;

    // Apply Penalties
    let isUnsupported = maintStatus.includes('unsupported') || devStatus.includes('obsolete');
    if (isUnsupported) {
      rawScore = Math.min(rawScore, 35); // Cap at F/Critical if project is marked unsupported
    }

    const totalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Grade and Theme mapping
    let grade = 'F';
    let gradeLabel = 'Critical';
    let gradeColor = '#dc2626'; // Red

    if (totalScore >= 90) {
      grade = 'A+';
      gradeLabel = 'Exceptional';
      gradeColor = '#10b981'; // Emerald
    } else if (totalScore >= 80) {
      grade = 'A';
      gradeLabel = 'Healthy';
      gradeColor = '#059669'; // Green
    } else if (totalScore >= 70) {
      grade = 'B';
      gradeLabel = 'Good';
      gradeColor = '#0d9488'; // Teal
    } else if (totalScore >= 55) {
      grade = 'C';
      gradeLabel = 'Fair';
      gradeColor = '#d97706'; // Amber
    } else if (totalScore >= 40) {
      grade = 'D';
      gradeLabel = 'Warning';
      gradeColor = '#ea580c'; // Orange
    }

    // Flags (Insights & Alerts)
    const flags = [];

    // Security flags
    if (data.isSecurityCovered) {
      flags.push({
        type: 'positive',
        icon: '🛡️',
        text: 'Security Advisory Covered',
        description: 'Releases are actively audited and protected by the Drupal Security Team.'
      });
    } else {
      flags.push({
        type: 'warning',
        icon: '⚠️',
        text: 'No Security Advisory Coverage',
        description: 'Releases are NOT covered by Drupal Security Advisories. Audit carefully.'
      });
    }

    // Modernity flags
    if (data.supportsDrupal11) {
      flags.push({
        type: 'positive',
        icon: '🚀',
        text: 'Drupal 11 Ready',
        description: 'Supports Drupal 11 with declared compatible releases.'
      });
    } else if (data.supportsDrupal10) {
      flags.push({
        type: 'warning',
        icon: '⏳',
        text: 'Drupal 10 Only',
        description: 'Compatible with Drupal 10, but Drupal 11 support is not yet tagged.'
      });
    } else {
      flags.push({
        type: 'critical',
        icon: '🚫',
        text: 'Legacy Only (D7/D9)',
        description: 'No modern Drupal 10 or 11 compatibility found.'
      });
    }

    // Maintenance flags
    if (daysAgo !== null && daysAgo <= 45) {
      flags.push({
        type: 'positive',
        icon: '⚡',
        text: 'Recently Released',
        description: `Latest release was published ${daysAgo} days ago.`
      });
    } else if (daysAgo !== null && daysAgo > 365) {
      flags.push({
        type: 'warning',
        icon: '💤',
        text: 'Stale Releases (>1 Year)',
        description: `No new releases in over ${Math.floor(daysAgo / 30)} months.`
      });
    }

    // Adoption flags
    if (installs >= 20000) {
      flags.push({
        type: 'positive',
        icon: '📈',
        text: `${installs.toLocaleString()} Active Sites`,
        description: 'Highly trusted and battle-tested across thousands of Drupal installations.'
      });
    }

    // CI flags
    if (pipelineStatus === 'passed' || pipelineStatus === 'success') {
      flags.push({
        type: 'positive',
        icon: '🧪',
        text: 'GitLab CI Green',
        description: 'Automated test suite is passing on git.drupalcode.org.'
      });
    } else if (pipelineStatus === 'failed') {
      flags.push({
        type: 'critical',
        icon: '❌',
        text: 'GitLab CI Failing',
        description: 'Automated pipeline currently has failing tests.'
      });
    }

    // Status flags
    if (isUnsupported) {
      flags.push({
        type: 'critical',
        icon: '🚫',
        text: 'Unsupported / Obsolete',
        description: 'Maintainers have marked this project as unsupported or obsolete.'
      });
    }

    // Actionable Recommendations
    const recommendations = [];
    if (!data.isSecurityCovered) {
      recommendations.push('Verify security independently; this module is not covered by the Drupal Security Advisory policy.');
    }
    if (!data.supportsDrupal11) {
      recommendations.push('Check the issue queue for Drupal 11 compatibility patches before planning major upgrades.');
    }
    if (maintainers === 1) {
      recommendations.push('Single maintainer identified. Consider contributing or sponsoring to reduce bus factor.');
    }
    if (rtbc >= 5) {
      recommendations.push(`${rtbc} community-reviewed (RTBC) patches waiting in the queue; high community contribution momentum.`);
    }

    return {
      score: totalScore,
      grade,
      gradeLabel,
      gradeColor,
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

function evaluateDropScore(data) {
  return DropScoreEngine.evaluate(data);
}

if (typeof globalThis !== 'undefined') {
  globalThis.DropScoreEngine = DropScoreEngine;
  globalThis.evaluateDropScore = evaluateDropScore;
}
