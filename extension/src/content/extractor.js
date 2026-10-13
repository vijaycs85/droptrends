/**
 * DropTrends DOM Extractor v1.3
 * Extracts project and version-level signals from Drupal.org project pages with core platform exclusion
 * and robust stable-first release prioritization (alpha/beta/rc pre-releases do not override stable).
 */

class DrupalDomExtractor {
  static isExcludedProject(machineName) {
    if (!machineName) return false;
    return ['drupal', 'drupal_cms', 'cms'].includes(machineName.toLowerCase());
  }

  /**
   * Main entry point to extract module metadata from the active page DOM.
   * @param {Document} [doc=document] - DOM document
   * @returns {Object|null} Extracted RawModuleData with multi-version details, or null if excluded
   */
  static extract(doc = document) {
    const pathname = (typeof window !== 'undefined' && window.location) ? window.location.pathname : '';
    const match = pathname.match(/\/project\/([a-zA-Z0-9_\-]+)/);
    const machineName = match ? match[1] : this.extractMachineNameFallback(doc);

    // If this is Drupal Core or Drupal CMS, immediately mark as excluded
    if (this.isExcludedProject(machineName)) {
      return {
        isExcluded: true,
        machineName,
        title: machineName === 'drupal' ? 'Drupal Core' : 'Drupal CMS'
      };
    }

    const title = this.extractTitle(doc, machineName);
    const projectType = this.extractProjectType(doc);
    const projectAge = this.extractProjectAge(doc);
    const releases = this.extractAllReleases(doc, machineName);

    // Prioritize the latest STABLE release as recommended
    const latestStableRelease = releases.find(r => r.isStable);
    const recommendedRelease = latestStableRelease || releases[0] || null;

    // Security coverage: if project has a covered stable release or general shield icon
    const isSecurityCovered = this.extractSecurityCoverage(doc, latestStableRelease);
    const activeInstalls = this.extractActiveInstalls(doc);
    const maintenance = this.extractMaintenanceStatus(doc);
    const issues = this.extractIssuesCockpit(doc);
    const maintainers = this.extractMaintainers(doc);
    const sponsors = this.extractSupportingOrganizations(doc);
    const gitlab = this.extractGitLabInfo(doc, machineName);

    const pageCompatibility = this.extractPageCompatibility(doc);

    return {
      isExcluded: false,
      machineName,
      title,
      projectType,
      createdDate: projectAge.createdDate,
      createdDaysAgo: projectAge.createdDaysAgo,
      isEmergingProject: (projectAge.createdDaysAgo !== null && projectAge.createdDaysAgo <= 90),
      url: (typeof window !== 'undefined' && window.location) ? window.location.href : `https://www.drupal.org/project/${machineName}`,
      isSecurityCovered,
      activeInstalls,
      hasStableRelease: Boolean(latestStableRelease),
      latestVersion: recommendedRelease?.version || null,
      lastReleaseDate: recommendedRelease?.dateString || null,
      lastReleaseDaysAgo: recommendedRelease?.daysAgo ?? null,
      composerCommand: recommendedRelease?.composerCommand || DrupalDomExtractor.generateComposerCommand(machineName, recommendedRelease?.version, recommendedRelease?.isStable),
      supportsDrupal11: recommendedRelease?.supportsD11 || pageCompatibility.supportsD11,
      supportsDrupal10: recommendedRelease?.supportsD10 || pageCompatibility.supportsD10,
      modernPhpSupported: recommendedRelease?.modernPhp || pageCompatibility.modernPhp,
      isRecipeReady: recommendedRelease?.recipeReady || pageCompatibility.recipeReady,
      compatibilityStrings: recommendedRelease?.compatibilityStrings || pageCompatibility.strings,
      releases,
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
      const clone = heading.cloneNode(true);
      const customElements = clone.querySelectorAll('#droptrends-root, img, .repository-logo');
      customElements.forEach(i => i.remove());
      const text = clone.textContent.trim();
      if (text) return text;
    }
    return fallback;
  }

  static extractProjectType(doc) {
    const breadcrumb = doc.querySelector('.breadbox, .breadcrumb');
    if (breadcrumb) {
      const text = breadcrumb.textContent.toLowerCase();
      if (text.includes('general projects') || text.includes('site templates')) return 'Site Template / Recipe';
      if (text.includes('themes')) return 'Theme';
      if (text.includes('distributions')) return 'Distribution';
    }
    const bodyClass = doc.body ? doc.body.className : '';
    if (bodyClass.includes('node-type-project-general')) return 'Site Template / Recipe';
    if (bodyClass.includes('node-type-project-theme')) return 'Theme';
    return 'Module';
  }

  static extractProjectAge(doc) {
    let createdDate = null;
    let createdDaysAgo = null;

    const createdEl = doc.querySelector('.project-info time[pubdate]:first-of-type, .project-info time:first-of-type');
    if (createdEl) {
      const dtAttr = createdEl.getAttribute('datetime');
      if (dtAttr) {
        const num = parseInt(dtAttr, 10);
        if (!isNaN(num) && num > 1000000000) {
          const date = new Date(num * 1000);
          createdDate = date.toISOString();
          const diffMs = Date.now() - date.getTime();
          createdDaysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
      }
      if (!createdDate && createdEl.textContent) {
        const parsed = new Date(createdEl.textContent.trim());
        if (!isNaN(parsed.getTime())) {
          createdDate = parsed.toISOString();
          const diffMs = Date.now() - parsed.getTime();
          createdDaysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
      }
    }

    return { createdDate, createdDaysAgo };
  }

  static extractSecurityCoverage(doc, latestStableRelease = null) {
    // If the latest stable release is covered, project has security advisory coverage
    if (latestStableRelease?.isSecurityCovered) return true;

    const shieldImgs = doc.querySelectorAll('img[src*="shield-icon"], img[alt*="shield"]');
    if (shieldImgs.length > 0) return true;

    const securityCovered = doc.querySelectorAll('.security-covered, .field-security-advisory-coverage');
    if (securityCovered.length > 0) return true;

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
    const bodyText = doc.body ? doc.body.textContent : '';
    const match = bodyText.match(/([\d,]+)\s+sites\s+report\s+using\s+this\s+module/i);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10) || 0;
    }
    return 0;
  }

  static extractAllReleases(doc, machineName = null) {
    const releases = [];
    const releaseElements = doc.querySelectorAll('.view-drupalorg-project-downloads .release');

    releaseElements.forEach((el) => {
      const verLink = el.querySelector('.views-field-field-release-version a');
      const version = verLink ? verLink.textContent.trim() : null;
      if (!version) return;

      const isExplicitStableClass = el.classList.contains('stability-stable');
      const isPreRelease = /-(alpha|beta|rc|dev)/i.test(version);
      const isStable = isExplicitStableClass || !isPreRelease;

      const isSecurityCovered = el.classList.contains('security-covered') || Boolean(el.querySelector('img[src*="shield-icon"]'));

      const createdSpan = el.querySelector('.views-field-created');
      let dateString = createdSpan ? createdSpan.textContent.replace(/released/i, '').trim() : null;

      if (!dateString) {
        const m = el.textContent.match(/updated\s+([0-9]{1,2}\s+[a-zA-Z]{3}\s+[0-9]{4})/i);
        if (m) dateString = m[1];
      }

      let daysAgo = null;
      if (dateString) {
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) {
          daysAgo = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }

      let composerCommand = null;
      const composerEl = el.querySelector('textarea.drupalorg-copy-release, .composer-command');
      if (composerEl) {
        composerCommand = composerEl.value || composerEl.textContent.trim();
      }
      if (!composerCommand && machineName && version) {
        composerCommand = DrupalDomExtractor.generateComposerCommand(machineName, version, isStable);
      }

      const rowText = el.textContent;
      const compatStrings = [];
      let supportsD11 = false;
      let supportsD10 = false;
      let modernPhp = false;
      let recipeReady = false;

      const worksWithMatch = rowText.match(/Works with Drupal:\s*([^\n\r<]+)/i);
      if (worksWithMatch) {
        const str = worksWithMatch[1].trim();
        compatStrings.push(str);
        if (/\^11|~11|11\./.test(str)) supportsD11 = true;
        if (/\^10|~10|10\./.test(str)) supportsD10 = true;
      }

      if (/\bdrupal11\b|\bdrupal-11\b|\bDrupal 11\b|\^11\b/.test(rowText)) supportsD11 = true;
      if (/\bdrupal10\b|\bdrupal-10\b|\bDrupal 10\b|\^10\b/.test(rowText)) supportsD10 = true;
      if (/PHP\s*8\.[2-9]/.test(rowText)) modernPhp = true;
      if (/recipe|drupal cms/i.test(rowText)) recipeReady = true;

      const pipelineEl = el.querySelector('p.pipeline-result');
      const branch = pipelineEl?.dataset?.version || version.replace(/-dev$/, '');

      releases.push({
        version,
        isStable,
        isRecommended: false, // will be marked after all releases parsed
        isSecurityCovered,
        dateString,
        daysAgo,
        composerCommand,
        compatibilityStrings: compatStrings,
        supportsD11,
        supportsD10,
        modernPhp,
        recipeReady,
        branch,
        releaseUrl: verLink?.href || null,
        el
      });
    });

    // Mark recommended: First stable release, or first release if no stable exists
    const firstStable = releases.find(r => r.isStable);
    if (firstStable) {
      firstStable.isRecommended = true;
    } else if (releases.length > 0) {
      releases[0].isRecommended = true;
    }

    return releases;
  }

  /**
   * Generates a canonical Composer command for a Drupal module release.
   */
  static generateComposerCommand(machineName, version, isStable = true) {
    if (!machineName) return '';
    if (!version) return `composer require drupal/${machineName}`;

    const cleanVer = version.trim();
    // Semantic versioning match: 2.6.0, 1.0.4, 2.7.0-alpha2, etc.
    const semver = cleanVer.match(/^(\d+)\.(\d+)(?:\.\d+)?(.*)$/);
    if (semver) {
      const major = semver[1];
      const minor = semver[2];
      const extra = semver[3]; // e.g. -alpha2, -beta1, -rc1, -dev
      if (!extra && isStable) {
        return `composer require 'drupal/${machineName}:^${major}.${minor}'`;
      }
      return `composer require 'drupal/${machineName}:${cleanVer}'`;
    }

    // Legacy Drupal format: 8.x-1.2, 7.x-2.0
    const legacy = cleanVer.match(/^\d+\.x-(\d+)(?:\.(\d+))?(.*)$/);
    if (legacy) {
      const major = legacy[1];
      const extra = legacy[3];
      if (!extra && isStable) {
        return `composer require 'drupal/${machineName}:^${major}'`;
      }
      return `composer require 'drupal/${machineName}:${cleanVer}'`;
    }

    return `composer require 'drupal/${machineName}:${cleanVer}'`;
  }

  static extractPageCompatibility(doc) {
    const pageText = doc.querySelector('#content') ? doc.querySelector('#content').textContent : (doc.body ? doc.body.textContent : '');
    const strings = [];

    let supportsD11 = false;
    let supportsD10 = false;
    let modernPhp = false;
    let recipeReady = false;

    if (/\bdrupal11\b|\bdrupal-11\b|\bDrupal 11\b|\^11\b|\bcore: \^11\b/.test(pageText)) {
      supportsD11 = true;
      strings.push('Drupal 11');
    }
    if (/\bdrupal10\b|\bdrupal-10\b|\bDrupal 10\b|\^10\b|\bcore: \^10\b/.test(pageText)) {
      supportsD10 = true;
      strings.push('Drupal 10');
    }
    if (/PHP\s*8\.[2-9]|PHP\s*8\.5/.test(pageText)) {
      modernPhp = true;
    }
    if (/recipe|Recipe|Drupal CMS|Site template/i.test(pageText)) {
      recipeReady = true;
    }

    return { strings, supportsD11, supportsD10, modernPhp, recipeReady };
  }

  static extractMaintenanceStatus(doc) {
    let maintenanceStatus = null;
    let developmentStatus = null;

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

    return { maintenanceStatus, developmentStatus };
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
        const text = devRelease.textContent.trim();
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
