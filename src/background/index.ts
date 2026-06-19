function setBadge(text: string, bgColor: string | null = null) {
  if (text) {
    chrome.action.setBadgeText({ text });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
  if (bgColor) {
    chrome.action.setBadgeBackgroundColor({ color: bgColor });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setBadge("", "#111122");
  chrome.storage.local.set({
    scanState: {
      phase: "idle", progress: 0,
      followingCount: 0, followersCount: 0, unfollowersCount: 0,
      followingList: [], followersList: [], unfollowersList: [],
      notFollowingBackList: [], error: null
    }
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.scanState) return;
  const state = changes.scanState.newValue;
  if (!state) return;

  if (state.phase === "navigate_following" || state.phase === "navigate_followers") {
    setBadge("...", "#111122");
  } else if (state.phase === "done") {
    const count = state.unfollowersCount || 0;
    if (count > 0) {
      setBadge(count > 999 ? "999+" : String(count), "#111122");
    } else {
      setBadge("", "#111122");
    }
  } else if (state.phase === "idle" || state.error) {
    setBadge("", "#111122");
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "start-scan") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id || !tab.url || !tab.url.includes("open.spotify.com/user/")) return;
    chrome.tabs.sendMessage(tab.id, { type: "START_SCAN" }, () => {
      if (chrome.runtime.lastError) return;
    });
  });
});
