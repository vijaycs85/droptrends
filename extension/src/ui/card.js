/**
 * DropTrends Shadow DOM UI Overlay
 * Injects the Health Pill and Interactive Breakdown Card into Drupal.org pages with 100% CSS encapsulation.
 */

class DropTrendsUI {
  /**
   * Mounts DropTrends UI to the page.
   * @param {Object} rawData - Extracted module data
   * @param {Object} evaluation - Evaluated DropScore report
   */
  static mount(rawData, evaluation) {
    // Avoid double injection
    const existing = document.getElementById('droptrends-root');
    if (existing) existing.remove();

    const rootHost = document.createElement('div');
    rootHost.id = 'droptrends-root';
    rootHost.style.display = 'inline-block';
    rootHost.style.verticalAlign = 'middle';
    rootHost.style.marginLeft = '16px';

    const shadow = rootHost.attachShadow({ mode: 'open' });

    // Stylesheet inside shadow root
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    shadow.appendChild(style);

    // Pill element
    const pill = document.createElement('div');
    pill.className = 'dt-pill';
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('title', `DropScore: ${evaluation.score}/100 (${evaluation.gradeLabel}). Click for detailed breakdown.`);

    pill.innerHTML = `
      <div class="dt-pill-brand">
        <svg class="dt-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="url(#dt-grad)"/>
          <defs>
            <linearGradient id="dt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <span class="dt-brand-text">DropScore</span>
      </div>
      <div class="dt-pill-score" style="background-color: ${evaluation.gradeColor}">
        <span class="dt-score-num">${evaluation.score}</span>
        <span class="dt-score-grade">${evaluation.grade}</span>
      </div>
      <div class="dt-pill-tags">
        ${rawData.isSecurityCovered ? '<span class="dt-tag dt-tag-sec" title="Covered by Security Advisory Policy">🛡️ Covered</span>' : '<span class="dt-tag dt-tag-warn" title="Not covered by Security Advisory Policy">⚠️ No Shield</span>'}
        ${rawData.supportsDrupal11 ? '<span class="dt-tag dt-tag-d11" title="Drupal 11 Compatible">🚀 D11</span>' : '<span class="dt-tag dt-tag-d10" title="Drupal 10 Compatible">D10</span>'}
      </div>
    `;

    // Modal / Drawer element
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'dt-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="dt-drawer" role="dialog" aria-modal="true" aria-label="DropScore Breakdown">
        <div class="dt-drawer-header">
          <div class="dt-drawer-title-group">
            <h2 class="dt-drawer-title">${this.escapeHTML(rawData.title)}</h2>
            <span class="dt-drawer-machine-name">drupal/${this.escapeHTML(rawData.machineName)}</span>
          </div>
          <button class="dt-close-btn" aria-label="Close dialog">&times;</button>
        </div>

        <div class="dt-drawer-body">
          <!-- Hero Score Card -->
          <div class="dt-hero-card" style="border-top-color: ${evaluation.gradeColor};">
            <div class="dt-hero-gauge">
              <div class="dt-gauge-circle" style="background: conic-gradient(${evaluation.gradeColor} ${evaluation.score * 3.6}deg, #e2e8f0 0deg);">
                <div class="dt-gauge-inner">
                  <span class="dt-gauge-val" style="color: ${evaluation.gradeColor}">${evaluation.score}</span>
                  <span class="dt-gauge-max">/ 100</span>
                </div>
              </div>
            </div>
            <div class="dt-hero-meta">
              <div class="dt-grade-badge" style="background-color: ${evaluation.gradeColor}">${evaluation.grade} • ${evaluation.gradeLabel}</div>
              <p class="dt-hero-desc">Evaluated across 5 ecosystem pillars for Drupal health & enterprise readiness.</p>
              ${rawData.composerCommand ? `
                <div class="dt-composer-box">
                  <code>${this.escapeHTML(rawData.composerCommand)}</code>
                  <button class="dt-copy-btn" title="Copy command">Copy</button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- 5 Pillars Section -->
          <div class="dt-section">
            <h3 class="dt-section-heading">Objective Pillar Scores</h3>
            <div class="dt-pillars-list">
              ${this.renderPillar('🛡️ Security & Trust', evaluation.pillars.security.score, 25, [
                `Advisory coverage: ${evaluation.pillars.security.breakdown.coverage}/16 pts`,
                `Maintainer trust: ${evaluation.pillars.security.breakdown.maintainers}/5 pts`,
                `Sponsor backing: ${evaluation.pillars.security.breakdown.sponsors}/4 pts`
              ])}
              ${this.renderPillar('⚡ Maintenance & Velocity', evaluation.pillars.maintenance.score, 25, [
                `Status tier: ${evaluation.pillars.maintenance.breakdown.status}/10 pts (${rawData.maintenanceStatus || 'Standard'})`,
                `Release recency: ${evaluation.pillars.maintenance.breakdown.recency}/8 pts (${rawData.lastReleaseDaysAgo !== null ? `${rawData.lastReleaseDaysAgo}d ago` : 'N/A'})`,
                `Issue momentum: ${evaluation.pillars.maintenance.breakdown.issues}/7 pts (${rawData.rtbcCount || 0} RTBC)`
              ])}
              ${this.renderPillar('🚀 Modernity & Compatibility', evaluation.pillars.modernity.score, 20, [
                `Drupal 11: ${evaluation.pillars.modernity.breakdown.drupal11}/10 pts`,
                `Drupal 10: ${evaluation.pillars.modernity.breakdown.drupal10}/6 pts`,
                `Modern PHP (8.2+): ${evaluation.pillars.modernity.breakdown.modernPhp}/2 pts`,
                `Recipes / Modern Architecture: ${evaluation.pillars.modernity.breakdown.recipes}/2 pts`
              ])}
              ${this.renderPillar('🧪 Code Quality & CI', evaluation.pillars.quality.score, 15, [
                `GitLab CI status: ${evaluation.pillars.quality.breakdown.pipeline}/10 pts (${rawData.gitlabPipelineStatus || 'unknown'})`,
                `Automated test footprint: ${evaluation.pillars.quality.breakdown.tests}/5 pts`
              ])}
              ${this.renderPillar('📈 Adoption & Community', evaluation.pillars.adoption.score, 15, [
                `Reported installs: ${evaluation.pillars.adoption.breakdown.installs}/10 pts (${(rawData.activeInstalls || 0).toLocaleString()} sites)`,
                `Maintainer count: ${evaluation.pillars.adoption.breakdown.contributors}/5 pts (${rawData.maintainersCount || 0} maintainers)`
              ])}
            </div>
          </div>

          <!-- Flags & Insights -->
          <div class="dt-section">
            <h3 class="dt-section-heading">Key Insights & Flags</h3>
            <div class="dt-flags-grid">
              ${evaluation.flags.map(f => `
                <div class="dt-flag-item dt-flag-${f.type}">
                  <span class="dt-flag-icon">${f.icon}</span>
                  <div>
                    <strong class="dt-flag-title">${this.escapeHTML(f.text)}</strong>
                    <p class="dt-flag-desc">${this.escapeHTML(f.description)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recommendations -->
          ${evaluation.recommendations.length > 0 ? `
            <div class="dt-section">
              <h3 class="dt-section-heading">Architect Recommendations</h3>
              <ul class="dt-rec-list">
                ${evaluation.recommendations.map(r => `<li>${this.escapeHTML(r)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>

        <div class="dt-drawer-footer">
          <span>DropTrends™ • Zero-Lag Drupal Ecosystem Analytics</span>
          <a href="https://git.drupalcode.org/project/${encodeURIComponent(rawData.machineName)}" target="_blank" rel="noopener" class="dt-link-btn">GitLab Repo ↗</a>
        </div>
      </div>
    `;

    shadow.appendChild(pill);
    shadow.appendChild(modalOverlay);

    // Event listeners
    const openModal = () => {
      modalOverlay.classList.add('dt-active');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      modalOverlay.classList.remove('dt-active');
      document.body.style.overflow = '';
    };

    pill.addEventListener('click', openModal);
    pill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });

    const closeBtn = modalOverlay.querySelector('.dt-close-btn');
    closeBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('dt-active')) {
        closeModal();
      }
    });

    // Copy button handling
    const copyBtn = modalOverlay.querySelector('.dt-copy-btn');
    if (copyBtn && rawData.composerCommand) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(rawData.composerCommand);
          const origText = copyBtn.textContent;
          copyBtn.textContent = 'Copied! ✓';
          copyBtn.style.backgroundColor = '#10b981';
          setTimeout(() => {
            copyBtn.textContent = origText;
            copyBtn.style.backgroundColor = '';
          }, 2000);
        } catch {
          // Fallback if clipboard fails
        }
      });
    }

    // Injection target: Place inside #page-title
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
  }

  static renderPillar(title, score, max, details = []) {
    const pct = Math.min(100, Math.round((score / max) * 100));
    return `
      <div class="dt-pillar-row">
        <div class="dt-pillar-header">
          <span class="dt-pillar-name">${this.escapeHTML(title)}</span>
          <span class="dt-pillar-score"><strong>${score}</strong> / ${max} pts</span>
        </div>
        <div class="dt-pillar-bar-bg">
          <div class="dt-pillar-bar-fill" style="width: ${pct}%"></div>
        </div>
        <div class="dt-pillar-details">
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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }

      /* Health Pill */
      .dt-pill {
        display: inline-flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 9999px;
        padding: 4px 10px 4px 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
        cursor: pointer;
        user-select: none;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        gap: 8px;
      }
      .dt-pill:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        border-color: #94a3b8;
      }
      .dt-pill-brand {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .dt-logo-icon {
        width: 16px;
        height: 16px;
      }
      .dt-brand-text {
        font-weight: 700;
        font-size: 12px;
        color: #0f172a;
        letter-spacing: -0.01em;
      }
      .dt-pill-score {
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 2px 8px;
        border-radius: 9999px;
        color: #ffffff;
        font-weight: 700;
        font-size: 13px;
        line-height: 1.2;
      }
      .dt-score-grade {
        opacity: 0.92;
        font-size: 11px;
      }
      .dt-pill-tags {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .dt-tag {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 6px;
      }
      .dt-tag-sec {
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      .dt-tag-warn {
        background: #fffbeb;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .dt-tag-d11 {
        background: #eff6ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
      }
      .dt-tag-d10 {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
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
        transition: opacity 0.22s ease-out;
      }
      .dt-modal-overlay.dt-active {
        opacity: 1;
        pointer-events: auto;
      }

      /* Drawer */
      .dt-drawer {
        width: 540px;
        max-width: 95vw;
        height: 100vh;
        background: #ffffff;
        box-shadow: -4px 0 25px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dt-modal-overlay.dt-active .dt-drawer {
        transform: translateX(0);
      }

      /* Drawer Header */
      .dt-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .dt-drawer-title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
      }
      .dt-drawer-machine-name {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        color: #64748b;
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
        transition: background 0.15s, color 0.15s;
      }
      .dt-close-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      /* Drawer Body */
      .dt-drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Hero Score Card */
      .dt-hero-card {
        display: flex;
        align-items: center;
        gap: 20px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-top: 4px solid #10b981;
        border-radius: 12px;
        padding: 20px;
      }
      .dt-hero-gauge {
        flex-shrink: 0;
      }
      .dt-gauge-circle {
        width: 84px;
        height: 84px;
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
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
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
      .dt-grade-badge {
        display: inline-block;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 9999px;
        margin-bottom: 6px;
      }
      .dt-hero-desc {
        margin: 0 0 12px 0;
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
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
        gap: 12px;
      }
      .dt-section-heading {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      /* Pillars List */
      .dt-pillars-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .dt-pillar-row {
        background: #ffffff;
        border: 1px solid #f1f5f9;
        border-radius: 8px;
        padding: 10px 12px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
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
      .dt-pillar-bar-bg {
        width: 100%;
        height: 8px;
        background: #e2e8f0;
        border-radius: 9999px;
        overflow: hidden;
        margin-bottom: 6px;
      }
      .dt-pillar-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #0284c7, #10b981);
        border-radius: 9999px;
        transition: width 0.4s ease;
      }
      .dt-pillar-details {
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
      .dt-flag-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
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
        font-size: 16px;
        line-height: 1.2;
      }
      .dt-flag-title {
        display: block;
        margin-bottom: 2px;
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
        line-height: 1.6;
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
