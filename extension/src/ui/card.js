/**
 * DropTrends Shadow DOM UI Overlay v1.1
 * Modern new.drupal.org-aligned design with multi-version selector and releases table chips.
 */

class DropTrendsUI {
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
    rootHost.style.marginLeft = '14px';

    const shadow = rootHost.attachShadow({ mode: 'open' });

    // Stylesheet
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    shadow.appendChild(style);

    // Active version being displayed
    let currentVersion = evaluation.activeVersion || rawData.latestVersion || 'Latest';
    let currentEvaluation = evaluation;

    // Header Health Pill
    const pill = document.createElement('div');
    pill.className = 'dt-pill';
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('title', `DropScore: ${currentEvaluation.score}/100 (${currentEvaluation.gradeLabel}). Click for detailed breakdown.`);

    const renderPillContent = (evalData) => {
      const isCovered = evalData.pillars.security.breakdown.coverage > 0;
      const isD11 = evalData.pillars.modernity.breakdown.drupal11 > 0;
      const isD10 = evalData.pillars.modernity.breakdown.drupal10 > 0;

      return `
        <!-- Segment 1: Brand & Score -->
        <div class="dt-seg dt-seg-brand">
          <svg class="dt-icon-drop" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="url(#dt-brand-grad)"/>
            <defs>
              <linearGradient id="dt-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0284c7" />
                <stop offset="100%" stop-color="#0891b2" />
              </linearGradient>
            </defs>
          </svg>
          <span class="dt-brand-title">DropScore</span>
          <div class="dt-score-badge" style="background-color: ${evalData.gradeColor}">
            <span>${evalData.score}</span>
            <span class="dt-score-grade">${evalData.grade}</span>
          </div>
        </div>

        <!-- Segment 2: Security Shield -->
        <div class="dt-seg dt-seg-sec">
          ${isCovered
            ? '<span class="dt-chip dt-chip-sec" title="Covered by Drupal Security Advisory Policy"><svg class="dt-micro-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>Covered</span>'
            : '<span class="dt-chip dt-chip-warn" title="Not covered by Security Advisory Policy"><svg class="dt-micro-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>No Shield</span>'
          }
        </div>

        <!-- Segment 3: Core Compatibility -->
        <div class="dt-seg dt-seg-compat">
          ${isD11
            ? '<span class="dt-chip dt-chip-d11" title="Drupal 11 Ready">🚀 D11 Ready</span>'
            : (isD10 ? '<span class="dt-chip dt-chip-d10" title="Drupal 10 Compatible">D10</span>' : '<span class="dt-chip dt-chip-legacy">Legacy</span>')
          }
        </div>

        <!-- Segment 4: Active Version & Switcher Trigger -->
        <div class="dt-seg dt-seg-ver">
          <span class="dt-ver-text">${this.escapeHTML(currentVersion)}</span>
          <svg class="dt-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      `;
    };

    pill.innerHTML = renderPillContent(currentEvaluation);

    // Modal Drawer
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'dt-modal-overlay';

    const renderDrawerContent = (evalData, selectedVer) => {
      const activeRel = rawData.releases?.find(r => r.version === selectedVer) || rawData.releases?.[0] || null;
      const composerCmd = activeRel?.composerCommand || rawData.composerCommand;

      return `
        <div class="dt-drawer" role="dialog" aria-modal="true" aria-label="DropScore Breakdown">
          <div class="dt-drawer-header">
            <div>
              <div class="dt-header-sub">
                <span class="dt-machine-tag">drupal/${this.escapeHTML(rawData.machineName)}</span>
                ${rawData.projectType ? `<span class="dt-type-badge">${this.escapeHTML(rawData.projectType)}</span>` : ''}
                ${evalData.isEmergingProject ? '<span class="dt-emerging-badge">🌱 Emerging Project</span>' : ''}
              </div>
              <h2 class="dt-drawer-title">${this.escapeHTML(rawData.title)}</h2>
            </div>
            <button class="dt-close-btn" aria-label="Close dialog">&times;</button>
          </div>

          <div class="dt-drawer-body">
            <!-- Multi-Version Selector Strip -->
            ${(rawData.releases && rawData.releases.length > 0) ? `
              <div class="dt-version-strip">
                <span class="dt-version-label">Evaluate Release:</span>
                <div class="dt-version-pills">
                  ${rawData.releases.slice(0, 5).map(r => `
                    <button class="dt-ver-pill-btn ${r.version === selectedVer ? 'dt-ver-active' : ''}" data-version="${this.escapeHTML(r.version)}">
                      ${this.escapeHTML(r.version)}
                      ${r.isRecommended ? '<small>(Stable)</small>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Hero Score Gauge -->
            <div class="dt-hero-card" style="border-top-color: ${evalData.gradeColor}">
              <div class="dt-gauge-wrapper">
                <div class="dt-gauge-circle" style="background: conic-gradient(${evalData.gradeColor} ${evalData.score * 3.6}deg, #e2e8f0 0deg);">
                  <div class="dt-gauge-inner">
                    <span class="dt-gauge-val" style="color: ${evalData.gradeColor}">${evalData.score}</span>
                    <span class="dt-gauge-max">/ 100</span>
                  </div>
                </div>
              </div>
              <div class="dt-hero-meta">
                <div class="dt-grade-chip" style="background-color: ${evalData.gradeColor}">
                  ${evalData.grade} • ${evalData.gradeLabel}
                </div>
                <p class="dt-hero-desc">
                  ${evalData.isEmergingProject
                    ? 'Evaluated as an emerging project. Scaled for high velocity, clean maintenance, and modern Drupal 11 readiness.'
                    : 'Evaluated across 5 ecosystem pillars for production stability, maintainer trust, and enterprise readiness.'
                  }
                </p>
                ${composerCmd ? `
                  <div class="dt-composer-box">
                    <code>${this.escapeHTML(composerCmd)}</code>
                    <button class="dt-copy-btn" title="Copy composer command">Copy</button>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- 5 Objective Pillars -->
            <div class="dt-section">
              <h3 class="dt-section-heading">Objective Pillar Scores</h3>
              <div class="dt-pillars-list">
                ${this.renderPillar('🛡️ Security & Trust', evalData.pillars.security.score, 25, [
                  `Advisory coverage: ${evalData.pillars.security.breakdown.coverage}/16 pts`,
                  `Maintainer count: ${evalData.pillars.security.breakdown.maintainers}/5 pts`,
                  `Sponsor backing: ${evalData.pillars.security.breakdown.sponsors}/4 pts`
                ])}
                ${this.renderPillar('⚡ Maintenance & Velocity', evalData.pillars.maintenance.score, 25, [
                  `Status tier: ${evalData.pillars.maintenance.breakdown.status}/10 pts`,
                  `Release recency: ${evalData.pillars.maintenance.breakdown.recency}/8 pts (${evalData.activeVersion})`,
                  `Issue momentum: ${evalData.pillars.maintenance.breakdown.issues}/7 pts`
                ])}
                ${this.renderPillar('🚀 Modernity & Compatibility', evalData.pillars.modernity.score, 20, [
                  `Drupal 11: ${evalData.pillars.modernity.breakdown.drupal11}/10 pts`,
                  `Drupal 10: ${evalData.pillars.modernity.breakdown.drupal10}/6 pts`,
                  `Modern PHP: ${evalData.pillars.modernity.breakdown.modernPhp}/2 pts`,
                  `Recipes / Architecture: ${evalData.pillars.modernity.breakdown.recipes}/2 pts`
                ])}
                ${this.renderPillar('🧪 Code Quality & CI', evalData.pillars.quality.score, 15, [
                  `GitLab CI status: ${evalData.pillars.quality.breakdown.pipeline}/10 pts (${rawData.gitlabPipelineStatus || 'unknown'})`,
                  `Automated test footprint: ${evalData.pillars.quality.breakdown.tests}/5 pts`
                ])}
                ${this.renderPillar('📈 Adoption & Community', evalData.pillars.adoption.score, 15, [
                  `Active sites: ${evalData.pillars.adoption.breakdown.installs}/10 pts (${(rawData.activeInstalls || 0).toLocaleString()} sites)`,
                  `Maintainers: ${evalData.pillars.adoption.breakdown.contributors}/5 pts (${rawData.maintainersCount || 0} maintainers)`
                ])}
              </div>
            </div>

            <!-- Flags & Insights -->
            <div class="dt-section">
              <h3 class="dt-section-heading">Key Signals & Insights</h3>
              <div class="dt-flags-grid">
                ${evalData.flags.map(f => `
                  <div class="dt-flag-card dt-flag-${f.type}">
                    <span class="dt-flag-icon">${f.icon}</span>
                    <div class="dt-flag-body">
                      <strong class="dt-flag-title">${this.escapeHTML(f.text)}</strong>
                      <p class="dt-flag-desc">${this.escapeHTML(f.description)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Recommendations -->
            ${evalData.recommendations.length > 0 ? `
              <div class="dt-section">
                <h3 class="dt-section-heading">Architect Recommendations</h3>
                <ul class="dt-rec-list">
                  ${evalData.recommendations.map(r => `<li>${this.escapeHTML(r)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <div class="dt-drawer-footer">
            <span>DropTrends™ • Drupal Ecosystem Intelligence</span>
            <a href="https://git.drupalcode.org/project/${encodeURIComponent(rawData.machineName)}" target="_blank" rel="noopener" class="dt-link-btn">GitLab Repo ↗</a>
          </div>
        </div>
      `;
    };

    modalOverlay.innerHTML = renderDrawerContent(currentEvaluation, currentVersion);
    shadow.appendChild(pill);
    shadow.appendChild(modalOverlay);

    // Event binding
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

      // Version switcher buttons in drawer
      const verButtons = modalOverlay.querySelectorAll('.dt-ver-pill-btn');
      verButtons.forEach(btn => {
        btn.onclick = () => {
          const selectedVer = btn.dataset.version;
          currentVersion = selectedVer;
          // Re-evaluate with version target
          currentEvaluation = DropScoreEngine.evaluate(rawData, selectedVer);

          // Re-render drawer and pill
          modalOverlay.innerHTML = renderDrawerContent(currentEvaluation, currentVersion);
          pill.innerHTML = renderPillContent(currentEvaluation);
          setupEvents();
          modalOverlay.classList.add('dt-active');
        };
      });

      // Copy Composer Command
      const copyBtn = modalOverlay.querySelector('.dt-copy-btn');
      if (copyBtn) {
        copyBtn.onclick = async () => {
          const activeRel = rawData.releases?.find(r => r.version === currentVersion) || rawData.releases?.[0];
          const cmd = activeRel?.composerCommand || rawData.composerCommand;
          if (cmd) {
            try {
              await navigator.clipboard.writeText(cmd);
              const origText = copyBtn.textContent;
              copyBtn.textContent = 'Copied! ✓';
              copyBtn.style.backgroundColor = '#059669';
              setTimeout(() => {
                copyBtn.textContent = origText;
                copyBtn.style.backgroundColor = '';
              }, 2000);
            } catch {}
          }
        };
      }
    };

    setupEvents();

    // Mount to page header next to #page-title
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

    // Mount inline badges to Releases download table
    this.mountReleasesTableBadges(rawData);
  }

  /**
   * Injects Tier-2 micro-chips directly into the Drupal.org Releases table rows.
   */
  static mountReleasesTableBadges(rawData) {
    if (!rawData.releases || rawData.releases.length === 0) return;

    rawData.releases.forEach(rel => {
      if (!rel.el) return;
      // Prevent duplicate injection
      if (rel.el.querySelector('.dt-inline-release-chip')) return;

      const host = document.createElement('span');
      host.className = 'dt-inline-release-chip';
      host.style.marginLeft = '8px';
      host.style.display = 'inline-flex';
      host.style.alignItems = 'center';
      host.style.gap = '4px';
      host.style.verticalAlign = 'middle';
      host.style.fontSize = '11px';

      const d11Chip = rel.supportsD11
        ? '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:1px 5px;border-radius:4px;font-weight:600;">🚀 D11</span>'
        : (rel.supportsD10 ? '<span style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:1px 5px;border-radius:4px;font-weight:600;">D10</span>' : '');

      const secChip = rel.isSecurityCovered
        ? '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:1px 5px;border-radius:4px;font-weight:600;">🛡️ Covered</span>'
        : '';

      host.innerHTML = `${secChip} ${d11Chip}`;

      const versionCol = rel.el.querySelector('.views-field-field-release-version, .views-field-created');
      if (versionCol) {
        versionCol.appendChild(host);
      }
    });
  }

  static renderPillar(title, score, max, details = []) {
    const pct = Math.min(100, Math.round((score / max) * 100));
    return `
      <div class="dt-pillar-row">
        <div class="dt-pillar-header">
          <span class="dt-pillar-name">${this.escapeHTML(title)}</span>
          <span class="dt-pillar-score"><strong>${score}</strong> / ${max} pts</span>
        </div>
        <div class="dt-pillar-track">
          <div class="dt-pillar-bar" style="width: ${pct}%"></div>
        </div>
        <div class="dt-pillar-subnotes">
          ${details.map(d => `<span>• ${this.escapeHTML(d)}</span>`).join('')}
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
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }

      /* Redesigned Health Pill (new.drupal.org style: 28px height, micro-segmented, baseline aligned) */
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

      /* Segments with Hairline Dividers */
      .dt-seg {
        display: inline-flex;
        align-items: center;
        padding: 0 8px;
        gap: 6px;
        height: 100%;
        border-right: 1px solid #e2e8f0;
      }
      .dt-seg:last-child {
        border-right: none;
        padding-right: 6px;
      }

      .dt-icon-drop {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
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
        gap: 3px;
        color: #ffffff;
        font-weight: 700;
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 9999px;
        line-height: 1.2;
      }
      .dt-score-grade {
        opacity: 0.9;
        font-size: 10px;
      }

      .dt-chip {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
      }
      .dt-micro-icon {
        width: 12px;
        height: 12px;
      }
      .dt-chip-sec {
        color: #047857;
      }
      .dt-chip-warn {
        color: #b45309;
      }
      .dt-chip-d11 {
        color: #1d4ed8;
      }
      .dt-chip-d10 {
        color: #475569;
      }
      .dt-chip-legacy {
        color: #94a3b8;
      }

      .dt-ver-text {
        font-size: 11px;
        font-weight: 600;
        color: #475569;
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
      .dt-chevron {
        width: 10px;
        height: 10px;
        color: #94a3b8;
      }

      /* Modal Overlay */
      .dt-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
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

      /* Drawer */
      .dt-drawer {
        width: 550px;
        max-width: 95vw;
        height: 100vh;
        background: #ffffff;
        box-shadow: -4px 0 25px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dt-modal-overlay.dt-active .dt-drawer {
        transform: translateX(0);
      }

      /* Drawer Header */
      .dt-drawer-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .dt-header-sub {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .dt-machine-tag {
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 11px;
        color: #64748b;
      }
      .dt-type-badge {
        font-size: 10px;
        font-weight: 600;
        background: #e2e8f0;
        color: #334155;
        padding: 1px 6px;
        border-radius: 4px;
      }
      .dt-emerging-badge {
        font-size: 10px;
        font-weight: 600;
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
        padding: 1px 6px;
        border-radius: 4px;
      }
      .dt-drawer-title {
        margin: 0;
        font-size: 22px;
        font-weight: 800;
        color: #002b49;
        letter-spacing: -0.02em;
      }
      .dt-close-btn {
        background: transparent;
        border: none;
        font-size: 26px;
        line-height: 1;
        color: #64748b;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .dt-close-btn:hover {
        background: #e2e8f0;
        color: #002b49;
      }

      /* Drawer Body */
      .dt-drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 22px;
      }

      /* Version Switcher Strip */
      .dt-version-strip {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 12px;
      }
      .dt-version-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.04em;
      }
      .dt-version-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .dt-ver-pill-btn {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #334155;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.14s;
      }
      .dt-ver-pill-btn:hover {
        border-color: #0284c7;
        color: #0284c7;
      }
      .dt-ver-pill-btn.dt-ver-active {
        background: #0284c7;
        border-color: #0284c7;
        color: #ffffff;
      }

      /* Hero Card */
      .dt-hero-card {
        display: flex;
        align-items: center;
        gap: 20px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-top: 4px solid #059669;
        border-radius: 12px;
        padding: 20px;
      }
      .dt-gauge-wrapper {
        flex-shrink: 0;
      }
      .dt-gauge-circle {
        width: 82px;
        height: 82px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .dt-gauge-inner {
        width: 66px;
        height: 66px;
        background: #ffffff;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .dt-gauge-val {
        font-size: 24px;
        font-weight: 800;
        line-height: 1;
      }
      .dt-gauge-max {
        font-size: 10px;
        color: #94a3b8;
        font-weight: 600;
      }
      .dt-hero-meta {
        flex: 1;
        min-width: 0;
      }
      .dt-grade-chip {
        display: inline-block;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 9999px;
        margin-bottom: 6px;
      }
      .dt-hero-desc {
        margin: 0 0 10px 0;
        font-size: 12px;
        color: #64748b;
        line-height: 1.4;
      }
      .dt-composer-box {
        display: flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 4px 8px;
        gap: 8px;
      }
      .dt-composer-box code {
        flex: 1;
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 11px;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dt-copy-btn {
        background: #0284c7;
        color: #ffffff;
        border: none;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .dt-copy-btn:hover {
        background: #0369a1;
      }

      /* Sections */
      .dt-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .dt-section-heading {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        color: #002b49;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      /* Pillars List */
      .dt-pillars-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .dt-pillar-row {
        background: #ffffff;
        border: 1px solid #f1f5f9;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .dt-pillar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .dt-pillar-name {
        font-weight: 600;
        font-size: 13px;
        color: #1e293b;
      }
      .dt-pillar-score {
        font-size: 12px;
        color: #64748b;
      }
      .dt-pillar-track {
        width: 100%;
        height: 7px;
        background: #e2e8f0;
        border-radius: 9999px;
        overflow: hidden;
        margin-bottom: 6px;
      }
      .dt-pillar-bar {
        height: 100%;
        background: linear-gradient(90deg, #0284c7, #059669);
        border-radius: 9999px;
        transition: width 0.3s ease;
      }
      .dt-pillar-subnotes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 11px;
        color: #64748b;
      }

      /* Flags Grid */
      .dt-flags-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .dt-flag-card {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 8px;
        font-size: 12px;
      }
      .dt-flag-positive {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }
      .dt-flag-warning {
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
      }
      .dt-flag-critical {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }
      .dt-flag-icon {
        font-size: 15px;
        line-height: 1.2;
      }
      .dt-flag-title {
        display: block;
        margin-bottom: 1px;
      }
      .dt-flag-desc {
        margin: 0;
        opacity: 0.9;
      }

      /* Recommendations */
      .dt-rec-list {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
        color: #334155;
        line-height: 1.5;
      }

      /* Drawer Footer */
      .dt-drawer-footer {
        padding: 16px 24px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #94a3b8;
      }
      .dt-link-btn {
        color: #0284c7;
        text-decoration: none;
        font-weight: 600;
      }
      .dt-link-btn:hover {
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
