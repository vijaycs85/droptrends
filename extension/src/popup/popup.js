/**
 * DropTrends Popup Controller v1.2
 */

document.addEventListener('DOMContentLoaded', async () => {
  const activeView = document.getElementById('dt-active-view');
  const searchView = document.getElementById('dt-search-view');

  const titleEl = document.getElementById('dt-module-title');
  const machineEl = document.getElementById('dt-module-machine');
  const scorePill = document.getElementById('dt-score-pill');
  const scoreVal = document.getElementById('dt-score-val');
  const scoreGrade = document.getElementById('dt-score-grade');
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

  const isExcluded = currentTab?.url && /\/project\/(drupal|cms|drupal_cms)(\/|$)/.test(currentTab.url);
  const isDrupalProject = currentTab?.url && currentTab.url.includes('drupal.org/project/') && !isExcluded;

  if (isDrupalProject) {
    const storage = await chrome.storage.local.get(['lastViewedModule', 'recentModules']);
    const current = storage.lastViewedModule;

    if (current && current.rawData && !current.rawData.isExcluded) {
      activeView.classList.remove('dt-hidden');
      searchView.classList.add('dt-hidden');

      const { rawData, evaluation } = current;
      titleEl.textContent = rawData.title;
      machineEl.textContent = `drupal/${rawData.machineName}`;

      scoreVal.textContent = evaluation.score;
      scoreGrade.textContent = evaluation.grade;
      scorePill.style.backgroundColor = evaluation.gradeColor;

      secTag.textContent = rawData.isSecurityCovered ? 'Security Covered' : 'No Shield';
      secTag.className = rawData.isSecurityCovered ? 'dt-tag dt-tag-sec' : 'dt-tag dt-tag-warn';

      d11Tag.textContent = rawData.supportsDrupal11 ? 'D11 Ready' : (rawData.supportsDrupal10 ? 'D10 Ready' : 'Legacy');

      pillarSec.textContent = `${evaluation.pillars.security.score}/25`;
      pillarMaint.textContent = `${evaluation.pillars.maintenance.score}/25`;
      pillarMod.textContent = `${evaluation.pillars.modernity.score}/20`;
      pillarQual.textContent = `${evaluation.pillars.quality.score}/15`;
      pillarAdopt.textContent = `${evaluation.pillars.adoption.score}/15`;

      openPageBtn.addEventListener('click', () => {
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

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    if (query) {
      const url = `https://www.drupal.org/project/${query}`;
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, '_blank');
      }
      window.close();
    }
  });

  // Load recently viewed modules if available
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const { recentModules = [] } = await chrome.storage.local.get('recentModules');
    if (recentModules.length > 0) {
      recentSection.classList.remove('dt-hidden');
      recentList.innerHTML = '';
      for (const mod of recentModules.slice(0, 5)) {
        const li = document.createElement('li');
        li.className = 'dt-recent-item';
        li.innerHTML = `
          <span><strong>${mod.machineName}</strong></span>
          <span style="color: ${mod.gradeColor}; font-weight: 700;">${mod.score} ${mod.grade}</span>
        `;
        li.addEventListener('click', () => {
          chrome.tabs.create({ url: `https://www.drupal.org/project/${mod.machineName}` });
          window.close();
        });
        recentList.appendChild(li);
      }
    }
  }
});
