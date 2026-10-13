/**
 * DropTrends Background Service Worker (Manifest V3)
 * Handles badge text updates, installation lifecycle, and preference storage.
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      settings: {
        enableGitLabEnrichment: true,
        showInlinePill: true,
        pillPosition: 'header'
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DROPTRENDS_SCORE_UPDATED') {
    (async () => {
      try {
        if (sender.tab?.id) {
          await chrome.action.setBadgeText({
            tabId: sender.tab.id,
            text: String(message.score)
          });
          await chrome.action.setBadgeBackgroundColor({
            tabId: sender.tab.id,
            color: message.gradeColor || '#059669'
          });
          await chrome.action.setTitle({
            tabId: sender.tab.id,
            title: `DropScore: ${message.score} (${message.gradeLabel}) - ${message.moduleName}`
          });
        }
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'DROPTRENDS_PROJECT_EXCLUDED') {
    (async () => {
      try {
        if (sender.tab?.id) {
          await chrome.action.setBadgeText({ tabId: sender.tab.id, text: '' });
          await chrome.action.setTitle({
            tabId: sender.tab.id,
            title: `${message.moduleName} is an official Drupal platform (excluded from DropScore)`
          });
        }
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'DROPTRENDS_FETCH_PIPELINE') {
    (async () => {
      try {
        const { machineName, branch } = message;
        if (!machineName) {
          sendResponse({ status: 'unknown' });
          return;
        }

        const cleanBranch = branch ? branch.replace(/-dev$/, '') : '';
        const url = `https://git.drupalcode.org/api/v4/projects/project%2F${encodeURIComponent(machineName)}/pipelines/latest${cleanBranch ? `?ref=${encodeURIComponent(cleanBranch)}` : ''}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          sendResponse({ status: 'unknown' });
          return;
        }

        const data = await res.json();
        const st = (data.status || data.detailed_status?.group || '').toLowerCase();
        let status = 'unknown';
        if (st === 'success' || st === 'passed') {
          status = 'passed';
        } else if (st === 'failed' || st === 'canceled') {
          status = 'failed';
        } else if (st === 'running' || st === 'pending') {
          status = 'running';
        }

        sendResponse({ status });
      } catch (err) {
        sendResponse({ status: 'unknown', error: err.message });
      }
    })();
    return true;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const isExcluded = /\/project\/(drupal|cms|drupal_cms)(\/|$)/.test(tab.url);
    const isProjectPage = tab.url.includes('drupal.org/project/');

    if (!isProjectPage || isExcluded) {
      try {
        await chrome.action.setBadgeText({ tabId, text: '' });
      } catch {}
    }
  }
});
