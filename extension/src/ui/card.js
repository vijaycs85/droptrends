/**
 * DropTrends Shadow DOM UI Overlay v1.4
 * Modern Linear-grade compact design with objective sentiment ratings (no academic letter grades)
 * and intelligent stable vs pre-release tags.
 */

class DropTrendsUI {
  /**
   * Safely parses and injects HTML content via DOMParser, avoiding raw innerHTML assignment.
   * @param {Element} element
   * @param {string} htmlString
   */
  static setSafeHTML(element, htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    element.replaceChildren(...Array.from(doc.body.childNodes));
  }

  /**
   * Programmatically opens the slide-out detail drawer.
   * @returns {boolean} True if drawer was found and opened.
   */
  static openDrawer() {
    const root = document.getElementById('droptrends-root');
    if (!root || !root.shadowRoot) return false;
    const modal = root.shadowRoot.querySelector('.dt-modal-overlay');
    if (modal) {
      modal.classList.add('dt-active');
      document.body.style.overflow = 'hidden';
      return true;
    }
    return false;
  }

  /**
   * Mounts DropTrends UI to the page.
   * @param {Object} rawData - Extracted module data
   * @param {Object} evaluation - Evaluated DropScore report
   */
  static mount(rawData, evaluation) {
    const existing = document.getElementById('droptrends-root');
    if (existing) existing.remove();

    const rootHost = document.createElement('div');
    rootHost.id = 'droptrends-root';
    rootHost.style.display = 'inline-flex';
    rootHost.style.verticalAlign = 'middle';
    rootHost.style.marginLeft = '12px';

    const shadow = rootHost.attachShadow({ mode: 'open' });

    // Stylesheet
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    shadow.appendChild(style);

    let currentVersion = evaluation.activeVersion || rawData.latestVersion || 'Latest';
    let currentEvaluation = evaluation;
    let isExpandedView = false;
    let currentInsightFilter = 'all';

    const icons = globalThis.DropIcons || {};

    // Header Health Pill (28px height, numerical score only, no letter grades)
    const pill = document.createElement('div');
    pill.className = 'dt-pill';
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('title', `DropScore: ${currentEvaluation.score}/100 (${currentEvaluation.gradeLabel}). Click for detailed breakdown.`);

    const renderPillContent = (evalData) => {
      const isCovered = evalData.pillars.security.breakdown.coverage > 0;
      const isD12 = (evalData.pillars.modernity.breakdown.drupal12 || 0) > 0;
      const isD11 = (evalData.pillars.modernity.breakdown.drupal11 || 0) > 0;
      const isD10 = (evalData.pillars.modernity.breakdown.drupal10 || 0) > 0;

      const shieldIcon = isCovered
        ? icons.shieldCheck({ size: 13, color: '#047857' })
        : icons.shieldAlert({ size: 13, color: '#b45309' });

      const d12Icon = icons.rocket({ size: 13, color: '#6d28d9' });
      const d11Icon = icons.rocket({ size: 13, color: '#1d4ed8' });

      return `
        <div class="dt-seg dt-seg-brand">
          ${icons.drop({ size: 13 })}
          <span class="dt-brand-title">DropScore</span>
          <div class="dt-score-badge" style="background-color: ${evalData.gradeColor}">
            <span>${evalData.score}</span>
          </div>
        </div>

        <div class="dt-seg dt-seg-sec">
          <span class="dt-chip ${isCovered ? 'dt-chip-sec' : 'dt-chip-warn'}">
            ${shieldIcon}
            <span>${isCovered ? 'Covered' : 'No Shield'}</span>
          </span>
        </div>

        <div class="dt-seg dt-seg-compat">
          ${isD12
            ? `<span class="dt-chip dt-chip-d12">${d12Icon}<span>D12</span></span>`
            : (isD11
              ? `<span class="dt-chip dt-chip-d11">${d11Icon}<span>D11</span></span>`
              : (isD10
                ? `<span class="dt-chip dt-chip-d10-eol" title="Drupal 10 reaches End-of-Life in November 2026">${icons.clock({ size: 11, color: '#b45309' })}<span>D10 (EOL Nov)</span></span>`
                : '<span class="dt-chip dt-chip-legacy"><span>Legacy</span></span>'
              )
            )
          }
        </div>

        <div class="dt-seg dt-seg-ver">
          <span class="dt-ver-text">${this.escapeHTML(currentVersion)}</span>
          ${icons.chevronDown({ size: 10, color: '#94a3b8' })}
        </div>
      `;
    };

    this.setSafeHTML(pill, renderPillContent(currentEvaluation));

    // Modal Drawer (Linear-grade, ultra-compact)
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'dt-modal-overlay';

    const renderDrawerContent = (evalData, selectedVer) => {
      const activeRel = rawData.releases?.find(r => r.version === selectedVer) || rawData.releases?.[0] || null;
      const composerCmd = activeRel?.composerCommand 
        || (typeof DrupalDomExtractor !== 'undefined' ? DrupalDomExtractor.generateComposerCommand(rawData.machineName, activeRel?.version, activeRel?.isStable) : null)
        || rawData.composerCommand
        || `composer require drupal/${rawData.machineName}`;

      const insights = DropTrendsUI.generateLighthouseInsights(evalData, rawData, activeRel);
      const warnCount = insights.filter(i => i.severity === 'critical' || i.severity === 'warning').length;
      const passCount = insights.filter(i => i.severity === 'passed').length;

      return `
        <div class="dt-drawer" role="dialog" aria-modal="true" aria-label="DropScore Breakdown">
          <!-- Top Header Strip (Two-Tier Clean Hierarchy) -->
          <div class="dt-drawer-header">
            <!-- Row 1: Brand, Namespace, Project Type Badge & Close Button -->
            <div class="dt-header-top-row">
              <div class="dt-header-breadcrumbs">
                <span class="dt-brand-tag">${icons.drop({ size: 14 })}<span>DropTrends</span></span>
                <span class="dt-meta-sep">/</span>
                <span class="dt-machine-tag">drupal/${this.escapeHTML(rawData.machineName)}</span>
                ${rawData.projectType ? `<span class="dt-type-badge">${this.escapeHTML(rawData.projectType)}</span>` : ''}
              </div>
              <button class="dt-close-btn" aria-label="Close dialog" title="Close dialog">
                ${icons.x({ size: 16, color: '#64748b' })}
              </button>
            </div>

            <!-- Row 2: Title & Metrics Lockup + Dedicated Score Card -->
            <div class="dt-header-main-row">
              <div class="dt-header-title-block">
                <div class="dt-drawer-title-row">
                  <h2 class="dt-drawer-title" title="${this.escapeHTML(rawData.title)}">${this.escapeHTML(rawData.title)}</h2>
                  <a href="https://git.drupalcode.org/project/${encodeURIComponent(rawData.machineName)}" target="_blank" rel="noopener" class="dt-gitlab-link" title="Open repository on DrupalCode GitLab" aria-label="GitLab Repository">
                    ${icons.gitlab({ size: 14, color: '#e24329' })}
                    <span>GitLab</span>
                    ${icons.externalLink({ size: 10, color: '#64748b' })}
                  </a>
                </div>
                <div class="dt-header-meta-row">
                  ${(rawData.activeInstalls && rawData.activeInstalls > 0)
                    ? `<span class="dt-meta-installs">${rawData.activeInstalls.toLocaleString()} active installations</span>`
                    : (evalData.isEmergingProject
                        ? `<span class="dt-meta-emerging">${icons.sprout({ size: 12, color: '#047857' })} Emerging Project (0 installs)</span>`
                        : '<span class="dt-meta-installs">0 installations reported</span>'
                      )
                  }
                </div>
              </div>

              <!-- Lighthouse Hero Score Circle Lockup -->
              <div class="dt-hero-score-lockup" title="DropScore: ${evalData.score}/100 (${evalData.gradeLabel})">
                <div class="dt-hero-gauge-dial">
                  <svg class="dt-hero-gauge-svg" width="54" height="54" viewBox="0 0 54 54">
                    <circle cx="27" cy="27" r="23" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"></circle>
                    <circle cx="27" cy="27" r="23" fill="transparent" stroke="${evalData.gradeColor}" stroke-width="4"
                      stroke-dasharray="144.51"
                      stroke-dashoffset="${(144.51 * (1 - Math.min(100, Math.max(0, evalData.score)) / 100)).toFixed(2)}"
                      stroke-linecap="round"
                      transform="rotate(-90 27 27)">
                    </circle>
                  </svg>
                  <span class="dt-hero-score-val" style="color: ${evalData.gradeColor}">${evalData.score}</span>
                </div>
                <div class="dt-grade-chip" style="background-color: ${evalData.gradeColor}">
                  ${evalData.isEmergingProject ? `${icons.sprout({ size: 10, color: '#ffffff' })} ` : ''}${evalData.gradeLabel}
                </div>
              </div>
            </div>
          </div>

          <!-- Action & Release Strip (Two-tier: Release Switcher + Full-Width Composer Bar) -->
          <div class="dt-action-strip">
            <!-- Release Selector -->
            ${(rawData.releases && rawData.releases.length > 0) ? `
              <div class="dt-release-row">
                <span class="dt-release-lead">Release:</span>
                <div class="dt-release-buttons">
                  ${rawData.releases.slice(0, 4).map(r => `
                    <button class="dt-rel-btn ${r.version === selectedVer ? 'dt-rel-active' : ''}" data-version="${this.escapeHTML(r.version)}" title="${this.escapeHTML(r.version)} (${r.isStable ? 'Stable release' : 'Pre-release'})">
                      <span class="dt-rel-vname">${this.escapeHTML(r.version)}</span>
                      <span class="dt-rel-tag ${r.isStable ? 'dt-tag-stable' : 'dt-tag-pre'}">${r.isStable ? 'Stable' : 'Pre'}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Dedicated Full-Width Composer Command Bar -->
            ${composerCmd ? `
              <div class="dt-composer-bar" title="Click to copy Composer command">
                <div class="dt-composer-content">
                  <span class="dt-composer-prompt">$</span>
                  <code class="dt-composer-code" title="${this.escapeHTML(composerCmd)}">${this.escapeHTML(composerCmd)}</code>
                </div>
                <button class="dt-copy-btn" title="Copy command to clipboard" aria-label="Copy composer command">
                  <span class="dt-copy-icon-wrap">${icons.copy({ size: 12, color: 'currentColor' })}</span>
                  <span class="dt-copy-label">Copy</span>
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Top Lighthouse Category Gauges Overview -->
          <div class="dt-lighthouse-bar">
            ${DropTrendsUI.renderLighthouseGauge(evalData.pillars.security.score, 25, 'Security', 'dt-pillar-sec')}
            ${DropTrendsUI.renderLighthouseGauge(evalData.pillars.maintenance.score, 25, 'Velocity', 'dt-pillar-maint')}
            ${DropTrendsUI.renderLighthouseGauge(evalData.pillars.modernity.score, 20, 'Modernity', 'dt-pillar-mod')}
            ${DropTrendsUI.renderLighthouseGauge(evalData.pillars.quality.score, 15, 'Quality', 'dt-pillar-qual')}
            ${DropTrendsUI.renderLighthouseGauge(evalData.pillars.adoption.score, 15, 'Community', 'dt-pillar-adopt')}
          </div>

          <!-- Drawer Body -->
          <div class="dt-drawer-body">
            ${evalData.disclaimer ? `
              <div class="dt-disclaimer dt-disclaimer-${evalData.disclaimer.type}">
                <div class="dt-disclaimer-icon">
                  ${evalData.disclaimer.type === 'critical'
                    ? icons.alertCircle({ size: 16, color: '#dc2626' })
                    : (evalData.disclaimer.type === 'warning'
                      ? icons.clock({ size: 16, color: '#d97706' })
                      : icons.users({ size: 16, color: '#2563eb' }))
                  }
                </div>
                <div class="dt-disclaimer-content">
                  <span class="dt-disclaimer-title">${this.escapeHTML(evalData.disclaimer.title)}</span>
                  <span class="dt-disclaimer-text">${this.escapeHTML(evalData.disclaimer.message)}</span>
                </div>
              </div>
            ` : ''}

            <!-- 5 Objective Pillars (Unified High-Density Scorecard) -->
            <div class="dt-scorecard ${isExpandedView ? 'dt-expanded-view' : ''}">
              <div class="dt-scorecard-header">
                <div class="dt-sc-header-left">
                  <span class="dt-scorecard-title">Objective Pillars</span>
                  <span class="dt-scorecard-pts">${evalData.isDisqualified ? 'Disqualified (0 / 100)' : `${evalData.score} / 100 Points`}</span>
                </div>
                <button type="button" class="dt-view-toggle-btn" id="dt-toggle-details-btn" aria-expanded="${isExpandedView ? 'true' : 'false'}">
                  ${isExpandedView ? 'Collapse view' : 'Expand view'}
                </button>
              </div>
              <div class="dt-scorecard-rows">
                ${DropTrendsUI.renderPillarRow(
                  'dt-pillar-sec',
                  evalData.pillars.security.breakdown.coverage > 0
                    ? icons.shieldCheck({ size: 14, color: '#059669' })
                    : icons.shieldAlert({ size: 14, color: '#b45309' }),
                  'Security & Trust',
                  evalData.pillars.security.score,
                  25,
                  [
                    {
                      text: `Advisory: ${evalData.pillars.security.breakdown.coverage}/16`,
                      tooltip: evalData.pillars.security.breakdown.coverage > 0
                        ? 'Security Advisory Coverage: 16/16 pts (Covered under Drupal Security Advisory policy)'
                        : 'Security Advisory Coverage: 0/16 pts (No advisory coverage; manual security audit recommended)'
                    },
                    {
                      text: `Maintainers: ${evalData.pillars.security.breakdown.maintainers}/5`,
                      tooltip: `Maintainer Breadth: ${evalData.pillars.security.breakdown.maintainers}/5 pts (${rawData.maintainersCount || 1} maintainers listed)`
                    },
                    {
                      text: `Sponsors: ${evalData.pillars.security.breakdown.sponsors}/4`,
                      tooltip: `Organization Sponsorship: ${evalData.pillars.security.breakdown.sponsors}/4 pts (${rawData.sponsorsCount || 0} supporting organizations)`
                    }
                  ]
                )}
                ${DropTrendsUI.renderPillarRow(
                  'dt-pillar-maint',
                  icons.zap({ size: 14, color: '#d97706' }),
                  'Maintenance & Velocity',
                  evalData.pillars.maintenance.score,
                  25,
                  [
                    {
                      text: `Status: ${evalData.pillars.maintenance.breakdown.statusLabel || 'Active'} (${evalData.pillars.maintenance.breakdown.status}/10)`,
                      tooltip: `Maintenance Status: ${evalData.pillars.maintenance.breakdown.statusLabel || 'Active'} (${evalData.pillars.maintenance.breakdown.status}/10 pts)`
                    },
                    {
                      text: `Recency: ${evalData.pillars.maintenance.breakdown.recency}/8`,
                      tooltip: (() => {
                        const relDaysAgo = (activeRel && typeof activeRel.daysAgo === 'number')
                          ? activeRel.daysAgo
                          : ((typeof evalData.lastReleaseDaysAgo === 'number')
                            ? evalData.lastReleaseDaysAgo
                            : (typeof rawData.lastReleaseDaysAgo === 'number' ? rawData.lastReleaseDaysAgo : null));
                        const daysText = (relDaysAgo !== null && typeof relDaysAgo === 'number' && !isNaN(relDaysAgo))
                          ? (relDaysAgo === 0 ? ', published today' : `, published ${relDaysAgo} days ago`)
                          : '';
                        return `Release Recency: ${evalData.pillars.maintenance.breakdown.recency}/8 pts (Active release ${evalData.activeVersion || selectedVer || 'latest'}${daysText})`;
                      })()
                    },
                    {
                      text: `Queue: ${evalData.pillars.maintenance.breakdown.issues}/7`,
                      tooltip: (() => {
                        const total = rawData.totalIssuesCount || 0;
                        const open = (typeof rawData.openIssuesCount === 'number') ? rawData.openIssuesCount : null;
                        const bugs = (typeof rawData.openBugsCount === 'number') ? rawData.openBugsCount : 0;
                        const rtbc = rawData.rtbcCount || 0;
                        const pts = evalData.pillars.maintenance.breakdown.issues;
                        if (total > 0 && open === 0) {
                          return `Issue Queue: ${pts}/7 pts (Inbox Zero: All ${total} issues resolved)`;
                        }
                        if (total > 0 && bugs === 0) {
                          return `Issue Queue: ${pts}/7 pts (Zero open bugs across ${total} total issues)`;
                        }
                        if (total === 0) {
                          return `Issue Queue: ${pts}/7 pts (Clean queue: No issues reported)`;
                        }
                        return `Issue Queue Activity: ${pts}/7 pts (${rtbc} RTBC patches, ${bugs} open bugs / ${total} total issues)`;
                      })()
                    }
                  ]
                )}
                ${DropTrendsUI.renderPillarRow(
                  'dt-pillar-mod',
                  icons.rocket({ size: 14, color: '#2563eb' }),
                  'Modernity & Compatibility',
                  evalData.pillars.modernity.score,
                  20,
                  (() => {
                    const modItems = [];
                    const b = evalData.pillars.modernity.breakdown;
                    if (b.drupal12 > 0) {
                      modItems.push({
                        text: `Drupal 12: ${b.drupal12}/12`,
                        tooltip: 'Drupal 12: 12/12 pts (Forward-compatible with upcoming Drupal 12 core)'
                      });
                    }
                    if (b.drupal11 > 0) {
                      const maxD11 = b.drupal10 > 0 ? 12 : (b.corePoints || 18);
                      modItems.push({
                        text: `Drupal 11: ${b.drupal11}/${maxD11}`,
                        tooltip: `Drupal 11: ${b.drupal11}/${maxD11} pts (Compatible with current Drupal 11 core)`
                      });
                    } else if (!b.drupal12) {
                      modItems.push({
                        text: 'Drupal 11: 0/12',
                        tooltip: 'Drupal 11: 0/12 pts (Lacks Drupal 11 core compatibility)'
                      });
                    }
                    if (b.drupal10 > 0) {
                      modItems.push({
                        text: `Drupal 10 (EOL Nov '26): ${b.drupal10}/6`,
                        tooltip: 'Drupal 10: 6/6 pts (Compatible with Drupal 10; reaches End of Life in November 2026)'
                      });
                    }
                    modItems.push({
                      text: `${b.phpLabel || 'PHP 8.3+'}: ${b.modernPhp}/2`,
                      tooltip: `${b.phpLabel || 'PHP 8.3+'}: ${b.modernPhp}/2 pts (Minimum tested PHP runtime)`
                    });
                    return modItems;
                  })()
                )}
                ${DropTrendsUI.renderPillarRow(
                  'dt-pillar-qual',
                  icons.flask({ size: 14, color: '#0891b2' }),
                  'Code Quality & CI',
                  evalData.pillars.quality.score,
                  15,
                  [
                    {
                      text: `GitLab CI: ${evalData.pillars.quality.breakdown.pipeline}/10`,
                      tooltip: `GitLab CI Pipeline: ${evalData.pillars.quality.breakdown.pipeline}/10 pts (Pipeline status: ${rawData.gitlabPipelineStatus || 'unknown'})`
                    },
                    {
                      text: `Tests: ${evalData.pillars.quality.breakdown.tests}/5`,
                      tooltip: evalData.pillars.quality.breakdown.tests >= 5
                        ? 'Automated Test Suite: 5/5 pts (PHPUnit kernel/functional tests detected)'
                        : 'Automated Test Suite: 2/5 pts (No automated tests detected)'
                    }
                  ]
                )}
                ${(() => {
                  const installCount = rawData.activeInstalls || 0;
                  const installLabel = installCount > 0
                    ? `${installCount.toLocaleString()} sites`
                    : (evalData.isEmergingProject ? 'Emerging grace' : '0 sites');
                  const maintCount = rawData.maintainersCount || 1;
                  const maintLabel = `${maintCount} maintainer${maintCount > 1 ? 's' : ''}`;
                  return DropTrendsUI.renderPillarRow(
                    'dt-pillar-adopt',
                    icons.users({ size: 14, color: '#4f46e5' }),
                    'Adoption & Community',
                    evalData.pillars.adoption.score,
                    15,
                    [
                      {
                        text: `Installs: ${installLabel} (${evalData.pillars.adoption.breakdown.installs}/10)`,
                        tooltip: `Active Installations: ${evalData.pillars.adoption.breakdown.installs}/10 pts (${installCount.toLocaleString()} active reported sites)`
                      },
                      {
                        text: `${maintLabel} (${evalData.pillars.adoption.breakdown.contributors}/5)`,
                        tooltip: `Maintainers: ${evalData.pillars.adoption.breakdown.contributors}/5 pts (${maintCount} community maintainers)`
                      }
                    ]
                  );
                })()}
              </div>
            </div>

            <!-- Lighthouse-Style Insights Section -->
            <div class="dt-section dt-insights-section">
              <div class="dt-insights-header-wrap">
                <span class="dt-section-label">Insights</span>
                <div class="dt-insights-filters">
                  <button type="button" class="dt-insight-filter-btn ${currentInsightFilter === 'all' ? 'dt-filter-active' : ''}" data-filter="all">All (${insights.length})</button>
                  ${warnCount > 0 ? `<button type="button" class="dt-insight-filter-btn ${currentInsightFilter === 'needs-attention' ? 'dt-filter-active' : ''}" data-filter="needs-attention">Needs Attention (${warnCount})</button>` : ''}
                  <button type="button" class="dt-insight-filter-btn ${currentInsightFilter === 'passed' ? 'dt-filter-active' : ''}" data-filter="passed">Passed (${passCount})</button>
                </div>
              </div>

              <div class="dt-insights-list">
                ${insights.map((ins, idx) => {
                  const isVisible = currentInsightFilter === 'all'
                    || (currentInsightFilter === 'needs-attention' && (ins.severity === 'critical' || ins.severity === 'warning'))
                    || (currentInsightFilter === 'passed' && ins.severity === 'passed');
                  return `
                    <div class="dt-insight-item dt-insight-${ins.severity} ${isVisible ? '' : 'dt-hidden'}" data-severity="${ins.severity}">
                      <button type="button" class="dt-insight-btn" aria-expanded="false" data-index="${idx}">
                        <div class="dt-insight-left">
                          <span class="dt-insight-shape dt-shape-${ins.severity}">
                            ${ins.severity === 'critical'
                              ? `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1.5L11 10.5H1L6 1.5Z" fill="#dc2626"/></svg>`
                              : (ins.severity === 'warning'
                                ? `<svg width="11" height="11" viewBox="0 0 11 11"><rect width="11" height="11" rx="1.5" fill="#d97706"/></svg>`
                                : `<svg width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="5.5" r="5" fill="#059669"/></svg>`
                              )
                            }
                          </span>
                          <span class="dt-insight-title">${this.escapeHTML(ins.title)}</span>
                          ${ins.subtitle ? `<span class="dt-insight-sub">— ${this.escapeHTML(ins.subtitle)}</span>` : ''}
                        </div>
                        <span class="dt-insight-caret">${icons.chevronDown({ size: 11, color: '#64748b' })}</span>
                      </button>
                      <div class="dt-insight-body">
                        <p class="dt-insight-desc">${this.escapeHTML(ins.description)}</p>
                        ${ins.action ? `
                          <div class="dt-insight-action">
                            <span class="dt-insight-action-tag">Action:</span>
                            <span class="dt-insight-action-text">${this.escapeHTML(ins.action)}</span>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Drawer Footer -->
          <div class="dt-drawer-footer">
            <span>Made with ❤️ by <a href="https://www.drupal.org/u/vijaycs85" target="_blank" rel="noopener" class="dt-author-link">vijaycs85</a></span>
          </div>
        </div>
      `;
    };

    this.setSafeHTML(modalOverlay, renderDrawerContent(currentEvaluation, currentVersion));
    shadow.appendChild(pill);
    shadow.appendChild(modalOverlay);

    // Event handlers
    const setupEvents = () => {
      const openModal = () => {
        modalOverlay.classList.add('dt-active');
        document.body.style.overflow = 'hidden';
      };

      const closeModal = () => {
        modalOverlay.classList.remove('dt-active');
        document.body.style.overflow = '';
      };

      pill.onclick = openModal;
      pill.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      };

      const closeBtn = modalOverlay.querySelector('.dt-close-btn');
      if (closeBtn) closeBtn.onclick = closeModal;

      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) closeModal();
      };

      // Version switcher buttons
      const verButtons = modalOverlay.querySelectorAll('.dt-rel-btn');
      verButtons.forEach(btn => {
        btn.onclick = () => {
          const selectedVer = btn.dataset.version;
          currentVersion = selectedVer;
          currentEvaluation = DropScoreEngine.evaluate(rawData, selectedVer);

          this.setSafeHTML(modalOverlay, renderDrawerContent(currentEvaluation, currentVersion));
          this.setSafeHTML(pill, renderPillContent(currentEvaluation));
          setupEvents();
          modalOverlay.classList.add('dt-active');
        };
      });

      // Copy Composer Command
      const composerBar = modalOverlay.querySelector('.dt-composer-bar');
      if (composerBar) {
        const copyBtn = composerBar.querySelector('.dt-copy-btn');
        const copyLabel = composerBar.querySelector('.dt-copy-label');
        const copyIconWrap = composerBar.querySelector('.dt-copy-icon-wrap');

        composerBar.onclick = async () => {
          const activeRel = rawData.releases?.find(r => r.version === currentVersion) || rawData.releases?.[0];
          const cmd = activeRel?.composerCommand 
            || (typeof DrupalDomExtractor !== 'undefined' ? DrupalDomExtractor.generateComposerCommand(rawData.machineName, activeRel?.version, activeRel?.isStable) : null)
            || rawData.composerCommand
            || `composer require drupal/${rawData.machineName}`;
          if (cmd) {
            try {
              await navigator.clipboard.writeText(cmd);
              if (copyBtn) copyBtn.classList.add('dt-copied');
              if (copyLabel) copyLabel.textContent = 'Copied!';
              if (copyIconWrap) this.setSafeHTML(copyIconWrap, icons.check({ size: 12, color: '#ffffff' }));
              setTimeout(() => {
                if (copyBtn) copyBtn.classList.remove('dt-copied');
                if (copyLabel) copyLabel.textContent = 'Copy';
                if (copyIconWrap) this.setSafeHTML(copyIconWrap, icons.copy({ size: 12, color: 'currentColor' }));
              }, 2000);
            } catch (err) {
              console.warn('[DropTrends] Clipboard write failed:', err);
            }
          }
        };
      }

      // Lighthouse Top Gauges smooth scroll jump
      const gaugeItems = modalOverlay.querySelectorAll('.dt-gauge-item');
      gaugeItems.forEach(item => {
        const handleJump = () => {
          const targetId = item.dataset.target;
          const targetEl = modalOverlay.querySelector(`#${targetId}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            targetEl.classList.remove('dt-pillar-highlight');
            void targetEl.offsetWidth;
            targetEl.classList.add('dt-pillar-highlight');
            setTimeout(() => {
              targetEl.classList.remove('dt-pillar-highlight');
            }, 1400);
          }
        };
        item.onclick = handleJump;
        item.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleJump();
          }
        };
      });

      // Expand / Collapse View toggle button
      const toggleBtn = modalOverlay.querySelector('#dt-toggle-details-btn');
      const scorecard = modalOverlay.querySelector('.dt-scorecard');
      if (toggleBtn && scorecard) {
        toggleBtn.onclick = () => {
          isExpandedView = !isExpandedView;
          scorecard.classList.toggle('dt-expanded-view', isExpandedView);
          toggleBtn.textContent = isExpandedView ? 'Collapse view' : 'Expand view';
          toggleBtn.setAttribute('aria-expanded', isExpandedView ? 'true' : 'false');
        };
      }

      // Insights Accordion click
      const insightButtons = modalOverlay.querySelectorAll('.dt-insight-btn');
      insightButtons.forEach(btn => {
        btn.onclick = () => {
          const item = btn.closest('.dt-insight-item');
          if (item) {
            const isOpen = item.classList.toggle('dt-open');
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (isOpen) {
              setTimeout(() => {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 40);
            }
          }
        };
      });

      // Insights Filters
      const filterBtns = modalOverlay.querySelectorAll('.dt-insight-filter-btn');
      filterBtns.forEach(btn => {
        btn.onclick = () => {
          filterBtns.forEach(b => b.classList.remove('dt-filter-active'));
          btn.classList.add('dt-filter-active');
          currentInsightFilter = btn.dataset.filter;
          const insightItems = modalOverlay.querySelectorAll('.dt-insight-item');
          insightItems.forEach(item => {
            const sev = item.dataset.severity;
            if (currentInsightFilter === 'all') {
              item.classList.remove('dt-hidden');
            } else if (currentInsightFilter === 'needs-attention') {
              if (sev === 'critical' || sev === 'warning') {
                item.classList.remove('dt-hidden');
              } else {
                item.classList.add('dt-hidden');
              }
            } else if (currentInsightFilter === 'passed') {
              if (sev === 'passed') {
                item.classList.remove('dt-hidden');
              } else {
                item.classList.add('dt-hidden');
              }
            }
          });

          // Scroll to the insights section so the list is focused and immediately visible in viewport
          const insightsSec = modalOverlay.querySelector('.dt-insights-section');
          if (insightsSec) {
            insightsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        };
      });
    };

    setupEvents();

    const pageTitle = document.querySelector('#page-title');
    if (pageTitle) {
      pageTitle.appendChild(rootHost);
    } else {
      const breadcrumb = document.querySelector('.breadbox, .breadcrumb');
      if (breadcrumb) {
        breadcrumb.parentNode.insertBefore(rootHost, breadcrumb.nextSibling);
      } else {
        document.body.prepend(rootHost);
      }
    }

    this.mountReleasesTableBadges(rawData);
  }

  static mountReleasesTableBadges(rawData) {
    if (!rawData.releases || rawData.releases.length === 0) return;

    rawData.releases.forEach(rel => {
      if (!rel.el || rel.el.querySelector('.dt-inline-release-chip')) return;

      const host = document.createElement('span');
      host.className = 'dt-inline-release-chip';
      host.style.marginLeft = '8px';
      host.style.display = 'inline-flex';
      host.style.alignItems = 'center';
      host.style.gap = '4px';
      host.style.verticalAlign = 'middle';
      host.style.fontSize = '11px';

      if (rel.isSecurityCovered) {
        const secSpan = document.createElement('span');
        secSpan.style.cssText = 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:1px 5px;border-radius:4px;font-weight:600;';
        secSpan.textContent = 'Covered';
        host.appendChild(secSpan);
      }

      if (rel.supportsD12 || rel.supportsD11 || rel.supportsD10) {
        const compatSpan = document.createElement('span');
        if (rel.supportsD12) {
          compatSpan.style.cssText = 'background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;padding:1px 5px;border-radius:4px;font-weight:600;';
          compatSpan.textContent = 'D12';
        } else if (rel.supportsD11) {
          compatSpan.style.cssText = 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:1px 5px;border-radius:4px;font-weight:600;';
          compatSpan.textContent = 'D11';
        } else {
          compatSpan.style.cssText = 'background:#fffbeb;color:#b45309;border:1px solid #fde68a;padding:1px 5px;border-radius:4px;font-weight:600;';
          compatSpan.textContent = 'D10 (EOL Nov)';
          compatSpan.title = 'Drupal 10 reaches End-of-Life in November 2026';
        }
        host.appendChild(compatSpan);
      }

      const versionCol = rel.el.querySelector('.views-field-field-release-version, .views-field-created');
      if (versionCol) {
        versionCol.appendChild(host);
      }
    });
  }

  static renderLighthouseGauge(score, max, label, targetId) {
    const pct = Math.min(100, Math.max(0, Math.round((score / max) * 100)));
    let color = '#059669'; // Green (>= 90%)
    if (pct < 50) {
      color = '#dc2626'; // Red (< 50%)
    } else if (pct < 90) {
      color = '#d97706'; // Amber (50 - 89%)
    }
    const radius = 21;
    const circ = 2 * Math.PI * radius; // ~131.95
    const offset = circ * (1 - (pct / 100));

    return `
      <div class="dt-gauge-item" data-target="${targetId}" role="button" tabindex="0" title="${label}: ${score}/${max} pts (${pct}%) — Click to jump">
        <div class="dt-gauge-dial">
          <svg class="dt-gauge-svg" width="50" height="50" viewBox="0 0 50 50">
            <circle class="dt-gauge-bg" cx="25" cy="25" r="${radius}" fill="transparent" stroke="#e2e8f0" stroke-width="3.8"></circle>
            <circle class="dt-gauge-arc" cx="25" cy="25" r="${radius}" fill="transparent" stroke="${color}" stroke-width="3.8" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" stroke-linecap="round"></circle>
          </svg>
          <span class="dt-gauge-val" style="color: ${color}">${score}</span>
        </div>
        <span class="dt-gauge-label">${label}</span>
      </div>
    `;
  }

  static renderPillarRow(id, iconHtml, title, score, max, itemsOrDetails, rowTooltip = '') {
    const pct = Math.min(100, Math.round((score / max) * 100));

    let items = [];
    if (Array.isArray(itemsOrDetails)) {
      items = itemsOrDetails;
    } else if (typeof itemsOrDetails === 'string') {
      items = itemsOrDetails.split(' · ').map(s => {
        const str = s.trim();
        return { text: str, tooltip: str };
      });
    }

    const fullRowTooltip = rowTooltip || `${title}: ${score}/${max} pts (${items.map(i => i.tooltip || i.text).join(' · ')})`;

    return `
      <div class="dt-scorecard-row" id="${id}" title="${this.escapeHTML(fullRowTooltip)}">
        <div class="dt-sc-header-row">
          <div class="dt-sc-title-group">
            <span class="dt-sc-icon">${iconHtml}</span>
            <span class="dt-sc-title">${this.escapeHTML(title)}</span>
          </div>
          <div class="dt-sc-right">
            <div class="dt-sc-bar-track">
              <div class="dt-sc-bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="dt-sc-score"><strong>${score}</strong><span class="dt-sc-denom">/${max}</span></span>
          </div>
        </div>
        <!-- Collapsed Compact Chips View -->
        <div class="dt-sc-details-row">
          ${items.map(item => `
            <span class="dt-sc-item" title="${this.escapeHTML(item.tooltip || item.text)}">${this.escapeHTML(item.text)}</span>
          `).join('')}
        </div>
        <!-- Expanded Full Diagnostics View -->
        <div class="dt-sc-expanded-grid">
          ${items.map(item => {
            const parts = item.text.split(':');
            const itemLabel = parts[0] ? parts[0].trim() : item.text;
            const itemScore = parts[1] ? parts[1].trim() : '';
            return `
              <div class="dt-sc-expanded-item">
                <span class="dt-sc-expanded-dot">●</span>
                <div class="dt-sc-expanded-content">
                  <div class="dt-sc-expanded-title-line">
                    <span class="dt-sc-expanded-label">${this.escapeHTML(itemLabel)}</span>
                    ${itemScore ? `<span class="dt-sc-expanded-score">${this.escapeHTML(itemScore)}</span>` : ''}
                  </div>
                  ${item.tooltip ? `<p class="dt-sc-expanded-desc">${this.escapeHTML(item.tooltip)}</p>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  static generateLighthouseInsights(evalData, rawData, activeRel) {
    const insights = [];

    // Critical Disqualifiers
    if (evalData.isDisqualified) {
      insights.push({
        severity: 'critical',
        title: evalData.disclaimer?.title || 'Project Disqualified from Production',
        subtitle: evalData.disqualificationReason || 'Score 0 / 100',
        description: evalData.disclaimer?.message || 'This project has been marked as obsolete, unsupported, or has had security advisory coverage revoked by the Drupal Security Team. It is strongly advised not to use it in production.',
        action: 'Search for active, supported Drupal ecosystem alternatives.'
      });
    } else if (evalData.disclaimer && evalData.disclaimer.type === 'critical') {
      insights.push({
        severity: 'critical',
        title: evalData.disclaimer.title,
        subtitle: 'Critical Disclaimer',
        description: evalData.disclaimer.message,
        action: 'Verify module maintenance status before deployment.'
      });
    }

    // Security Coverage
    if (evalData.pillars.security.breakdown.coverage > 0) {
      insights.push({
        severity: 'passed',
        title: 'Covered by Drupal Security Advisory Policy',
        subtitle: '16/16 pts',
        description: 'Security vulnerabilities are formally managed, triaged, and announced in coordination with the official Drupal Security Team.',
        action: null
      });
    } else if (!evalData.isDisqualified) {
      insights.push({
        severity: 'warning',
        title: 'Not covered by Security Advisory Policy',
        subtitle: '0/16 pts',
        description: 'This project is not opted into or covered by the Drupal security advisory process. Maintainers handle security issues privately.',
        action: 'Conduct independent code audits and monitor Git commits for security patches.'
      });
    }

    // Modernity & Core Compatibility
    const modBreakdown = evalData.pillars.modernity.breakdown;
    if (modBreakdown.drupal12 > 0) {
      insights.push({
        severity: 'passed',
        title: 'Drupal 12 Forward-Compatible',
        subtitle: 'Tested for next-gen core',
        description: 'Module is already verified to run on upcoming Drupal 12 core releases, future-proofing your Drupal installation.',
        action: null
      });
    } else if (modBreakdown.drupal11 > 0) {
      insights.push({
        severity: 'passed',
        title: 'Drupal 11 & PHP 8.3 Ready',
        subtitle: 'Modern core compatibility',
        description: 'Fully compatible with current Drupal 11 release and requires PHP 8.3+ modern language runtime.',
        action: null
      });
    } else if (modBreakdown.drupal10 > 0) {
      insights.push({
        severity: 'warning',
        title: 'Drupal 10 EOL Approaching (November 2026)',
        subtitle: 'D10 only release',
        description: 'Drupal 10 will reach official End-of-Life in November 2026. Upgrading or adopting a Drupal 11 compatible release ensures continued community support.',
        action: 'Update info.yml and composer dependencies to support core_version_requirement: ^10 || ^11.'
      });
    }

    // Maintenance Status & Recency
    const maintBreakdown = evalData.pillars.maintenance.breakdown;
    if (maintBreakdown.statusLabel && (maintBreakdown.statusLabel.includes('Minimally') || maintBreakdown.statusLabel.includes('Seeking'))) {
      insights.push({
        severity: 'warning',
        title: `Maintenance Status: ${maintBreakdown.statusLabel}`,
        subtitle: `${maintBreakdown.status}/10 pts`,
        description: 'Maintainers report this project is minimally maintained or actively looking for new co-maintainers to assist with patches and issue queue velocity.',
        action: 'Consider contributing patches or offering co-maintainership to help keep the project active.'
      });
    }

    if (maintBreakdown.recency >= 7) {
      insights.push({
        severity: 'passed',
        title: 'Active release cadence',
        subtitle: `${maintBreakdown.recency}/8 pts`,
        description: `Active release ${evalData.activeVersion || 'latest'} published within the active maintenance window.`,
        action: null
      });
    } else if (maintBreakdown.recency <= 3 && !evalData.isDisqualified) {
      insights.push({
        severity: 'warning',
        title: 'Stale release cadence',
        subtitle: `${maintBreakdown.recency}/8 pts`,
        description: 'No new release tags have been published in over a year. Check Git commits to see if ongoing development is occurring in dev branches.',
        action: 'Check recent Git commit activity and issue queue status.'
      });
    }

    // Issue Queue Hygiene
    if (rawData.totalIssuesCount > 0 && rawData.openIssuesCount === 0) {
      insights.push({
        severity: 'passed',
        title: 'Inbox zero: all issues resolved',
        subtitle: `${maintBreakdown.issues}/7 pts`,
        description: 'Every reported issue on Drupal.org has been resolved and closed. Outstanding queue hygiene.',
        action: null
      });
    } else if (rawData.totalIssuesCount > 0 && rawData.openBugsCount === 0) {
      insights.push({
        severity: 'passed',
        title: 'Zero open bugs in queue',
        subtitle: `${maintBreakdown.issues}/7 pts`,
        description: 'All reported bugs are fixed and closed. Open issues are limited to feature requests or support tasks.',
        action: null
      });
    }

    // Maintainer Count / Bus Factor
    const maintCount = rawData.maintainersCount || 1;
    if (maintCount >= 2) {
      insights.push({
        severity: 'passed',
        title: `Distributed maintainer team (${maintCount} maintainers)`,
        subtitle: 'Low bus-factor risk',
        description: 'Multiple maintainers collaborate to review patches, triage bugs, and manage release velocity.',
        action: null
      });
    } else if (!evalData.isDisqualified) {
      insights.push({
        severity: 'warning',
        title: 'Single maintainer bus-factor risk',
        subtitle: '1 maintainer',
        description: 'Maintained by a single developer. If the maintainer steps away or becomes unavailable, issue queue resolution may stall.',
        action: 'Encourage organizational sponsorship or recruit co-maintainers.'
      });
    }

    // Community Adoption / Installs
    const installs = rawData.activeInstalls || 0;
    if (installs >= 1000) {
      insights.push({
        severity: 'passed',
        title: `Strong community adoption (${installs.toLocaleString()} sites)`,
        subtitle: `${evalData.pillars.adoption.breakdown.installs}/10 pts`,
        description: 'Widespread real-world adoption indicates battle-tested reliability, active testing across diverse hosting setups, and ecosystem trust.',
        action: null
      });
    } else if (evalData.isEmergingProject) {
      insights.push({
        severity: 'passed',
        title: 'Emerging project grace applied',
        subtitle: 'Ecosystem newcomer',
        description: 'This project is less than 180 days old. Evaluated under the emerging project policy with a +2 grace floor while building an install base.',
        action: null
      });
    }

    // Code Quality & GitLab CI
    const qualBreakdown = evalData.pillars.quality.breakdown;
    if (qualBreakdown.pipeline >= 9) {
      insights.push({
        severity: 'passed',
        title: 'GitLab CI pipeline passing',
        subtitle: '10/10 pts',
        description: 'Continuous integration automated pipeline is passing on DrupalCode, confirming automated coding standards and tests.',
        action: null
      });
    } else if (rawData.gitlabPipelineStatus && rawData.gitlabPipelineStatus !== 'passed' && !evalData.isDisqualified) {
      insights.push({
        severity: 'warning',
        title: `GitLab CI pipeline status: ${rawData.gitlabPipelineStatus}`,
        subtitle: `${qualBreakdown.pipeline}/10 pts`,
        description: 'The automated GitLab CI pipeline is not in a passing state. Check recent pipeline jobs on git.drupalcode.org.',
        action: 'Inspect failing CI pipeline jobs on DrupalCode GitLab.'
      });
    }

    // Add recommendations from engine if not already represented
    if (evalData.recommendations && evalData.recommendations.length > 0) {
      evalData.recommendations.forEach(r => {
        const topic = r.topic || 'Recommendation';
        const text = r.action || (typeof r === 'string' ? r : '');
        const isAlreadyRepresented = insights.some(i => i.title.toLowerCase().includes(topic.toLowerCase()));
        if (!isAlreadyRepresented && text) {
          insights.push({
            severity: 'warning',
            title: topic,
            subtitle: 'Opportunity to improve',
            description: text,
            action: text
          });
        }
      });
    }

    return insights;
  }

  static escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static getStyles() {
    return `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.35;
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }

      /* Header Health Pill */
      .dt-pill {
        display: inline-flex;
        align-items: center;
        height: 28px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 9999px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        cursor: pointer;
        user-select: none;
        transition: all 0.16s ease;
        padding: 0 4px;
        color: #0f172a;
      }
      .dt-pill:hover {
        border-color: #cbd5e1;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        transform: translateY(-1px);
      }
      .dt-seg {
        display: inline-flex;
        align-items: center;
        padding: 0 7px;
        gap: 5px;
        height: 100%;
        border-right: 1px solid #e2e8f0;
      }
      .dt-seg:last-child {
        border-right: none;
        padding-right: 6px;
      }
      .dt-brand-title {
        font-weight: 700;
        font-size: 11px;
        color: #002b49;
        letter-spacing: -0.01em;
      }
      .dt-score-badge {
        display: inline-flex;
        align-items: center;
        color: #ffffff;
        font-weight: 800;
        font-size: 11.5px;
        padding: 1px 6px;
        border-radius: 9999px;
        line-height: 1.2;
      }
      .dt-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
      }
      .dt-chip-sec { color: #047857; }
      .dt-chip-warn { color: #b45309; }
      .dt-chip-d12 { color: #6d28d9; }
      .dt-chip-d11 { color: #1d4ed8; }
      .dt-chip-d10 { color: #475569; }
      .dt-chip-d10-eol { color: #b45309; font-weight: 700; }
      .dt-chip-legacy { color: #94a3b8; }
      .dt-ver-text {
        font-size: 11px;
        font-weight: 600;
        color: #475569;
        font-family: ui-monospace, SFMono-Regular, monospace;
      }

      /* Modal Overlay */
      .dt-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(4px);
        z-index: 999999;
        display: flex;
        justify-content: flex-end;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease-out;
      }
      .dt-modal-overlay.dt-active {
        opacity: 1;
        pointer-events: auto;
      }

      /* Drawer Container (Linear-grade, 460px width) */
      .dt-drawer {
        width: 460px;
        max-width: 95vw;
        height: 100vh;
        background: #ffffff;
        box-shadow: -4px 0 25px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dt-modal-overlay.dt-active .dt-drawer {
        transform: translateX(0);
      }

      /* Streamlined Header: Identity + Score Lockup */
      /* Header: Two-Row Clean Hierarchy */
      .dt-drawer-header {
        display: flex;
        flex-direction: column;
        padding: 12px 16px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
        gap: 8px;
        flex-shrink: 0;
      }
      .dt-header-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      }
      .dt-header-breadcrumbs {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        overflow: hidden;
      }
      .dt-brand-tag {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-weight: 700;
        font-size: 11.5px;
        color: #0284c7;
        letter-spacing: -0.01em;
        flex-shrink: 0;
      }
      .dt-brand-tag svg {
        flex-shrink: 0;
      }
      .dt-meta-sep {
        color: #cbd5e1;
        font-size: 11px;
        flex-shrink: 0;
      }
      .dt-machine-tag {
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 11px;
        color: #475569;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dt-type-badge {
        display: inline-flex;
        align-items: center;
        font-size: 10px;
        font-weight: 600;
        color: #475569;
        background: #e2e8f0;
        padding: 1px 6px;
        border-radius: 4px;
        white-space: nowrap;
        flex-shrink: 0;
        line-height: 1.3;
      }
      .dt-close-btn {
        background: transparent;
        border: none;
        padding: 4px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        flex-shrink: 0;
        transition: background 0.12s, color 0.12s;
      }
      .dt-close-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      .dt-header-main-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
      }
      .dt-header-title-block {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .dt-drawer-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .dt-drawer-title {
        margin: 0;
        font-size: 19px;
        font-weight: 800;
        color: #002b49;
        letter-spacing: -0.02em;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dt-gitlab-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 1.5px 6px;
        font-size: 10.5px;
        font-weight: 600;
        color: #334155;
        text-decoration: none;
        transition: all 0.12s ease;
        line-height: 1.3;
        flex-shrink: 0;
      }
      .dt-gitlab-link:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
        color: #0f172a;
      }
      .dt-header-meta-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dt-meta-installs {
        font-size: 11px;
        color: #64748b;
      }
      .dt-meta-emerging {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #047857;
        font-weight: 600;
      }

      /* Lighthouse Hero Score Circle Lockup */
      .dt-hero-score-lockup {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        user-select: none;
      }
      .dt-hero-gauge-dial {
        position: relative;
        width: 54px;
        height: 54px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
      }
      .dt-hero-gauge-svg {
        position: absolute;
        top: 0;
        left: 0;
        border-radius: 9999px;
      }
      .dt-hero-score-val {
        font-size: 19px;
        font-weight: 900;
        line-height: 1;
        z-index: 1;
        letter-spacing: -0.02em;
      }
      .dt-grade-chip {
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        padding: 1.5px 8px;
        border-radius: 9999px;
        line-height: 1.2;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        letter-spacing: 0.01em;
      }

      /* Integrated Action & Release Strip */
      .dt-action-strip {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px 16px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
      }
      .dt-release-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .dt-release-lead {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.04em;
        flex-shrink: 0;
      }
      .dt-release-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        align-items: center;
      }
      .dt-rel-btn {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #334155;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.12s ease;
      }
      .dt-rel-btn:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
        color: #0f172a;
      }
      .dt-rel-btn.dt-rel-active {
        background: #0284c7;
        border-color: #0284c7;
        color: #ffffff;
      }
      .dt-rel-tag {
        font-size: 9px;
        font-weight: 700;
        padding: 0.5px 4px;
        border-radius: 3px;
        line-height: 1.2;
      }
      .dt-rel-btn .dt-tag-stable {
        background: rgba(5, 150, 105, 0.12);
        color: #059669;
      }
      .dt-rel-btn.dt-rel-active .dt-tag-stable {
        background: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }
      .dt-rel-btn .dt-tag-pre {
        background: rgba(217, 119, 6, 0.12);
        color: #d97706;
      }
      .dt-rel-btn.dt-rel-active .dt-tag-pre {
        background: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }

      /* Full-Width Terminal-Grade Composer Bar */
      .dt-composer-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        padding: 5px 8px 5px 10px;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
        cursor: pointer;
        transition: border-color 0.15s, background-color 0.15s;
      }
      .dt-composer-bar:hover {
        border-color: #38bdf8;
        background: #0b1329;
      }
      .dt-composer-content {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1;
      }
      .dt-composer-prompt {
        color: #38bdf8;
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 11px;
        font-weight: 700;
        user-select: none;
        flex-shrink: 0;
      }
      .dt-composer-code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
      .dt-copy-btn {
        background: #1e293b;
        color: #cbd5e1;
        border: 1px solid #334155;
        font-size: 10.5px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }
      .dt-copy-btn:hover {
        background: #0284c7;
        border-color: #0284c7;
        color: #ffffff;
      }
      .dt-copy-btn.dt-copied {
        background: #059669;
        border-color: #059669;
        color: #ffffff;
      }
      .dt-copy-icon-wrap {
        display: inline-flex;
        align-items: center;
      }

      /* Body Layout */
      .dt-drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Disclaimer Banner */
      .dt-disclaimer {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 6px;
        font-size: 11.5px;
        line-height: 1.45;
        flex-shrink: 0;
      }
      .dt-disclaimer-critical {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }
      .dt-disclaimer-warning {
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
      }
      .dt-disclaimer-info {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e40af;
      }
      .dt-disclaimer-icon {
        flex-shrink: 0;
        margin-top: 1px;
      }
      .dt-disclaimer-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .dt-disclaimer-title {
        font-weight: 700;
        font-size: 11.5px;
      }
      .dt-disclaimer-text {
        opacity: 0.95;
      }

      /* Lighthouse Category Gauges Bar */
      .dt-lighthouse-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 10px 12px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        gap: 2px;
        flex-shrink: 0;
        flex-wrap: nowrap;
        width: 100%;
        box-sizing: border-box;
      }
      .dt-gauge-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 2px;
        border-radius: 6px;
        transition: all 0.15s ease;
        flex: 1;
        min-width: 0;
        text-align: center;
        user-select: none;
      }
      .dt-gauge-item:hover {
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        transform: translateY(-1px);
      }
      .dt-gauge-dial {
        position: relative;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .dt-gauge-svg {
        position: absolute;
        top: 0;
        left: 0;
        transform: rotate(-90deg);
      }
      .dt-gauge-bg {
        stroke: #e2e8f0;
      }
      .dt-gauge-arc {
        transition: stroke-dashoffset 0.4s ease;
      }
      .dt-gauge-val {
        font-size: 14.5px;
        font-weight: 800;
        line-height: 1;
        z-index: 1;
      }
      .dt-gauge-label {
        font-size: 11px;
        font-weight: 600;
        color: #334155;
        white-space: nowrap;
        letter-spacing: -0.01em;
      }

      /* Unified Scorecard Box */
      .dt-scorecard {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        flex-shrink: 0;
      }
      .dt-scorecard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 7px 12px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
      .dt-sc-hdr-left {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      .dt-scorecard-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #002b49;
        letter-spacing: 0.04em;
      }
      .dt-scorecard-pts {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
      }
      .dt-view-toggle-btn {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #0284c7;
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .dt-view-toggle-btn:hover {
        background: #0284c7;
        color: #ffffff;
        border-color: #0284c7;
      }
      .dt-scorecard-rows {
        display: flex;
        flex-direction: column;
      }
      .dt-scorecard-row {
        display: flex;
        flex-direction: column;
        padding: 7px 12px 8px;
        border-bottom: 1px solid #f1f5f9;
        gap: 5px;
        flex-shrink: 0;
        transition: background 0.15s ease;
      }
      .dt-scorecard-row:hover {
        background: #f8fafc;
      }
      .dt-scorecard-row:last-child {
        border-bottom: none;
      }
      .dt-pillar-highlight {
        animation: dt-pillar-flash 1.4s ease-out;
      }
      @keyframes dt-pillar-flash {
        0% { background: #e0f2fe; }
        100% { background: transparent; }
      }
      .dt-sc-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      }
      .dt-sc-title-group {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .dt-sc-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }
      .dt-sc-title {
        font-size: 12px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.2;
      }
      .dt-sc-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .dt-sc-bar-track {
        width: 55px;
        height: 5px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 9999px;
        overflow: hidden;
      }
      .dt-sc-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #0284c7, #059669);
        border-radius: 9999px;
      }
      .dt-sc-score {
        font-size: 11.5px;
        color: #1e293b;
        min-width: 36px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .dt-sc-denom {
        font-size: 10px;
        color: #94a3b8;
      }
      .dt-sc-details-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px 6px;
        padding-left: 21px;
      }
      .dt-sc-item {
        display: inline-flex;
        align-items: center;
        padding: 1.5px 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        font-size: 10.5px;
        color: #475569;
        line-height: 1.35;
        cursor: help;
        transition: all 0.12s ease;
      }
      .dt-sc-item:hover {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #1d4ed8;
      }

      /* Expanded View Diagnostics Grid */
      .dt-sc-expanded-grid {
        display: none;
        flex-direction: column;
        gap: 6px;
        padding-left: 21px;
        padding-top: 4px;
      }
      .dt-scorecard.dt-expanded-view .dt-sc-expanded-grid {
        display: flex;
      }
      .dt-scorecard.dt-expanded-view .dt-sc-details-row {
        display: none;
      }
      .dt-sc-expanded-item {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 5px 8px;
        font-size: 11px;
      }
      .dt-sc-expanded-dot {
        font-size: 8px;
        line-height: 1.8;
        color: #0284c7;
        flex-shrink: 0;
      }
      .dt-sc-expanded-content {
        flex: 1;
        min-width: 0;
      }
      .dt-sc-expanded-title-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
        color: #1e293b;
        font-size: 11px;
      }
      .dt-sc-expanded-label {
        font-weight: 700;
      }
      .dt-sc-expanded-score {
        font-weight: 800;
        color: #0284c7;
        font-size: 10.5px;
      }
      .dt-sc-expanded-desc {
        margin: 2px 0 0;
        font-size: 10.5px;
        color: #64748b;
        line-height: 1.35;
      }

      /* Sections */
      .dt-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
      }
      .dt-section-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #002b49;
        letter-spacing: 0.04em;
      }

      /* Lighthouse Insights Section */
      .dt-insights-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      }
      .dt-insights-header-wrap {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }
      .dt-insights-filters {
        display: flex;
        gap: 4px;
      }
      .dt-insight-filter-btn {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        color: #64748b;
        font-size: 10.5px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .dt-insight-filter-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .dt-insight-filter-btn.dt-filter-active {
        background: #0284c7;
        color: #ffffff;
        border-color: #0284c7;
      }
      .dt-insights-list {
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0,0,0,0.02);
      }
      .dt-insight-item {
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.12s ease;
      }
      .dt-insight-item:last-child {
        border-bottom: none;
      }
      .dt-insight-item.dt-hidden {
        display: none !important;
      }
      .dt-insight-btn {
        width: 100%;
        background: transparent;
        border: none;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-align: left;
        cursor: pointer;
        gap: 8px;
        font-family: inherit;
        font-size: 11px;
        transition: background 0.12s ease;
      }
      .dt-insight-btn:hover {
        background: #f8fafc;
      }
      .dt-insight-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }
      .dt-insight-shape {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .dt-insight-title {
        font-weight: 600;
        color: #1e293b;
        font-size: 11.5px;
        line-height: 1.25;
      }
      .dt-insight-sub {
        color: #94a3b8;
        font-size: 10.5px;
        font-weight: 500;
        white-space: nowrap;
      }
      .dt-insight-caret {
        color: #94a3b8;
        display: inline-flex;
        align-items: center;
        transition: transform 0.18s ease;
        flex-shrink: 0;
      }
      .dt-insight-item.dt-open .dt-insight-caret {
        transform: rotate(180deg);
      }
      .dt-insight-body {
        display: none;
        padding: 4px 12px 10px 32px;
        font-size: 11px;
        color: #475569;
        line-height: 1.45;
        background: #fafafa;
        border-top: 1px dashed #e2e8f0;
      }
      .dt-insight-item.dt-open .dt-insight-body {
        display: block;
      }
      .dt-insight-desc {
        margin: 0;
      }
      .dt-insight-action {
        margin-top: 6px;
        padding: 4px 8px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-size: 10.5px;
        color: #0369a1;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dt-insight-action-tag {
        font-weight: 700;
        color: #0284c7;
        text-transform: uppercase;
        font-size: 9.5px;
        letter-spacing: 0.04em;
      }
      .dt-insight-action-text {
        color: #334155;
        font-weight: 500;
      }

      /* Drawer Footer */
      .dt-drawer-footer {
        height: 24px;
        min-height: 24px;
        max-height: 24px;
        padding: 0 12px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 10px;
        line-height: 1;
        color: #64748b;
        flex-shrink: 0;
      }
      .dt-drawer-footer span {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        line-height: 1;
      }
      .dt-author-link {
        color: #0284c7;
        text-decoration: none;
        font-weight: 600;
        line-height: 1;
      }
      .dt-author-link:hover {
        text-decoration: underline;
      }
    `;
  }
}

function mountDropTrendsUI(rawData, evaluation) {
  DropTrendsUI.mount(rawData, evaluation);
}

if (typeof globalThis !== 'undefined') {
  globalThis.DropTrendsUI = DropTrendsUI;
  globalThis.mountDropTrendsUI = mountDropTrendsUI;
}
