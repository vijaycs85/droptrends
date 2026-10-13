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

    // Set up live DOM observer if pipeline status wasn't yet populated by Drupal.org scripts
    let observer = null;
    if (rawData.gitlabPipelineStatus === 'unknown') {
      const pipelineEls = document.querySelectorAll('.pipeline-result, p.pipeline-result');
      if (pipelineEls.length > 0 && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(() => {
          for (const el of pipelineEls) {
            const detectedStatus = DrupalDomExtractor.extractPipelineStatusFromElement(el);
            if (detectedStatus && detectedStatus !== 'unknown' && detectedStatus !== rawData.gitlabPipelineStatus) {
              if (observer) observer.disconnect();
              rawData.gitlabPipelineStatus = detectedStatus;
              rawData.hasAutomatedTests = (
                detectedStatus === 'passed' ||
                detectedStatus === 'running' ||
                Boolean(rawData.composerCommand)
              );
              const updatedEval = DropScoreEngine.evaluate(rawData);
              requestAnimationFrame(() => {
                DropTrendsUI.mount(rawData, updatedEval);
              });
              if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                  type: 'DROPTRENDS_SCORE_UPDATED',
                  score: updatedEval.score,
                  gradeLabel: updatedEval.gradeLabel,
                  gradeColor: updatedEval.gradeColor,
                  moduleName: rawData.machineName
                }).catch(() => {});
              }
              break;
            }
          }
        });

        pipelineEls.forEach((el) => {
          observer.observe(el, { childList: true, subtree: true, attributes: true });
        });

        // Safeguard timeout to disconnect observer
        setTimeout(() => {
          if (observer) observer.disconnect();
        }, 6000);
      }
    }

    const enrichedData = await DropTrendsEnricher.enrich(rawData);
    if (observer && enrichedData.gitlabPipelineStatus !== 'unknown') {
      observer.disconnect();
    }

    evaluation = DropScoreEngine.evaluate(enrichedData);

    requestAnimationFrame(() => {
      DropTrendsUI.mount(enrichedData, evaluation);
    });

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({
          type: 'DROPTRENDS_SCORE_UPDATED',
          score: evaluation.score,
          gradeLabel: evaluation.gradeLabel,
          gradeColor: evaluation.gradeColor,
          moduleName: enrichedData.machineName
        });
      } catch {}
    }

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
