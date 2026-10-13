/**
 * DropTrends DOM Extractor
 * Safely parses Drupal.org project pages (drupal.org/project/*) with zero external network calls.
 */

class DrupalDomExtractor {
  /**
   * Main entry point to extract module metadata from the active page DOM.
   * @param {Document} [doc=document] - DOM document
   * @returns {Object} Extracted RawModuleData
   */
  static extract(doc = document) {
    const pathname = (typeof window !== 'undefined' && window.location) ? window.location.pathname : '';
    const match = pathname.match(/\/project\/([a-zA-Z0-9_\-]+)/);
    const machineName = match ? match[1] : this.extractMachineNameFallback(doc);

    const title = this.extractTitle(doc, machineName);
    const isSecurityCovered = this.extractSecurityCoverage(doc);
    const activeInstalls = this.extractActiveInstalls(doc);
    const releases = this.extractReleaseInfo(doc);
    const compatibility = this.extractCompatibility(doc, releases);
    const maintenance = this.extractMaintenanceStatus(doc);
    const issues = this.extractIssuesCockpit(doc);
    const maintainers = this.extractMaintainers(doc);
    const sponsors = this.extractSupportingOrganizations(doc);
    const gitlab = this.extractGitLabInfo(doc, machineName);

    return {
      machineName,
      title,
      url: (typeof window !== 'undefined' && window.location) ? window.location.href : `https://www.drupal.org/project/${machineName}`,
      isSecurityCovered,
      activeInstalls,
      lastReleaseDate: releases.dateString,
      lastReleaseDaysAgo: releases.daysAgo,
      latestVersion: releases.version,
      composerCommand: releases.composerCommand,
      compatibilityStrings: compatibility.strings,
      supportsDrupal11: compatibility.supportsD11,
      supportsDrupal10: compatibility.supportsD10,
      modernPhpSupported: compatibility.modernPhp,
      isRecipeReady: compatibility.recipeReady,
      maintenanceStatus: maintenance.maintenanceStatus,
      developmentStatus: maintenance.developmentStatus,
      maintainersCount: maintainers.count,
      maintainerNames: maintainers.names,
      sponsorsCount: sponsors.count,
      sponsorNames: sponsors.names,
      openIssuesCount: issues.open,
      rtbcCount: issues.rtbc,
      totalIssuesCount: issues.total,
      openBugsCount: issues.openBugs,
      gitlabRepoUrl: gitlab.repoUrl,
      defaultBranch: gitlab.defaultBranch
    };
  }

  static extractMachineNameFallback(doc) {
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      const m = canonical.href.match(/\/project\/([a-zA-Z0-9_\-]+)/);
      if (m) return m[1];
    }
    const composerBox = doc.querySelector('.composer-command, textarea.drupalorg-copy');
    if (composerBox) {
      const m = composerBox.textContent.match(/drupal\/([a-zA-Z0-9_\-]+)/);
      if (m) return m[1];
    }
    return 'unknown_module';
  }

  static extractTitle(doc, fallback) {
    const heading = doc.querySelector('#page-title');
    if (heading) {
      // Remove img or sub elements text
      const clone = heading.cloneNode(true);
      const imgs = clone.querySelectorAll('img');
      imgs.forEach(i => i.remove());
      const text = clone.textContent.trim();
      if (text) return text;
    }
    return fallback;
  }

  static extractSecurityCoverage(doc) {
    // 1. Check shield icons
    const shieldImgs = doc.querySelectorAll('img[src*="shield-icon"], img[alt*="shield"]');
    if (shieldImgs.length > 0) return true;

    // 2. Check security class in release tables
    const securityCovered = doc.querySelectorAll('.security-covered, .field-security-advisory-coverage');
    if (securityCovered.length > 0) return true;

    // 3. Scan text in project-info
    const projectInfo = doc.querySelector('.project-info');
    if (projectInfo) {
      const text = projectInfo.textContent;
      if (text.includes('covered by the security advisory policy')) return true;
      if (text.includes('not covered by the security advisory policy')) return false;
    }

    return false;
  }

  static extractActiveInstalls(doc) {
    const projectInfo = doc.querySelector('.project-info');
    if (projectInfo) {
      const match = projectInfo.textContent.match(/([\d,]+)\s+sites\s+report\s+using\s+this\s+module/i);
      if (match) {
        return parseInt(match[1].replace(/,/g, ''), 10) || 0;
      }
    }
    // Fallback: search anywhere in body for sites report using
    const bodyText = doc.body ? doc.body.textContent : '';
    const match = bodyText.match(/([\d,]+)\s+sites\s+report\s+using\s+this\s+module/i);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10) || 0;
    }
    return 0;
  }

  static extractReleaseInfo(doc) {
    let version = null;
    let dateString = null;
    let daysAgo = null;
    let composerCommand = null;

    // Composer command
    const composerEl = doc.querySelector('textarea.drupalorg-copy-release, .composer-command');
    if (composerEl) {
      composerCommand = composerEl.value || composerEl.textContent.trim();
    }

    // Recommended release section
    const releaseRow = doc.querySelector('.view-drupalorg-project-downloads .release.stability-stable, .view-drupalorg-project-downloads .release');
    if (releaseRow) {
      const verLink = releaseRow.querySelector('.views-field-field-release-version a');
      if (verLink) {
        version = verLink.textContent.trim();
      }

      const createdSpan = releaseRow.querySelector('.views-field-created');
      if (createdSpan) {
        dateString = createdSpan.textContent.replace(/released/i, '').trim();
      }
    }

    // If no date found in release row, check dev release or time tags
    if (!dateString) {
      const devText = doc.querySelector('.release-info');
      if (devText) {
        const m = devText.textContent.match(/updated\s+([0-9]{1,2}\s+[a-zA-Z]{3}\s+[0-9]{4})/i);
        if (m) dateString = m[1];
      }
    }

    if (!dateString) {
      const updatedTime = doc.querySelector('.project-info time[pubdate]:last-of-type');
      if (updatedTime) {
        dateString = updatedTime.textContent.trim();
      }
    }

    if (dateString) {
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const now = new Date();
        const diffMs = now.getTime() - parsedDate.getTime();
        daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    return {
      version,
      dateString,
      daysAgo,
      composerCommand
    };
  }

  static extractCompatibility(doc, releases) {
    const strings = [];
    let supportsD11 = false;
    let supportsD10 = false;
    let modernPhp = false;
    let recipeReady = false;

    // Scan release table compatibility elements
    const compatElements = doc.querySelectorAll('.view-drupalorg-project-downloads .views-field, .view-drupalorg-project-downloads div');
    for (const el of compatElements) {
      const text = el.textContent.trim();
      if (text.includes('Works with Drupal:')) {
        strings.push(text);
        if (/\^11|~11|11\./.test(text)) supportsD11 = true;
        if (/\^10|~10|10\./.test(text)) supportsD10 = true;
      }
      if (/PHP\s*8\.[2-9]/.test(text)) {
        modernPhp = true;
      }
    }

    // General page text scan
    const pageText = doc.querySelector('#content') ? doc.querySelector('#content').textContent : (doc.body ? doc.body.textContent : '');
    if (pageText.includes('Drupal 11') || pageText.includes('^11')) {
      supportsD11 = true;
    }
    if (pageText.includes('Drupal 10') || pageText.includes('^10')) {
      supportsD10 = true;
    }
    if (/PHP\s*8\.[2-9]|PHP\s*8\.5/.test(pageText)) {
      modernPhp = true;
    }
    if (pageText.includes('recipe') || pageText.includes('Recipe') || pageText.includes('Drupal CMS')) {
      recipeReady = true;
    }

    return {
      strings,
      supportsD11,
      supportsD10,
      modernPhp,
      recipeReady
    };
  }

  static extractMaintenanceStatus(doc) {
    let maintenanceStatus = null;
    let developmentStatus = null;

    // Check project-info list items or sidebar terms
    const elements = doc.querySelectorAll('.project-info li, .region-sidebar-second .block, .taxonomy-terms');
    for (const el of elements) {
      const text = el.textContent;
      const maintMatch = text.match(/Maintenance status:\s*([^\n\r<]+)/i);
      if (maintMatch && !maintenanceStatus) {
        maintenanceStatus = maintMatch[1].trim();
      }

      const devMatch = text.match(/Development status:\s*([^\n\r<]+)/i);
      if (devMatch && !developmentStatus) {
        developmentStatus = devMatch[1].trim();
      }
    }

    return {
      maintenanceStatus,
      developmentStatus
    };
  }

  static extractIssuesCockpit(doc) {
    const cockpit = doc.querySelector('#block-project-issue-issue-cockpit');
    if (!cockpit) {
      return { open: null, rtbc: null, total: null, openBugs: null };
    }

    let open = null;
    let rtbc = null;
    let total = null;
    let openBugs = null;

    const allTotals = cockpit.querySelector('.issue-cockpit-All .issue-cockpit-totals');
    if (allTotals) {
      const text = allTotals.textContent;
      const openM = text.match(/([\d,]+)\s+open/i);
      if (openM) open = parseInt(openM[1].replace(/,/g, ''), 10);

      const rtbcM = text.match(/([\d,]+)\s+RTBC/i);
      if (rtbcM) rtbc = parseInt(rtbcM[1].replace(/,/g, ''), 10);

      const totalM = text.match(/([\d,]+)\s+total/i);
      if (totalM) total = parseInt(totalM[1].replace(/,/g, ''), 10);
    }

    const bugTotals = cockpit.querySelector('.issue-cockpit-1 .issue-cockpit-totals');
    if (bugTotals) {
      const text = bugTotals.textContent;
      const openBugM = text.match(/([\d,]+)\s+open/i);
      if (openBugM) openBugs = parseInt(openBugM[1].replace(/,/g, ''), 10);
    }

    return { open, rtbc, total, openBugs };
  }

  static extractMaintainers(doc) {
    const container = doc.querySelector('#block-drupalorg-project-maintainers');
    if (!container) {
      return { count: 0, names: [] };
    }
    const maintainerEls = container.querySelectorAll('.maintainer');
    const names = [];
    maintainerEls.forEach(el => {
      const name = el.textContent.trim();
      if (name) names.push(name);
    });

    return {
      count: maintainerEls.length || names.length,
      names
    };
  }

  static extractSupportingOrganizations(doc) {
    const sponsors = doc.querySelectorAll('.field-name-field-supporting-organizations .field-item, .field-name-field-supporting-organization');
    const names = [];
    sponsors.forEach(s => {
      const link = s.querySelector('a');
      if (link && link.textContent.trim()) {
        names.push(link.textContent.trim());
      }
    });

    return {
      count: sponsors.length || names.length,
      names
    };
  }

  static extractGitLabInfo(doc, machineName) {
    let repoUrl = `https://git.drupalcode.org/project/${machineName}`;
    let defaultBranch = null;

    const pipelineEl = doc.querySelector('p.pipeline-result');
    if (pipelineEl) {
      if (pipelineEl.dataset.repo) repoUrl = pipelineEl.dataset.repo;
      if (pipelineEl.dataset.version) defaultBranch = pipelineEl.dataset.version;
    }

    if (!defaultBranch) {
      const devRelease = doc.querySelector('.release-info p a[href*="-dev"]');
      if (devRelease) {
        const text = devRelease.textContent.trim(); // e.g. "8.x-1.x-dev"
        defaultBranch = text.replace(/-dev$/, '');
      }
    }

    return {
      repoUrl,
      defaultBranch: defaultBranch || '1.0.x'
    };
  }
}

function extractDrupalModuleData(doc) {
  return DrupalDomExtractor.extract(doc);
}

if (typeof globalThis !== 'undefined') {
  globalThis.DrupalDomExtractor = DrupalDomExtractor;
  globalThis.extractDrupalModuleData = extractDrupalModuleData;
}
