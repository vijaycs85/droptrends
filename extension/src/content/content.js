/**
 * DropTrends Content Script v1.3
 */

(async function initDropTrends() {
  const pathname = window.location.pathname;
  if (!pathname.startsWith('/project/')) return;

  const parts = pathname.split('/').filter(Boolean);
  // Canonical project pages are strictly /project/<machineName> (depth 2)
  if (parts.length !== 2) return;

  const machineName = parts[1]?.toLowerCase();
  if (!machineName) return;

  if (typeof DrupalDomExtractor !== 'undefined' && DrupalDomExtractor.isExcludedProject(machineName)) {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({
          type: 'DROPTRENDS_PROJECT_EXCLUDED',
          moduleName: machineName
        });
      } catch {}
    }
    const existing = document.getElementById('droptrends-root');
    if (existing) existing.remove();
    return;
  }

  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  // Double-check DOM authenticity to prevent running on browse forms or search views
  if (typeof DrupalDomExtractor !== 'undefined' && !DrupalDomExtractor.isProjectPage(document, pathname)) {
    const existing = document.getElementById('droptrends-root');
    if (existing) existing.remove();
    return;
  }

  try {
    const rawData = DrupalDomExtractor.extract(document);
    if (!rawData || !rawData.machineName || rawData.isExcluded) {
      const existing = document.getElementById('droptrends-root');
      if (existing) existing.remove();
      return;
    }

    let evaluation = DropScoreEngine.evaluate(rawData);

    await new Promise((resolve) => requestAnimationFrame(() => {
      DropTrendsUI.mount(rawData, evaluation);
      resolve();
    }));

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({
          type: 'DROPTRENDS_SCORE_UPDATED',
          score: evaluation.score,
          gradeLabel: evaluation.gradeLabel,
          gradeColor: evaluation.gradeColor,
          moduleName: rawData.machineName
        });
      } catch {}
    }

    const enrichedData = await DropTrendsEnricher.enrich(rawData);
    evaluation = DropScoreEngine.evaluate(enrichedData);

    requestAnimationFrame(() => {
      DropTrendsUI.mount(enrichedData, evaluation);
    });

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({
        lastViewedModule: {
          rawData: enrichedData,
          evaluation,
          timestamp: Date.now()
        }
      });
    }
  } catch (err) {
    console.warn('[DropTrends] Initialization error:', err);
  }
})();
