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

    // Fetch GitLab CI pipeline badge with 2.5s timeout
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
   * Reads GitLab CI badge SVG from git.drupalcode.org
   */
  static async fetchGitLabPipelineStatus(machineName, branch = '1.0.x') {
    if (!machineName) return 'unknown';

    const branchName = branch.replace(/-dev$/, '');
    const badgeUrl = `https://git.drupalcode.org/project/${encodeURIComponent(machineName)}/badges/${encodeURIComponent(branchName)}/pipeline.svg`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch(badgeUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'image/svg+xml' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) return 'unknown';

      const svgText = await res.text();
      if (svgText.includes('passed') || svgText.includes('#2da160') || svgText.includes('success')) {
        return 'passed';
      }
      if (svgText.includes('failed') || svgText.includes('#d9534f')) {
        return 'failed';
      }
      if (svgText.includes('running')) {
        return 'running';
      }
      return 'unknown';
    } catch {
      clearTimeout(timeoutId);
      return 'unknown';
    }
  }
}

async function enrichModuleData(rawData) {
  return DropTrendsEnricher.enrich(rawData);
}

if (typeof globalThis !== 'undefined') {
  globalThis.DropTrendsEnricher = DropTrendsEnricher;
  globalThis.enrichModuleData = enrichModuleData;
}
