/**
 * DropTrends Asynchronous Enricher
 * Fetches non-blocking external signals (GitLab CI status) with timeout safeguards.
 */

class DropTrendsEnricher {
  static TAXONOMY_MAINTENANCE = {
    '13028': 'Actively maintained',
    '19370': 'Minimally maintained',
    '9990': 'Seeking co-maintainer(s)',
    '9992': 'Seeking new maintainer',
    '13032': 'Unsupported'
  };

  static TAXONOMY_DEVELOPMENT = {
    '9988': 'Under active development',
    '13030': 'Maintenance fixes only',
    '16538': 'No further development',
    '9994': 'Obsolete'
  };

  /**
   * Enrich raw module data with remote telemetry.
   * @param {Object} rawData - Extracted RawModuleData
   * @returns {Promise<Object>} EnrichedModuleData
   */
  static async enrich(rawData) {
    const enriched = { ...rawData };

    // 1. Authoritative Drupal.org API taxonomy enrichment
    try {
      const nodeData = await this.fetchDrupalProjectNode(rawData.machineName);
      if (nodeData) {
        const term44 = nodeData.taxonomy_vocabulary_44?.id || (typeof nodeData.taxonomy_vocabulary_44 === 'string' ? nodeData.taxonomy_vocabulary_44 : null);
        if (term44 && this.TAXONOMY_MAINTENANCE[term44]) {
          enriched.maintenanceStatus = this.TAXONOMY_MAINTENANCE[term44];
        }

        const term46 = nodeData.taxonomy_vocabulary_46?.id || (typeof nodeData.taxonomy_vocabulary_46 === 'string' ? nodeData.taxonomy_vocabulary_46 : null);
        if (term46 && this.TAXONOMY_DEVELOPMENT[term46]) {
          enriched.developmentStatus = this.TAXONOMY_DEVELOPMENT[term46];
        }

        const secCov = nodeData.field_security_advisory_coverage;
        if (secCov) {
          if (secCov === 'revoked') {
            enriched.securityCoverageStatus = 'revoked';
            enriched.isSecurityCovered = false;
            enriched.isSecurityRevoked = true;
          } else if (secCov === 'not-covered') {
            enriched.securityCoverageStatus = 'not-covered';
            enriched.isSecurityCovered = false;
          } else if (secCov === 'covered') {
            enriched.securityCoverageStatus = 'covered';
            enriched.isSecurityCovered = true;
          }
        }
      }
    } catch {}

    // 2. If DOM already resolved pipeline status to passed or failed, keep it
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

  /**
   * Fetches official project node metadata from Drupal.org API
   */
  static async fetchDrupalProjectNode(machineName) {
    if (!machineName) return null;

    const apiUrl = `https://www.drupal.org/api-d7/node.json?field_project_machine_name=${encodeURIComponent(machineName)}`;

    // 1. Direct fetch (same-origin when executed on Drupal.org)
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
        return data?.list?.[0] || null;
      }
    } catch {}

    // 2. Background service worker fetch fallback
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'DROPTRENDS_FETCH_PROJECT_NODE', machineName },
            (response) => resolve(response)
          );
        });
        if (resp && resp.node) {
          return resp.node;
        }
      } catch {}
    }

    return null;
  }
}

async function enrichModuleData(rawData) {
  return DropTrendsEnricher.enrich(rawData);
}

if (typeof globalThis !== 'undefined') {
  globalThis.DropTrendsEnricher = DropTrendsEnricher;
  globalThis.enrichModuleData = enrichModuleData;
}
