const nativeHostName = "com.nova.browser";
/* global chrome */

let nativePort;

const ensureNativePort = () => {
  if (nativePort) return nativePort;
  nativePort = chrome.runtime.connectNative(nativeHostName);
  nativePort.onDisconnect.addListener(() => {
    nativePort = undefined;
  });
  return nativePort;
};

const sendMetadata = (eventType, tab) => {
  if (!Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) return;
  const payload = {
    type: eventType,
    browser: "chromium",
    tab_id: tab.id,
    window_id: tab.windowId,
    active: tab.active === true,
  };
  if (typeof tab.url === "string") payload.url = tab.url;
  if (typeof tab.title === "string") payload.title = tab.title;
  try {
    ensureNativePort().postMessage(payload);
  } catch {
    nativePort = undefined;
  }
};

chrome.tabs.onCreated.addListener((tab) => sendMetadata("tab_opened", tab));
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (
    changeInfo.url === undefined &&
    changeInfo.title === undefined &&
    changeInfo.status !== "complete"
  ) {
    return;
  }
  sendMetadata("tab_updated", {
    ...tab,
    url: changeInfo.url ?? tab.url,
    title: changeInfo.title ?? tab.title,
  });
});
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    sendMetadata("tab_activated", { ...tab, windowId, active: true });
  } catch {
    // The tab may close between activation and lookup; no event is emitted.
  }
});
chrome.tabs.onRemoved.addListener((tabId, removeInfo) =>
  sendMetadata("tab_closed", { id: tabId, windowId: removeInfo.windowId, active: false }),
);
