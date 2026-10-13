/**
 * DropTrends Content Script
 * Orchestrates extraction, enrichment, evaluation, and Shadow DOM UI rendering on drupal.org/project/*
 */

(async function initDropTrends() {
  // Guard: Only run on Drupal module/theme project overview pages
  const pathname = window.location.pathname;
  if (!pathname.startsWith('/project/')) return;

  const subPages = ['/project/issues', '/project/usage', '/project/modules', '/project/themes', '/project/releases'];
  if (subPages.some(sp => pathname === sp || pathname.startsWith(sp + '/'))) {
    // Only target primary project node pages: /project/<machine_name>
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 2) return;
  }

  // Helper to ensure DOM is ready
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  try {
    // 1. Instant Client-Side Extraction (0 API calls, 0 network delay)
    const rawData = DrupalDomExtractor.extract(document);
    if (!rawData || !rawData.machineName) return;

    // 2. Initial Evaluation
    let evaluation = DropScoreEngine.evaluate(rawData);

    // 3. Mount UI in next animation frame to prevent layout jank
    await new Promise((resolve) => requestAnimationFrame(() => {
      DropTrendsUI.mount(rawData, evaluation);
      resolve();
    }));

    // 4. Notify background service worker to update toolbar badge
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({
          type: 'DROPTRENDS_SCORE_UPDATED',
          score: evaluation.score,
          grade: evaluation.grade,
          gradeColor: evaluation.gradeColor,
          moduleName: rawData.machineName
        });
      } catch {
        // Service worker might be sleeping or inactive
      }
    }

    // 5. Asynchronous Enrichment (GitLab CI test pipeline)
    const enrichedData = await DropTrendsEnricher.enrich(rawData);
    evaluation = DropScoreEngine.evaluate(enrichedData);

    // 6. Seamlessly update UI with enriched results
    requestAnimationFrame(() => {
      DropTrendsUI.mount(enrichedData, evaluation);
    });

    // 7. Update extension storage with latest active module for quick popup view
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
