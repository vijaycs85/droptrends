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

      return `
        <div class="dt-drawer" role="dialog" aria-modal="true" aria-label="DropScore Breakdown">
          <!-- Top Header Strip (Two-Tier Clean Hierarchy) -->
          <div class="dt-drawer-header">
            <!-- Row 1: Brand, Namespace, Project Type Badge & Close Button -->
            <div class="dt-header-top-row">
              <div class="dt-header-breadcrumbs">
                <span class="dt-brand-tag">DropTrends</span>
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
                <h2 class="dt-drawer-title" title="${this.escapeHTML(rawData.title)}">${this.escapeHTML(rawData.title)}</h2>
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

              <!-- Dedicated Score Lockup Pill -->
              <div class="dt-score-pill-card" style="border-color: ${evalData.gradeColor}">
                <div class="dt-score-digits">
                  <span class="dt-score-big" style="color: ${evalData.gradeColor}">${evalData.score}</span>
                  <span class="dt-score-denom">/100</span>
                </div>
                <div class="dt-grade-chip" style="background-color: ${evalData.gradeColor}">
                  ${evalData.isEmergingProject ? `${icons.sprout({ size: 11, color: '#ffffff' })} ` : ''}${evalData.gradeLabel}
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

          <!-- Drawer Body -->
          <div class="dt-drawer-body">
            <!-- 5 Objective Pillars (Unified High-Density Scorecard) -->
            <div class="dt-scorecard">
              <div class="dt-scorecard-header">
                <span class="dt-scorecard-title">Objective Pillars</span>
                <span class="dt-scorecard-pts">${evalData.score} / 100 Points</span>
              </div>
              <div class="dt-scorecard-rows">
                ${this.renderPillarRow(
                  evalData.pillars.security.breakdown.coverage > 0
                    ? icons.shieldCheck({ size: 14, color: '#059669' })
                    : icons.shieldAlert({ size: 14, color: '#b45309' }),
                  'Security & Trust',
                  evalData.pillars.security.score,
                  25,
                  `Advisory: ${evalData.pillars.security.breakdown.coverage}/16 · Maintainers: ${evalData.pillars.security.breakdown.maintainers}/5 · Sponsors: ${evalData.pillars.security.breakdown.sponsors}/4`
                )}
                ${this.renderPillarRow(
                  icons.zap({ size: 14, color: '#d97706' }),
                  'Maintenance & Velocity',
                  evalData.pillars.maintenance.score,
                  25,
                  `Status: ${evalData.pillars.maintenance.breakdown.statusLabel ? `${evalData.pillars.maintenance.breakdown.statusLabel} ` : ''}(${evalData.pillars.maintenance.breakdown.status}/10) · Recency: ${evalData.pillars.maintenance.breakdown.recency}/8 (${evalData.activeVersion}) · Queue: ${evalData.pillars.maintenance.breakdown.issues}/7`
                )}
                ${this.renderPillarRow(
                  icons.rocket({ size: 14, color: '#2563eb' }),
                  'Modernity & Compatibility',
                  evalData.pillars.modernity.score,
                  20,
                  evalData.pillars.modernity.breakdown.summaryText ||
                  `Drupal 11: ${evalData.pillars.modernity.breakdown.drupal11}/12 · Drupal 10 (EOL Nov '26): ${evalData.pillars.modernity.breakdown.drupal10}/6 · ${evalData.pillars.modernity.breakdown.phpLabel || 'PHP 8.3+'}: ${evalData.pillars.modernity.breakdown.modernPhp}/2`
                )}
                ${this.renderPillarRow(
                  icons.flask({ size: 14, color: '#0891b2' }),
                  'Code Quality & CI',
                  evalData.pillars.quality.score,
                  15,
                  `GitLab CI: ${evalData.pillars.quality.breakdown.pipeline}/10 (${rawData.gitlabPipelineStatus || 'unknown'}) · Tests: ${evalData.pillars.quality.breakdown.tests}/5`
                )}
                ${(() => {
                  const installCount = rawData.activeInstalls || 0;
                  const installLabel = installCount > 0
                    ? `${installCount.toLocaleString()} sites`
                    : (evalData.isEmergingProject ? 'Emerging grace' : '0 sites');
                  const maintCount = rawData.maintainersCount || 1;
                  const maintLabel = `${maintCount} maintainer${maintCount > 1 ? 's' : ''}`;
                  return this.renderPillarRow(
                    icons.users({ size: 14, color: '#4f46e5' }),
                    'Adoption & Community',
                    evalData.pillars.adoption.score,
                    15,
                    `Installs: ${installLabel} (${evalData.pillars.adoption.breakdown.installs}/10) · ${maintLabel} (${evalData.pillars.adoption.breakdown.contributors}/5)`
                  );
                })()}
              </div>
            </div>

            <!-- Key Signals & Insights -->
            <div class="dt-section">
              <span class="dt-section-label">Key Signals & Badges</span>
              <div class="dt-signals-grid">
                ${evalData.flags.map(f => {
                  let flagIcon = icons.checkCircle({ size: 13, color: '#059669' });
                  if (f.text.includes('Emerging')) flagIcon = icons.sprout({ size: 13, color: '#047857' });
                  else if (f.text.includes('Security')) flagIcon = f.type === 'positive' ? icons.shieldCheck({ size: 13, color: '#059669' }) : icons.shieldAlert({ size: 13, color: '#b45309' });
                  else if (f.text.includes('Drupal 12')) flagIcon = icons.rocket({ size: 13, color: '#6d28d9' });
                  else if (f.text.includes('Drupal 11')) flagIcon = icons.rocket({ size: 13, color: '#2563eb' });
                  else if (f.text.includes('D10 Only') || f.text.includes('EOL')) flagIcon = icons.clock({ size: 13, color: '#d97706' });
                  else if (f.text.includes('Recently Released') || f.text.includes('Stale')) flagIcon = icons.zap({ size: 13, color: '#d97706' });
                  else if (f.type === 'warning') flagIcon = icons.alertTriangle({ size: 13, color: '#d97706' });
                  else if (f.type === 'critical') flagIcon = icons.alertCircle({ size: 13, color: '#dc2626' });

                  return `
                    <div class="dt-signal-chip dt-signal-${f.type}">
                      ${flagIcon}
                      <span class="dt-signal-name">${this.escapeHTML(f.text)}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Recommendations & Guidance to Improve Score -->
            ${evalData.recommendations && evalData.recommendations.length > 0 ? `
              <div class="dt-section">
                <span class="dt-section-label">Recommendations & How to Improve</span>
                <ul class="dt-guidance-list">
                  ${evalData.recommendations.map(r => {
                    const topic = r.topic || '';
                    const text = r.action || (typeof r === 'string' ? r : '');
                    return `
                      <li class="dt-guidance-item">
                        ${topic ? `<span class="dt-guidance-badge">${this.escapeHTML(topic)}</span>` : ''}
                        <span class="dt-guidance-text">${this.escapeHTML(text)}</span>
                      </li>
                    `;
                  }).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <!-- Drawer Footer -->
          <div class="dt-drawer-footer">
            <span>DropTrends™ · Drupal Intelligence</span>
            <a href="https://git.drupalcode.org/project/${encodeURIComponent(rawData.machineName)}" target="_blank" rel="noopener" class="dt-repo-link">
              <span>GitLab Repo</span>
              ${icons.externalLink({ size: 11, color: '#0284c7' })}
            </a>
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

  static renderPillarRow(iconHtml, title, score, max, details) {
    const pct = Math.min(100, Math.round((score / max) * 100));
    return `
      <div class="dt-scorecard-row">
        <div class="dt-sc-left">
          <span class="dt-sc-icon">${iconHtml}</span>
          <div class="dt-sc-text">
            <span class="dt-sc-title">${this.escapeHTML(title)}</span>
            <span class="dt-sc-details">${this.escapeHTML(details)}</span>
          </div>
        </div>
        <div class="dt-sc-right">
          <div class="dt-sc-bar-track">
            <div class="dt-sc-bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="dt-sc-score"><strong>${score}</strong><span class="dt-sc-denom">/${max}</span></span>
        </div>
      </div>
    `;
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
        gap: 6px;
        min-width: 0;
        overflow: hidden;
      }
      .dt-brand-tag {
        font-weight: 700;
        font-size: 11.5px;
        color: #0284c7;
        letter-spacing: -0.01em;
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

      /* Score Lockup Card */
      .dt-score-pill-card {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 9999px;
        padding: 3px 8px 3px 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        flex-shrink: 0;
      }
      .dt-score-digits {
        display: flex;
        align-items: baseline;
      }
      .dt-score-big {
        font-size: 18px;
        font-weight: 900;
        line-height: 1;
      }
      .dt-score-denom {
        font-size: 10px;
        color: #94a3b8;
        font-weight: 600;
      }
      .dt-grade-chip {
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 700;
        padding: 2.5px 8px;
        border-radius: 9999px;
        line-height: 1.2;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 3px;
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
      .dt-scorecard-rows {
        display: flex;
        flex-direction: column;
      }
      .dt-scorecard-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        border-bottom: 1px solid #f1f5f9;
        gap: 10px;
        flex-shrink: 0;
      }
      .dt-scorecard-row:last-child {
        border-bottom: none;
      }
      .dt-sc-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .dt-sc-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }
      .dt-sc-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .dt-sc-title {
        font-size: 12px;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.2;
      }
      .dt-sc-details {
        font-size: 10.5px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dt-sc-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .dt-sc-bar-track {
        width: 60px;
        height: 5px;
        background: #f1f5f9;
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
      }
      .dt-sc-denom {
        font-size: 10px;
        color: #94a3b8;
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

      /* Key Signals Tag Grid */
      .dt-signals-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .dt-signal-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 5px;
        font-size: 11px;
        font-weight: 500;
      }
      .dt-signal-positive {
        background: #f0fdf4;
        border: 1px solid #dcfce7;
        color: #14532d;
      }
      .dt-signal-warning {
        background: #fffbeb;
        border: 1px solid #fef3c7;
        color: #78350f;
      }
      .dt-signal-critical {
        background: #fef2f2;
        border: 1px solid #fee2e2;
        color: #7f1d1d;
      }
      .dt-signal-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Recommendations & Guidance List */
      .dt-guidance-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .dt-guidance-item {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 11px;
        line-height: 1.45;
        color: #334155;
      }
      .dt-guidance-badge {
        display: inline-block;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
        white-space: nowrap;
        flex-shrink: 0;
        line-height: 1.3;
      }
      .dt-guidance-text {
        color: #475569;
        flex: 1;
      }

      /* Drawer Footer */
      .dt-drawer-footer {
        padding: 8px 16px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #94a3b8;
        flex-shrink: 0;
      }
      .dt-repo-link {
        color: #0284c7;
        text-decoration: none;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .dt-repo-link:hover {
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
