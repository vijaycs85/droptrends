/**
 * DropTrends Asynchronous Enricher
 * Fetches non-blocking external signals (GitLab CI status) with timeout safeguards.
 */

class DropTrendsEnricher {
  /**
   * Enrich raw module data with remote telemetry.
   * @param {Object} rawData - Extracted RawModuleData
   * @returns {Promise<Object>} EnrichedModuleData
   */
  static async enrich(rawData) {
    const enriched = { ...rawData };

    // If DOM already resolved pipeline status to passed or failed, keep it
    if (enriched.gitlabPipelineStatus && enriched.gitlabPipelineStatus !== 'unknown') {
      enriched.hasAutomatedTests = (
        enriched.gitlabPipelineStatus === 'passed' ||
        enriched.gitlabPipelineStatus === 'running' ||
        Boolean(rawData.composerCommand)
      );
      return enriched;
    }

    // Otherwise, attempt remote resolution
    try {
      const pipelineStatus = await this.fetchGitLabPipelineStatus(
        rawData.machineName,
        rawData.defaultBranch
      );
      enriched.gitlabPipelineStatus = pipelineStatus;
    } catch {
      enriched.gitlabPipelineStatus = 'unknown';
    }

    // Determine automated testing flag based on CI or composer
    enriched.hasAutomatedTests = (
      enriched.gitlabPipelineStatus === 'passed' ||
      enriched.gitlabPipelineStatus === 'running' ||
      Boolean(rawData.composerCommand)
    );

    return enriched;
  }

  /**
   * Reads GitLab CI status via GitLab API or Background Service Worker
   */
  static async fetchGitLabPipelineStatus(machineName, branch = '1.0.x') {
    if (!machineName) return 'unknown';

    const branchName = branch ? branch.replace(/-dev$/, '') : '';
    const apiUrl = `https://git.drupalcode.org/api/v4/projects/project%2F${encodeURIComponent(machineName)}/pipelines/latest${branchName ? `?ref=${encodeURIComponent(branchName)}` : ''}`;

    // 1. Direct GitLab API fetch (CORS allowed by git.drupalcode.org)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const st = (data.status || data.detailed_status?.group || '').toLowerCase();
        if (st === 'success' || st === 'passed') return 'passed';
        if (st === 'failed' || st === 'canceled') return 'failed';
        if (st === 'running' || st === 'pending') return 'running';
      }
    } catch {
      // Direct fetch failed, fallback to service worker
    }

    // 2. Background service worker fetch fallback
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'DROPTRENDS_FETCH_PIPELINE', machineName, branch: branchName },
            (response) => resolve(response)
          );
        });
        if (resp && resp.status && resp.status !== 'unknown') {
          return resp.status;
        }
      } catch {}
    }

    return 'unknown';
  }
}

async function enrichModuleData(rawData) {
  return DropTrendsEnricher.enrich(rawData);
}

if (typeof globalThis !== 'undefined') {
  globalThis.DropTrendsEnricher = DropTrendsEnricher;
  globalThis.enrichModuleData = enrichModuleData;
}
