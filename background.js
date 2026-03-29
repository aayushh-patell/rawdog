chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["enabled"], (items) => {
    if (typeof items.enabled === "undefined") {
      chrome.storage.sync.set({ enabled: true });
    }
  });
});
