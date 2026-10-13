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
            color: message.gradeColor || '#10b981'
          });
          await chrome.action.setTitle({
            tabId: sender.tab.id,
            title: `DropScore: ${message.score} (${message.grade}) - ${message.moduleName}`
          });
        }
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async response
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && !tab.url.includes('drupal.org/project/')) {
    try {
      await chrome.action.setBadgeText({ tabId, text: '' });
    } catch {
      // Ignore if tab closed
    }
  }
});
