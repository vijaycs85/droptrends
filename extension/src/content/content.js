/**
 * DropTrends Content Script v1.3
 */

(async function initDropTrends() {
  const pathname = window.location.pathname;
  if (!pathname.startsWith('/project/')) return;

  const subPages = ['/project/issues', '/project/usage', '/project/modules', '/project/themes', '/project/releases'];
  if (subPages.some(sp => pathname === sp || pathname.startsWith(sp + '/'))) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 2) return;
  }

  const parts = pathname.split('/').filter(Boolean);
  const machineName = parts[1]?.toLowerCase();

  const EXCLUDED_PROJECTS = ['drupal', 'drupal_cms', 'cms'];
  if (machineName && EXCLUDED_PROJECTS.includes(machineName)) {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({
          type: 'DROPTRENDS_PROJECT_EXCLUDED',
          moduleName: machineName
        });
      } catch {}
    }
    return;
  }

  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  try {
    const rawData = DrupalDomExtractor.extract(document);
    if (!rawData || !rawData.machineName) return;

    if (EXCLUDED_PROJECTS.includes(rawData.machineName.toLowerCase())) return;

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
