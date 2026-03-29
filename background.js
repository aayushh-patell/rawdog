const ICON_SIZES = [16, 32, 48, 128];

function getEnabled() {
  return chrome.storage.sync.get({ enabled: true }).then((items) => items.enabled);
}

async function updateActionAppearance(enabled) {
  const imageData = {};

  for (const size of ICON_SIZES) {
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, size, size);
    context.globalAlpha = enabled ? 1 : 0.35;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${Math.floor(size * 0.84)}px serif`;
    context.fillText("🍃", size / 2, size / 2 + size * 0.05);

    imageData[size] = context.getImageData(0, 0, size, size);
  }

  await chrome.action.setIcon({ imageData });
  await chrome.action.setTitle({
    title: enabled ? "Raw.dog is on" : "Raw.dog is off"
  });
}

async function reloadEveryTab() {
  const tabs = await chrome.tabs.query({});

  await Promise.allSettled(
    tabs
      .filter((tab) => typeof tab.id === "number")
      .map((tab) => chrome.tabs.reload(tab.id))
  );
}

async function initialize() {
  const enabled = await getEnabled();
  await updateActionAppearance(enabled);
}

chrome.runtime.onInstalled.addListener(async () => {
  const items = await chrome.storage.sync.get(["enabled"]);

  if (typeof items.enabled === "undefined") {
    await chrome.storage.sync.set({ enabled: true });
    await updateActionAppearance(true);
    return;
  }

  await updateActionAppearance(items.enabled);
});

chrome.runtime.onStartup.addListener(() => {
  initialize();
});

chrome.action.onClicked.addListener(async () => {
  const enabled = await getEnabled();
  const nextEnabled = !enabled;

  await chrome.storage.sync.set({ enabled: nextEnabled });
  await updateActionAppearance(nextEnabled);
  await reloadEveryTab();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes.enabled) {
    return;
  }

  updateActionAppearance(Boolean(changes.enabled.newValue));
});

initialize();
