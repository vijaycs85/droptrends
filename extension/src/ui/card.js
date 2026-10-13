/**
 * DropTrends Shadow DOM UI Overlay v1.2
 * Compact, low-whitespace drawer & header pill with Lucide SVG icons (no system emojis).
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
    rootHost.style.marginLeft = '12px';

    const shadow = rootHost.attachShadow({ mode: 'open' });

    // Stylesheet
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    shadow.appendChild(style);

    let currentVersion = evaluation.activeVersion || rawData.latestVersion || 'Latest';
    let currentEvaluation = evaluation;

    const icons = globalThis.DropIcons || {};

    // Header Health Pill (28px height, micro-segmented, no emojis)
    const pill = document.createElement('div');
    pill.className = 'dt-pill';
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('title', `DropScore: ${currentEvaluation.score}/100 (${currentEvaluation.gradeLabel}). Click for detailed breakdown.`);

    const renderPillContent = (evalData) => {
      const isCovered = evalData.pillars.security.breakdown.coverage > 0;
      const isD11 = evalData.pillars.modernity.breakdown.drupal11 > 0;
      const isD10 = evalData.pillars.modernity.breakdown.drupal10 > 0;

      const shieldIcon = isCovered
        ? icons.shieldCheck({ size: 13, color: '#047857' })
        : icons.shieldAlert({ size: 13, color: '#b45309' });

      const d11Icon = icons.rocket({ size: 13, color: '#1d4ed8' });

      return `
        <!-- Segment 1: Brand Logo & Score -->
        <div class="dt-seg dt-seg-brand">
          ${icons.drop({ size: 13 })}
          <span class="dt-brand-title">DropScore</span>
          <div class="dt-score-badge" style="background-color: ${evalData.gradeColor}">
            <span>${evalData.score}</span>
            <span class="dt-score-grade">${evalData.grade}</span>
          </div>
        </div>

        <!-- Segment 2: Security Shield -->
        <div class="dt-seg dt-seg-sec">
          <span class="dt-chip ${isCovered ? 'dt-chip-sec' : 'dt-chip-warn'}">
            ${shieldIcon}
            <span>${isCovered ? 'Covered' : 'No Shield'}</span>
          </span>
        </div>

        <!-- Segment 3: Core Compatibility -->
        <div class="dt-seg dt-seg-compat">
          ${isD11
            ? `<span class="dt-chip dt-chip-d11">${d11Icon}<span>D11 Ready</span></span>`
            : (isD10 ? '<span class="dt-chip dt-chip-d10"><span>D10</span></span>' : '<span class="dt-chip dt-chip-legacy"><span>Legacy</span></span>')
          }
        </div>

        <!-- Segment 4: Active Version & Dropdown Trigger -->
        <div class="dt-seg dt-seg-ver">
          <span class="dt-ver-text">${this.escapeHTML(currentVersion)}</span>
          ${icons.chevronDown({ size: 10, color: '#94a3b8' })}
        </div>
      `;
    };

    pill.innerHTML = renderPillContent(currentEvaluation);

    // Modal Drawer (Compact, low-whitespace, high-density layout)
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'dt-modal-overlay';

    const renderDrawerContent = (evalData, selectedVer) => {
      const activeRel = rawData.releases?.find(r => r.version === selectedVer) || rawData.releases?.[0] || null;
      const composerCmd = activeRel?.composerCommand || rawData.composerCommand;

      return `
        <div class="dt-drawer" role="dialog" aria-modal="true" aria-label="DropScore Breakdown">
          <!-- Drawer Header -->
          <div class="dt-drawer-header">
            <div class="dt-header-left">
              <div class="dt-header-meta">
                <span class="dt-machine-tag">drupal/${this.escapeHTML(rawData.machineName)}</span>
                ${rawData.projectType ? `<span class="dt-tag dt-tag-neutral">${this.escapeHTML(rawData.projectType)}</span>` : ''}
                ${evalData.isEmergingProject ? `<span class="dt-tag dt-tag-emerging">${icons.sprout({ size: 12, color: '#047857' })} Emerging</span>` : ''}
              </div>
              <h2 class="dt-drawer-title">${this.escapeHTML(rawData.title)}</h2>
            </div>
            <button class="dt-close-btn" aria-label="Close dialog">
              ${icons.x({ size: 16, color: '#64748b' })}
            </button>
          </div>

          <div class="dt-drawer-body">
            <!-- Compact Version Switcher Bar -->
            ${(rawData.releases && rawData.releases.length > 0) ? `
              <div class="dt-version-bar">
                <span class="dt-version-label">Release:</span>
                <div class="dt-version-chips">
                  ${rawData.releases.slice(0, 5).map(r => `
                    <button class="dt-ver-chip-btn ${r.version === selectedVer ? 'dt-ver-active' : ''}" data-version="${this.escapeHTML(r.version)}">
                      ${this.escapeHTML(r.version)}
                      ${r.isRecommended ? '<span class="dt-chip-sub">Stable</span>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Compact Hero Score Banner -->
            <div class="dt-hero-compact" style="border-left-color: ${evalData.gradeColor}">
              <div class="dt-hero-score-box">
                <span class="dt-hero-score-val" style="color: ${evalData.gradeColor}">${evalData.score}</span>
                <span class="dt-hero-score-max">/100</span>
                <span class="dt-hero-grade-badge" style="background-color: ${evalData.gradeColor}">${evalData.grade} • ${evalData.gradeLabel}</span>
              </div>
              <div class="dt-hero-info">
                <p class="dt-hero-summary">
                  ${evalData.isEmergingProject
                    ? 'Evaluated as an emerging project. High release velocity, clean issue queues, and modern Drupal 11 readiness.'
                    : 'Evaluated across 5 ecosystem pillars for security trust, velocity, Drupal 11 support, and adoption.'
                  }
                </p>
                ${composerCmd ? `
                  <div class="dt-composer-compact">
                    <code>${this.escapeHTML(composerCmd)}</code>
                    <button class="dt-copy-btn" title="Copy composer require command">
                      ${icons.copy({ size: 12, color: '#ffffff' })}
                      <span>Copy</span>
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- 5 Objective Pillars (Single Unified Container, No Huge Cards) -->
            <div class="dt-section">
              <div class="dt-section-header">
                <span class="dt-section-title">Objective Pillar Breakdown</span>
                <span class="dt-section-sub">${evalData.score} of 100 Total Points</span>
              </div>
              <div class="dt-pillars-box">
                ${this.renderPillarRow(
                  icons.shieldCheck({ size: 14, color: '#059669' }),
                  'Security & Trust',
                  evalData.pillars.security.score,
                  25,
                  `Advisory: ${evalData.pillars.security.breakdown.coverage}/16 • Maintainers: ${evalData.pillars.security.breakdown.maintainers}/5 • Sponsors: ${evalData.pillars.security.breakdown.sponsors}/4`
                )}
                ${this.renderPillarRow(
                  icons.zap({ size: 14, color: '#d97706' }),
                  'Maintenance & Velocity',
                  evalData.pillars.maintenance.score,
                  25,
                  `Status tier: ${evalData.pillars.maintenance.breakdown.status}/10 • Release recency: ${evalData.pillars.maintenance.breakdown.recency}/8 • Issue queue: ${evalData.pillars.maintenance.breakdown.issues}/7`
                )}
                ${this.renderPillarRow(
                  icons.rocket({ size: 14, color: '#2563eb' }),
                  'Modernity & Compatibility',
                  evalData.pillars.modernity.score,
                  20,
                  `Drupal 11: ${evalData.pillars.modernity.breakdown.drupal11}/10 • Drupal 10: ${evalData.pillars.modernity.breakdown.drupal10}/6 • PHP 8.2+: ${evalData.pillars.modernity.breakdown.modernPhp}/2`
                )}
                ${this.renderPillarRow(
                  icons.flask({ size: 14, color: '#0891b2' }),
                  'Code Quality & CI',
                  evalData.pillars.quality.score,
                  15,
                  `GitLab CI status: ${evalData.pillars.quality.breakdown.pipeline}/10 (${rawData.gitlabPipelineStatus || 'unknown'}) • Tests: ${evalData.pillars.quality.breakdown.tests}/5`
                )}
                ${this.renderPillarRow(
                  icons.users({ size: 14, color: '#4f46e5' }),
                  'Adoption & Community',
                  evalData.pillars.adoption.score,
                  15,
                  `Installs: ${evalData.pillars.adoption.breakdown.installs}/10 (${(rawData.activeInstalls || 0).toLocaleString()} sites) • Contributors: ${evalData.pillars.adoption.breakdown.contributors}/5`
                )}
              </div>
            </div>

            <!-- Key Signals & Insights (Dense Compact Grid) -->
            <div class="dt-section">
              <div class="dt-section-header">
                <span class="dt-section-title">Key Signals & Insights</span>
                <span class="dt-section-sub">${evalData.flags.length} Highlights</span>
              </div>
              <div class="dt-signals-grid">
                ${evalData.flags.map(f => {
                  let flagIcon = icons.checkCircle({ size: 14, color: '#059669' });
                  if (f.text.includes('Emerging')) flagIcon = icons.sprout({ size: 14, color: '#047857' });
                  else if (f.text.includes('Security')) flagIcon = f.type === 'positive' ? icons.shieldCheck({ size: 14, color: '#059669' }) : icons.shieldAlert({ size: 14, color: '#b45309' });
                  else if (f.text.includes('Drupal 11')) flagIcon = icons.rocket({ size: 14, color: '#2563eb' });
                  else if (f.text.includes('Recently Released') || f.text.includes('Stale')) flagIcon = icons.zap({ size: 14, color: '#d97706' });
                  else if (f.type === 'warning') flagIcon = icons.alertTriangle({ size: 14, color: '#d97706' });
                  else if (f.type === 'critical') flagIcon = icons.alertCircle({ size: 14, color: '#dc2626' });

                  return `
                    <div class="dt-signal-row dt-signal-${f.type}">
                      <div class="dt-signal-icon-cell">${flagIcon}</div>
                      <div class="dt-signal-body">
                        <strong class="dt-signal-title">${this.escapeHTML(f.text)}</strong>
                        <span class="dt-signal-desc">${this.escapeHTML(f.description)}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Architect Recommendations (Compact) -->
            ${evalData.recommendations.length > 0 ? `
              <div class="dt-section">
                <div class="dt-section-header">
                  <span class="dt-section-title">Architect Guidance</span>
                </div>
                <div class="dt-recs-box">
                  ${evalData.recommendations.map(r => `
                    <div class="dt-rec-item">
                      ${icons.checkCircle({ size: 13, color: '#0284c7' })}
                      <span>${this.escapeHTML(r)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Drawer Footer -->
          <div class="dt-drawer-footer">
            <span class="dt-footer-brand">DropTrends™ • Drupal Ecosystem Intelligence</span>
            <a href="https://git.drupalcode.org/project/${encodeURIComponent(rawData.machineName)}" target="_blank" rel="noopener" class="dt-footer-link">
              <span>GitLab Repo</span>
              ${icons.externalLink({ size: 11, color: '#0284c7' })}
            </a>
          </div>
        </div>
      `;
    };

    modalOverlay.innerHTML = renderDrawerContent(currentEvaluation, currentVersion);
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
      const verButtons = modalOverlay.querySelectorAll('.dt-ver-chip-btn');
      verButtons.forEach(btn => {
        btn.onclick = () => {
          const selectedVer = btn.dataset.version;
          currentVersion = selectedVer;
          currentEvaluation = DropScoreEngine.evaluate(rawData, selectedVer);

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
              const label = copyBtn.querySelector('span');
              if (label) label.textContent = 'Copied!';
              copyBtn.style.backgroundColor = '#059669';
              setTimeout(() => {
                if (label) label.textContent = 'Copy';
                copyBtn.style.backgroundColor = '';
              }, 2000);
            } catch {}
          }
        };
      }
    };

    setupEvents();

    // Injected in page header
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

      const d11Chip = rel.supportsD11
        ? '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:1px 5px;border-radius:4px;font-weight:600;">D11</span>'
        : (rel.supportsD10 ? '<span style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:1px 5px;border-radius:4px;font-weight:600;">D10</span>' : '');

      const secChip = rel.isSecurityCovered
        ? '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:1px 5px;border-radius:4px;font-weight:600;">Covered</span>'
        : '';

      host.innerHTML = `${secChip} ${d11Chip}`;

      const versionCol = rel.el.querySelector('.views-field-field-release-version, .views-field-created');
      if (versionCol) {
        versionCol.appendChild(host);
      }
    });
  }

  static renderPillarRow(iconHtml, title, score, max, details) {
    const pct = Math.min(100, Math.round((score / max) * 100));
    return `
      <div class="dt-pillar-item">
        <div class="dt-pillar-top">
          <div class="dt-pillar-title-group">
            <span class="dt-pillar-icon-cell">${iconHtml}</span>
            <span class="dt-pillar-name">${this.escapeHTML(title)}</span>
          </div>
          <span class="dt-pillar-score"><strong>${score}</strong> / ${max}</span>
        </div>
        <div class="dt-pillar-bar-track">
          <div class="dt-pillar-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="dt-pillar-detail-line">${this.escapeHTML(details)}</span>
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
        line-height: 1.35;
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }

      /* Header Health Pill (28px height, micro-segmented, baseline aligned) */
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
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
      }
      .dt-chip-sec { color: #047857; }
      .dt-chip-warn { color: #b45309; }
      .dt-chip-d11 { color: #1d4ed8; }
      .dt-chip-d10 { color: #475569; }
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
        background: rgba(15, 23, 42, 0.5);
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

      /* Drawer (Compact Width & Padding) */
      .dt-drawer {
        width: 480px;
        max-width: 95vw;
        height: 100vh;
        background: #ffffff;
        box-shadow: -4px 0 25px rgba(0, 0, 0, 0.18);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dt-modal-overlay.dt-active .dt-drawer {
        transform: translateX(0);
      }

      /* Compact Drawer Header */
      .dt-drawer-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .dt-header-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 3px;
      }
      .dt-machine-tag {
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 11px;
        color: #64748b;
      }
      .dt-tag {
        font-size: 10px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .dt-tag-neutral {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
      }
      .dt-tag-emerging {
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
      }
      .dt-drawer-title {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: #002b49;
        letter-spacing: -0.02em;
        line-height: 1.2;
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
      }
      .dt-close-btn:hover {
        background: #e2e8f0;
      }

      /* Drawer Body */
      .dt-drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      /* Slim Version Switcher Bar */
      .dt-version-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 5px 10px;
      }
      .dt-version-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.04em;
        flex-shrink: 0;
      }
      .dt-version-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .dt-ver-chip-btn {
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
        transition: all 0.12s;
      }
      .dt-ver-chip-btn:hover {
        border-color: #0284c7;
        color: #0284c7;
      }
      .dt-ver-chip-btn.dt-ver-active {
        background: #0284c7;
        border-color: #0284c7;
        color: #ffffff;
      }
      .dt-chip-sub {
        font-size: 9px;
        opacity: 0.85;
      }

      /* Compact Hero Banner */
      .dt-hero-compact {
        display: flex;
        align-items: center;
        gap: 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #059669;
        border-radius: 8px;
        padding: 12px 14px;
      }
      .dt-hero-score-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
        min-width: 64px;
      }
      .dt-hero-score-val {
        font-size: 26px;
        font-weight: 900;
        line-height: 1;
      }
      .dt-hero-score-max {
        font-size: 10px;
        color: #94a3b8;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .dt-hero-grade-badge {
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 9999px;
        white-space: nowrap;
      }
      .dt-hero-info {
        flex: 1;
        min-width: 0;
      }
      .dt-hero-summary {
        margin: 0 0 6px 0;
        font-size: 11.5px;
        color: #475569;
        line-height: 1.35;
      }
      .dt-composer-compact {
        display: flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 5px;
        padding: 2px 6px;
        gap: 6px;
      }
      .dt-composer-compact code {
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
        font-size: 10.5px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 3px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        transition: background 0.14s;
      }
      .dt-copy-btn:hover {
        background: #0369a1;
      }

      /* Section Containers */
      .dt-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .dt-section-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .dt-section-title {
        font-size: 11.5px;
        font-weight: 700;
        color: #002b49;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .dt-section-sub {
        font-size: 10.5px;
        color: #94a3b8;
      }

      /* Unified 5 Pillars Box (Compact Table View) */
      .dt-pillars-box {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }
      .dt-pillar-item {
        padding: 7px 12px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .dt-pillar-item:last-child {
        border-bottom: none;
      }
      .dt-pillar-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .dt-pillar-title-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dt-pillar-name {
        font-weight: 600;
        font-size: 12px;
        color: #1e293b;
      }
      .dt-pillar-score {
        font-size: 11px;
        color: #64748b;
      }
      .dt-pillar-bar-track {
        width: 100%;
        height: 4px;
        background: #f1f5f9;
        border-radius: 9999px;
        overflow: hidden;
      }
      .dt-pillar-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #0284c7, #059669);
        border-radius: 9999px;
      }
      .dt-pillar-detail-line {
        font-size: 10.5px;
        color: #64748b;
      }

      /* Signals Grid (Compact Rows) */
      .dt-signals-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .dt-signal-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 11.5px;
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
      .dt-signal-icon-cell {
        flex-shrink: 0;
        margin-top: 1px;
      }
      .dt-signal-body {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .dt-signal-title {
        font-weight: 600;
        font-size: 11.5px;
      }
      .dt-signal-desc {
        font-size: 11px;
        opacity: 0.88;
        line-height: 1.3;
      }

      /* Recommendations */
      .dt-recs-box {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .dt-rec-item {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        font-size: 11.5px;
        color: #334155;
        line-height: 1.35;
      }

      /* Drawer Footer */
      .dt-drawer-footer {
        padding: 10px 18px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #94a3b8;
      }
      .dt-footer-link {
        color: #0284c7;
        text-decoration: none;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .dt-footer-link:hover {
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
