/**
 * DropTrends Content Script v1.2
 * Orchestrates extraction, enrichment, evaluation, and Shadow DOM UI rendering on drupal.org/project/*
 */

(async function initDropTrends() {
  const pathname = window.location.pathname;
  if (!pathname.startsWith('/project/')) return;

  // Ignore non-project overview sub-pages
  const subPages = ['/project/issues', '/project/usage', '/project/modules', '/project/themes', '/project/releases'];
  if (subPages.some(sp => pathname === sp || pathname.startsWith(sp + '/'))) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 2) return;
  }

  // Extract machine name from URL path: /project/{machine_name}
  const parts = pathname.split('/').filter(Boolean);
  const machineName = parts[1]?.toLowerCase();

  // Exclude official core platforms (Drupal Core, Drupal CMS)
  const EXCLUDED_PROJECTS = ['drupal', 'drupal_cms', 'cms'];
  if (machineName && EXCLUDED_PROJECTS.includes(machineName)) {
    // Notify background worker to clear any active badge
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

  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  try {
    // 1. Instant Client-Side Extraction (0 API calls, 0 network delay)
    const rawData = DrupalDomExtractor.extract(document);
    if (!rawData || !rawData.machineName) return;

    // Double-check machine name against exclusion list
    if (EXCLUDED_PROJECTS.includes(rawData.machineName.toLowerCase())) return;

    // 2. Initial Evaluation
    let evaluation = DropScoreEngine.evaluate(rawData);

    // 3. Mount UI in next animation frame
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
      } catch {}
    }

    // 5. Asynchronous Enrichment (GitLab CI test pipeline)
    const enrichedData = await DropTrendsEnricher.enrich(rawData);
    evaluation = DropScoreEngine.evaluate(enrichedData);

    // 6. Seamlessly update UI with enriched results
    requestAnimationFrame(() => {
      DropTrendsUI.mount(enrichedData, evaluation);
    });

    // 7. Update extension storage with latest active module for popup view
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
