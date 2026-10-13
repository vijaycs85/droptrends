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
    12: { major: 12, label: 'Drupal 12', minPhp: '8.5+', status: 'upcoming' },
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
    const isSecurityRevoked = Boolean(effectiveData.isSecurityRevoked) || effectiveData.securityCoverageStatus === 'revoked';

    // Disqualification Checks (Obsolete, Unsupported, Security Revoked)
    const isObsolete = devStatus.includes('obsolete');
    const isUnsupported = maintStatus.includes('unsupported');
    const isRevoked = isSecurityRevoked;
    const isDisqualified = isObsolete || isUnsupported || isRevoked;
    let disqualificationReason = null;
    let disclaimer = null;

    if (isObsolete) {
      disqualificationReason = 'obsolete';
      disclaimer = {
        type: 'critical',
        title: 'Obsolete Project (Deprecated)',
        message: 'Use of this project is deprecated by its maintainers. Do not install or recommend on new projects; migrate to an actively maintained alternative.'
      };
      statusPoints = 0;
      statusLabel = 'Obsolete';
    } else if (isUnsupported) {
      disqualificationReason = 'unsupported';
      disclaimer = {
        type: 'critical',
        title: 'Unsupported Project (Abandoned)',
        message: 'This project is marked as unsupported and is no longer being developed or maintained. Do not install on production sites.'
      };
      statusPoints = 0;
      statusLabel = 'Unsupported';
    } else if (isRevoked) {
      disqualificationReason = 'security_revoked';
      disclaimer = {
        type: 'critical',
        title: 'Security Advisory Coverage Revoked',
        message: 'This project was marked unsupported due to an unpatched security issue. Immediate risk—do not install.'
      };
      statusPoints = 0;
      statusLabel = 'Revoked';
    } else {
      if (maintStatus.includes('actively maintained') || devStatus.includes('active development')) {
        statusPoints = 10;
        statusLabel = 'Active';
      } else if (maintStatus.includes('minimally maintained')) {
        statusPoints = 4;
        statusLabel = 'Minimally Maintained';
        disclaimer = {
          type: 'warning',
          title: 'Minimally Maintained',
          message: 'The maintainer only resolves essential issues occasionally. Expect longer response times and limited active feature development.'
        };
      } else if (devStatus.includes('no further')) {
        statusPoints = 2;
        statusLabel = 'No Further Dev';
        disclaimer = {
          type: 'warning',
          title: 'No Further Development',
          message: 'Maintainers have stopped developing this project. It will not receive feature additions or future major version compatibility updates.'
        };
      } else if (maintStatus.includes('seeking new maintainer')) {
        statusPoints = 2;
        statusLabel = 'Seeking Maintainer';
        disclaimer = {
          type: 'warning',
          title: 'Seeking New Maintainer',
          message: 'The current author is looking to hand off the project to a new maintainer. Support may be delayed if untended.'
        };
      } else if (maintStatus.includes('seeking co-maintainer')) {
        statusPoints = 5;
        statusLabel = 'Seeking Co-maintainer';
        disclaimer = {
          type: 'info',
          title: 'Seeking Co-maintainers',
          message: 'The maintainer is actively seeking co-maintainers to help triage issues and review patches.'
        };
      } else if (devStatus.includes('maintenance fixes only')) {
        statusPoints = 6;
        statusLabel = 'Fixes Only';
        disclaimer = {
          type: 'info',
          title: 'Maintenance Fixes Only',
          message: 'Only bugfixes and maintenance patches will be accepted. No new feature development is planned.'
        };
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
    // Drupal 12 has a minimum requirement of PHP 8.5; Drupal 11 requires PHP 8.3 minimum.
    // D12 support guarantees PHP 8.5+; D11 support guarantees PHP 8.3+.
    const hasPhp85 = Boolean(effectiveData.supportsPhp85) || hasD12;
    const hasModernPhp = hasD12 || hasD11 || Boolean(effectiveData.modernPhpSupported);

    let corePoints = 0;
    let activeCorePoints = 0;
    let ltsCorePoints = 0;
    let phpPoints = hasModernPhp ? 2 : 0;
    let summaryText = '';

    // Target PHP runtime label: PHP 8.5+ when D12 is active or supported; otherwise PHP 8.3+
    const targetPhpLabel = isD12Active ? 'PHP 8.5+' : (hasD12 ? 'PHP 8.5+' : 'PHP 8.3+');

    if (isD12Active) {
      // Future era when Drupal 12 is released and primary
      // Supporting Drupal 12 (the active major) earns full core credit (18 pts).
      // D11 is LTS/deprecating; D12-only modules are not penalized.
      if (hasD12) {
        corePoints = 18;
        if (hasD11) {
          activeCorePoints = 12;
          ltsCorePoints = 6;
          summaryText = `Drupal 12: 12/12 · Drupal 11 (LTS): 6/6 · PHP 8.5+: ${phpPoints}/2`;
        } else {
          activeCorePoints = 18;
          ltsCorePoints = 0;
          summaryText = `Drupal 12 Only (Next-Gen Core): 18/18 · PHP 8.5+: ${phpPoints}/2`;
        }
      } else if (hasD11) {
        // D11 only (lacks D12): gets LTS core points (6 pts)
        corePoints = 6;
        activeCorePoints = 0;
        ltsCorePoints = 6;
        summaryText = `Drupal 12: 0/12 · Drupal 11 (LTS): 6/6 · ${targetPhpLabel}: ${phpPoints}/2`;
      } else {
        // Legacy (D10 or older in D12 era)
        corePoints = 0;
        activeCorePoints = 0;
        ltsCorePoints = 0;
        summaryText = `Drupal 12: 0/12 · Drupal 11: 0/6 · Legacy Core`;
      }
    } else {
      // Current era: Drupal 11 active, D12 upcoming, D10 leaving support in Nov 2026.
      // Supporting Drupal 11 (or upcoming D12) earns full core credit (18 pts).
      // D10 is leaving support; D11-only modules are not penalized.
      if (hasD12 || hasD11) {
        corePoints = 18;
        const primaryLabel = hasD12 ? (hasD11 ? 'Drupal 12/11' : 'Drupal 12 Only') : 'Drupal 11';
        if (hasD10) {
          activeCorePoints = 12;
          ltsCorePoints = 6;
          summaryText = `${primaryLabel}: 12/12 · Drupal 10 (EOL Nov '26): 6/6 · ${targetPhpLabel}: ${phpPoints}/2`;
        } else {
          activeCorePoints = 18;
          ltsCorePoints = 0;
          const displayLabel = hasD12 ? 'Drupal 12 (Forward-Ready)' : 'Drupal 11 Only (Modern Core)';
          summaryText = `${displayLabel}: 18/18 · ${targetPhpLabel}: ${phpPoints}/2`;
        }
      } else if (hasD10) {
        // D10 only (lacks D11 and D12): gets LTS core points (6 pts)
        corePoints = 6;
        activeCorePoints = 0;
        ltsCorePoints = 6;
        summaryText = `Drupal 11: 0/12 · Drupal 10 (EOL Nov '26): 6/6 · ${targetPhpLabel}: ${phpPoints}/2`;
      } else {
        // Legacy (D9 or older)
        corePoints = 0;
        activeCorePoints = 0;
        ltsCorePoints = 0;
        summaryText = `Drupal 11: 0/12 · Drupal 10: 0/6 · Legacy Core`;
      }
    }

    const modernityScore = Math.max(0, Math.min(20, corePoints + phpPoints));

    const modernityBreakdown = {
      drupal12: hasD12 ? (isD12Active ? activeCorePoints : 12) : 0,
      drupal11: hasD11 ? (isD12Active ? ltsCorePoints : activeCorePoints) : (hasD12 ? 18 : 0),
      drupal10: hasD10 ? (isD12Active ? 0 : ltsCorePoints) : 0,
      modernPhp: phpPoints,
      phpLabel: targetPhpLabel,
      supportsPhp85: hasPhp85,
      activeCore: activeCorePoints,
      ltsCore: ltsCorePoints,
      corePoints,
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
    let installPoints = 0;
    const installs = effectiveData.activeInstalls || 0;
    if (installs >= 20000) installPoints = 10;
    else if (installs >= 10000) installPoints = 9;
    else if (installs >= 1000) installPoints = 8;
    else if (installs >= 100) installPoints = 7;
    else if (installs >= 50) installPoints = 6;
    else if (installs >= 10) installPoints = 4;
    else if (installs >= 1) installPoints = 2;
    else {
      installPoints = effectiveData.isEmergingProject ? 2 : 0;
    }

    let contribPoints = 0;
    const maintainers = effectiveData.maintainersCount || 0;
    if (maintainers >= 3) contribPoints = 5;
    else if (maintainers === 2) contribPoints = 3;
    else if (maintainers === 1) contribPoints = 1;
    else contribPoints = 0;

    const adoptionBreakdown = {
      installs: installPoints,
      contributors: contribPoints
    };
    let adoptionScore = Math.max(0, Math.min(15, installPoints + contribPoints));

    // Total Score
    let totalScore = 0;
    let gradeLabel = 'Needs Attention';
    let gradeColor = '#dc2626'; // Crimson

    if (isDisqualified) {
      totalScore = 0;
      if (isObsolete) {
        gradeLabel = 'Obsolete';
      } else if (isUnsupported) {
        gradeLabel = 'Unsupported';
      } else {
        gradeLabel = 'Security Revoked';
      }
      gradeColor = '#dc2626';
    } else {
      let rawScore = securityScore + maintenanceScore + modernityScore + qualityScore + adoptionScore;

      // Cap at 50 if maintainers declared no further development
      if (devStatus.includes('no further')) {
        rawScore = Math.min(rawScore, 50);
      }

      totalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

      // Modern Benchmarking Labels (No academic school letter grades A/B/C/D)
      // Brand-new projects (<90 days) are explicitly labeled "Emerging"
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

    if (isDisqualified) {
      flags.unshift({
        type: 'critical',
        icon: 'alertCircle',
        text: gradeLabel,
        description: disclaimer.message
      });
    } else if (disclaimer) {
      flags.push({
        type: disclaimer.type === 'critical' ? 'critical' : (disclaimer.type === 'warning' ? 'warning' : 'positive'),
        icon: disclaimer.type === 'info' ? 'users' : 'alertCircle',
        text: disclaimer.title,
        description: disclaimer.message
      });
    }

    const recommendations = [];

    if (isDisqualified) {
      recommendations.push({
        topic: gradeLabel,
        action: isObsolete
          ? 'Use of this project is deprecated by its maintainers. Do not install on new projects; migrate to an actively maintained alternative.'
          : (isUnsupported
            ? 'Maintainers have marked this project as unsupported. Migrate to an active alternative or apply for project ownership on Drupal.org.'
            : 'Security coverage has been revoked due to an unpatched vulnerability. Remove this project immediately.')
      });
    } else {
      if (maintStatus.includes('minimally maintained')) {
        recommendations.push({
          topic: 'Minimally Maintained',
          action: 'The project is minimally maintained. Site builders should be prepared to maintain local patches or join as co-maintainer to help.'
        });
      }
      if (devStatus.includes('no further')) {
        recommendations.push({
          topic: 'No Further Development',
          action: 'No further development is planned. Plan ahead for future Drupal major versions by identifying an active replacement.'
        });
      }
      if (maintStatus.includes('seeking new maintainer')) {
        recommendations.push({
          topic: 'Seeking Maintainer',
          action: 'Maintainers are seeking a new owner. Community developers can apply via the Drupal.org project ownership process.'
        });
      }
    }

    // 1. Security & Trust Recommendations
    if (!effectiveData.isSecurityCovered && !isDisqualified) {
      recommendations.push({
        topic: 'Security Advisory',
        action: 'Releases are not covered by the Drupal Security Advisory policy. Maintainers can opt in via Drupal.org project settings (+16 pts); site builders should perform manual security audits.'
      });
    }
    if (maintainers === 1 && !effectiveData.isEmergingProject && !isDisqualified) {
      recommendations.push({
        topic: 'Bus Factor',
        action: 'Single maintainer identified. Onboard active contributors as co-maintainers on Drupal.org to safeguard continuity (+3 pts).'
      });
    }
    const sponsors = effectiveData.sponsorsCount || 0;
    if (sponsors === 0 && installs >= 1000 && !isDisqualified) {
      recommendations.push({
        topic: 'Sponsorship',
        action: 'No supporting organizations listed. Sponsoring organizations can link their Drupal.org profile to improve trust signals (+4 pts).'
      });
    }

    // 2. Maintenance & Velocity Recommendations
    if (daysAgo !== null && daysAgo > 180 && !isDisqualified) {
      const months = Math.floor(daysAgo / 30);
      recommendations.push({
        topic: 'Release Cadence',
        action: `Latest stable release (${effectiveData.activeVersion}) is over ${months} months old. Tagging a new release from the dev branch will ship accumulated bugfixes and recover up to +5 velocity points.`
      });
    }
    if (maintStatus.includes('seeking co-maintainer') && !isDisqualified) {
      recommendations.push({
        topic: 'Co-maintainer',
        action: 'Maintainers are actively seeking assistance. Community developers can apply in the Drupal.org issue queue.'
      });
    }
    if (!isDisqualified) {
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
            action: 'Missing Drupal 12 support. Update core_version_requirement to include ^12 in .info.yml and test against D12 core (+18 pts).'
          });
          if (!hasD11) {
            recommendations.push({
              topic: 'Drupal 11',
              action: 'Missing Drupal 11 LTS support. Run Upgrade Status or drupal-check to resolve deprecated APIs (+6 pts).'
            });
          }
        }
        if (!hasD12 && !hasModernPhp) {
          recommendations.push({
            topic: 'PHP 8.5+',
            action: 'Ensure codebase is tested against PHP 8.5+ runtimes (Drupal 12 baseline) to prevent runtime deprecation warnings (+2 pts).'
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
              action: 'Missing modern Drupal support. Update core_version_requirement to ^10 || ^11 in .info.yml and test against D11 core (+18 pts).'
            });
          }
        }
        // Never recommend adding legacy Drupal 10 if D11 or D12 is already supported
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
    }

    return {
      score: totalScore,
      gradeLabel,
      gradeColor,
      isDisqualified,
      disqualificationReason,
      disclaimer,
      activeVersion: effectiveData.activeVersion,
      lastReleaseDaysAgo: (typeof effectiveData.lastReleaseDaysAgo === 'number') ? effectiveData.lastReleaseDaysAgo : null,
      isEmergingProject: effectiveData.isEmergingProject,
      pillars: {
        security: {
          score: isDisqualified ? 0 : securityScore,
          max: 25,
          label: 'Security & Trust',
          breakdown: securityBreakdown
        },
        maintenance: {
          score: isDisqualified ? 0 : maintenanceScore,
          max: 25,
          label: 'Maintenance & Velocity',
          breakdown: maintenanceBreakdown
        },
        modernity: {
          score: isDisqualified ? 0 : modernityScore,
          max: 20,
          label: 'Modernity & Compatibility',
          breakdown: modernityBreakdown
        },
        quality: {
          score: isDisqualified ? 0 : qualityScore,
          max: 15,
          label: 'Code Quality & CI',
          breakdown: qualityBreakdown
        },
        adoption: {
          score: isDisqualified ? 0 : adoptionScore,
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
