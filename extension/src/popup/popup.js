/**
 * DropTrends Popup Controller v1.3
 */

document.addEventListener('DOMContentLoaded', async () => {
  const activeView = document.getElementById('dt-active-view');
  const searchView = document.getElementById('dt-search-view');

  const titleEl = document.getElementById('dt-module-title');
  const machineEl = document.getElementById('dt-module-machine');
  const scoreCircle = document.getElementById('dt-score-circle');
  const scoreVal = document.getElementById('dt-score-val');
  const scoreLabel = document.getElementById('dt-score-label');
  const secTag = document.getElementById('dt-sec-tag');
  const d11Tag = document.getElementById('dt-d11-tag');

  const pillarSec = document.getElementById('dt-pillar-sec');
  const pillarMaint = document.getElementById('dt-pillar-maint');
  const pillarMod = document.getElementById('dt-pillar-mod');
  const pillarQual = document.getElementById('dt-pillar-qual');
  const pillarAdopt = document.getElementById('dt-pillar-adopt');

  const openPageBtn = document.getElementById('dt-open-page-btn');
  const searchForm = document.getElementById('dt-search-form');
  const searchInput = document.getElementById('dt-search-input');
  const recentSection = document.getElementById('dt-recent-section');
  const recentList = document.getElementById('dt-recent-list');

  // Check active tab
  let currentTab = null;
  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
  }

  const SYSTEM_PATHS = [
    'drupal', 'cms', 'drupal_cms',
    'project_module', 'project_theme', 'project_distribution', 'project_core',
    'project_translation', 'project_issue', 'modules', 'themes', 'distributions',
    'issues', 'usage', 'releases', 'comments', 'search', 'user'
  ];
  let isDrupalProject = false;
  let isExcluded = false;
  let currentProjectMachine = null;

  if (currentTab?.url && currentTab.url.includes('drupal.org/project/')) {
    try {
      const urlObj = new URL(currentTab.url);
      const urlParts = urlObj.pathname.split('/').filter(Boolean);
      if (urlParts.length === 2 && urlParts[0] === 'project') {
        const candidate = urlParts[1].toLowerCase();
        if (SYSTEM_PATHS.includes(candidate)) {
          isExcluded = true;
        } else {
          isDrupalProject = true;
          currentProjectMachine = candidate;
        }
      }
    } catch {}
  }

  if (isDrupalProject) {
    const storage = await chrome.storage.local.get(['lastViewedModule', 'recentModules']);
    const current = storage.lastViewedModule;

    if (current && current.rawData && !current.rawData.isExcluded) {
      activeView.classList.remove('dt-hidden');
      searchView.classList.add('dt-hidden');

      const { rawData, evaluation } = current;
      titleEl.textContent = rawData.title;
      machineEl.textContent = `drupal/${rawData.machineName}`;

      const score = typeof evaluation.score === 'number' ? evaluation.score : 0;
      const gradeColor = evaluation.gradeColor || '#0284c7';
      const gradeLabel = evaluation.gradeLabel || 'Evaluated';

      if (scoreVal) {
        scoreVal.textContent = score;
        scoreVal.style.color = gradeColor;
      }

      if (scoreCircle) {
        const circumference = 131.95;
        const dashoffset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
        scoreCircle.style.stroke = gradeColor;
        scoreCircle.style.strokeDashoffset = dashoffset.toFixed(2);
      }

      if (scoreLabel) {
        scoreLabel.textContent = gradeLabel;
        scoreLabel.style.backgroundColor = gradeColor;
      }

      secTag.textContent = rawData.isSecurityCovered ? 'Security Covered' : 'No Shield';
      secTag.className = rawData.isSecurityCovered ? 'dt-tag dt-tag-sec' : 'dt-tag dt-tag-warn';

      // Determine Drupal Core Readiness Tag
      let coreText = 'Legacy';
      let coreClass = 'dt-tag dt-tag-crit';

      if (rawData.supportsDrupal12) {
        coreText = 'D12 Ready';
        coreClass = 'dt-tag dt-tag-d12';
      } else if (rawData.supportsDrupal11) {
        coreText = 'D11 Ready';
        coreClass = 'dt-tag dt-tag-d11';
      } else if (rawData.supportsDrupal10) {
        coreText = "D10 (EOL Nov '26)";
        coreClass = 'dt-tag dt-tag-warn';
      }

      d11Tag.textContent = coreText;
      d11Tag.className = coreClass;

      // Render disclaimer if present
      const disclaimerEl = document.getElementById('dt-popup-disclaimer');
      if (disclaimerEl) {
        if (evaluation.disclaimer) {
          disclaimerEl.classList.remove('dt-hidden');
          disclaimerEl.className = `dt-popup-disclaimer dt-popup-disclaimer-${evaluation.disclaimer.type}`;
          disclaimerEl.textContent = `${evaluation.disclaimer.title}: ${evaluation.disclaimer.message}`;
        } else {
          disclaimerEl.classList.add('dt-hidden');
        }
      }

      pillarSec.textContent = `${evaluation.pillars.security.score}/25`;
      pillarMaint.textContent = `${evaluation.pillars.maintenance.score}/25`;
      pillarMod.textContent = `${evaluation.pillars.modernity.score}/20`;
      pillarQual.textContent = `${evaluation.pillars.quality.score}/15`;
      pillarAdopt.textContent = `${evaluation.pillars.adoption.score}/15`;

      openPageBtn.addEventListener('click', async () => {
        let drawerOpened = false;
        if (currentTab?.id && isDrupalProject) {
          try {
            const res = await chrome.tabs.sendMessage(currentTab.id, { type: 'DROPTRENDS_OPEN_DRAWER' });
            if (res && res.success) {
              drawerOpened = true;
            }
          } catch {}
        }

        if (!drawerOpened) {
          const url = `https://www.drupal.org/project/${rawData.machineName}`;
          if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
            await chrome.tabs.create({ url });
          } else {
            window.open(url, '_blank');
          }
        }
        window.close();
      });
      return;
    }
  }

  // Not on a module page or viewing Core/Drupal CMS
  activeView.classList.add('dt-hidden');
  searchView.classList.remove('dt-hidden');

  if (isExcluded) {
    const tagline = document.querySelector('.dt-search-tagline');
    if (tagline) {
      tagline.textContent = 'You are viewing an official Drupal platform (Drupal Core / Drupal CMS). DropScore evaluates contributed modules, themes, and site templates.';
    }
  }

  // Focus search input
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 50);
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    let raw = searchInput.value.trim().toLowerCase();
    if (!raw) return;

    // Handle full URLs like https://www.drupal.org/project/token
    if (raw.includes('drupal.org/project/')) {
      try {
        const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && parts[0] === 'project') {
          raw = parts[1];
        }
      } catch {}
    }
    // Handle composer syntax like drupal/token
    if (raw.startsWith('drupal/')) {
      raw = raw.replace(/^drupal\//, '');
    }

    const query = raw.replace(/[^a-z0-9_\-]/g, '');
    if (query) {
      const url = `https://www.drupal.org/project/${query}`;
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        await chrome.tabs.create({ url });
      } else {
        window.open(url, '_blank');
      }
      window.close();
    }
  };

  searchForm.addEventListener('submit', handleSearch);

  // Load recently viewed modules if available
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const { recentModules = [] } = await chrome.storage.local.get('recentModules');
    if (recentModules.length > 0) {
      recentSection.classList.remove('dt-hidden');
      recentList.replaceChildren();
      for (const mod of recentModules.slice(0, 5)) {
        const li = document.createElement('li');
        li.className = 'dt-recent-item';

        const spanName = document.createElement('span');
        const strong = document.createElement('strong');
        strong.textContent = mod.machineName;
        spanName.appendChild(strong);

        const spanScore = document.createElement('span');
        spanScore.style.color = mod.gradeColor;
        spanScore.style.fontWeight = '700';
        spanScore.textContent = String(mod.score);

        li.appendChild(spanName);
        li.appendChild(spanScore);

        li.addEventListener('click', async () => {
          const url = `https://www.drupal.org/project/${mod.machineName}`;
          if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
            await chrome.tabs.create({ url });
          } else {
            window.open(url, '_blank');
          }
          window.close();
        });
        recentList.appendChild(li);
      }
    }
  }

  // Intercept any external links to open properly across all browsers
  document.querySelectorAll('a[href^="http"]').forEach(a => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href) {
        if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
          await chrome.tabs.create({ url: href });
        } else {
          window.open(href, '_blank');
        }
        window.close();
      }
    });
  });
});
