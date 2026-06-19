import type { ScanState, User } from '../shared/types';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555577' stroke-width='1.5'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M20 21a8 8 0 00-16 0'/%3E%3C/svg%3E";

const ACTIVE_SCAN_PHASES: Array<ScanState['phase']> = ["navigate_following", "navigate_followers"];

const stateElements = {
  loading: document.getElementById("state-loading") as HTMLDivElement,
  initial: document.getElementById("state-initial") as HTMLDivElement,
  scanning: document.getElementById("state-scanning") as HTMLDivElement,
  results: document.getElementById("state-results") as HTMLDivElement,
  error: document.getElementById("state-error") as HTMLDivElement,
};

function showState(name: keyof typeof stateElements) {
  Object.values(stateElements).forEach(el => el.classList.add("hidden"));
  stateElements[name].classList.remove("hidden");
}

function escapeHtml(str: string) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

function showInitial() {
  showState("initial");
  const initialEl = document.getElementById("state-initial") as HTMLDivElement;
  const warning = initialEl.querySelector(".location-warning") as HTMLDivElement;
  const goBtn = document.getElementById("btn-go-spotify") as HTMLButtonElement;
  const scanBtn = document.getElementById("btn-start-scan") as HTMLButtonElement;

  warning.style.display = "none";
  goBtn.style.display = "none";
  scanBtn.classList.add("hidden");

  getActiveTab().then(tab => {
    const url = tab?.url || "";
    if (url.includes("open.spotify.com")) {
      scanBtn.classList.remove("hidden");
    } else {
      warning.style.display = "flex";
      goBtn.style.display = "inline-flex";
    }
  });
}

function updateProgress(percent: number, label: string) {
  document.getElementById("progress-fill")!.style.width = percent + "%";
  document.getElementById("progress-label")!.textContent = label;
  const pctEl = document.getElementById("progress-pct");
  if (pctEl) pctEl.textContent = Math.round(percent) + "%";
}

function updateStats(following: number, followers: number, unfollowers: number) {
  document.getElementById("stat-following")!.textContent = String(following);
  document.getElementById("stat-followers")!.textContent = String(followers);
  document.getElementById("stat-unfollowers")!.textContent = String(unfollowers);
}

function showError(message: string) {
  showState("error");
  document.getElementById("error-message")!.textContent = message;
}

function switchList(target: string) {
  document.querySelectorAll(".btn-tab").forEach(b => b.classList.toggle("active", (b as HTMLElement).dataset.list === target));
  document.querySelectorAll(".list-panel").forEach(p => p.classList.toggle("active", p.id === "list-" + target));
}

function isValidSpotifyUrl(url: string) {
  return url.startsWith("https://open.spotify.com/");
}

function renderList(container: HTMLElement, users: User[] | undefined, listType: 'unfollowers' | 'notfollow') {
  if (!users?.length) {
    const msg = listType === "unfollowers"
      ? "Everyone follows you back!"
      : "You follow everyone back!";
    container.innerHTML = `<div class="empty-state success"><div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><p>${msg}</p></div>`;
    return;
  }

  container.innerHTML = "";
  users.forEach(user => {
    const item = document.createElement("div");
    item.className = "result-item";
    const safeUrl = isValidSpotifyUrl(user.url) ? user.url : "#";
    item.innerHTML = `
      <div class="skeleton-avatar"></div>
      <a class="name" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(user.name)}</a>
      <a class="visit-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" title="Visit profile">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    `;
    const skeleton = item.querySelector(".skeleton-avatar") as HTMLDivElement;
    const img = document.createElement("img");
    img.src = escapeHtml(user.img || DEFAULT_AVATAR);
    img.addEventListener("load", () => {
      img.classList.add("loaded");
      skeleton.replaceWith(img);
    });
    img.addEventListener("error", () => {
      img.src = DEFAULT_AVATAR;
      img.classList.add("loaded");
      skeleton.replaceWith(img);
    });
    container.appendChild(item);
  });
}

function updateTabBadge(button: HTMLButtonElement, count: number) {
  const existing = button.querySelector(".tab-badge");
  if (existing) existing.remove();
  const badge = document.createElement("span");
  badge.className = "tab-badge";
  badge.textContent = String(count);
  button.appendChild(badge);
}

function showResults(state: ScanState) {
  if (!state.unfollowersList || !Array.isArray(state.unfollowersList)) {
    showError("No results found. Try scanning again.");
    return;
  }

  showState("results");
  const unfollowerCount = state.unfollowersList.length;
  const notFollowingCount = state.notFollowingBackList?.length || 0;

  document.getElementById("results-count")!.textContent = String(unfollowerCount);
  document.getElementById("res-stat-following")!.textContent = String(state.followingCount || 0);
  document.getElementById("res-stat-followers")!.textContent = String(state.followersCount || 0);

  const name = state.userName || state.userId || "Spotify User";
  (document.getElementById("user-profile-avatar") as HTMLImageElement).src = state.userImg || DEFAULT_AVATAR;
  document.getElementById("user-profile-name")!.textContent = name;
  document.getElementById("user-profile-bar")!.style.display = "block";

  updateTabBadge(document.getElementById("btn-show-unfollowers") as HTMLButtonElement, unfollowerCount);
  updateTabBadge(document.getElementById("btn-show-notfollow") as HTMLButtonElement, notFollowingCount);

  if (unfollowerCount > 0) {
    chrome.action.setBadgeText({ text: unfollowerCount > 999 ? "999+" : String(unfollowerCount) });
    chrome.action.setBadgeBackgroundColor({ color: "#111122" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }

  renderList(document.getElementById("results-list") as HTMLElement, state.unfollowersList, "unfollowers");
  renderList(document.getElementById("results-list-nf") as HTMLElement, state.notFollowingBackList, "notfollow");

  switchList("unfollowers");
}

function handleStorageChange(state: ScanState) {
  const following = state.followingCount || 0;
  const followers = state.followersCount || 0;

  switch (state.phase) {
    case "navigate_following":
      if (stateElements.scanning.classList.contains("hidden")) showState("scanning");
      updateProgress(10, `Scanning following list... ${following} found`);
      updateStats(following, 0, 0);
      break;
    case "navigate_followers":
      if (stateElements.scanning.classList.contains("hidden")) showState("scanning");
      updateProgress(55, `Scanning followers list... ${followers} found`);
      updateStats(following, 0, 0);
      break;
    case "done":
      updateProgress(100, "Scan complete!");
      updateStats(following, followers, state.unfollowersCount || 0);
      setTimeout(() => showResults(state), 500);
      break;
  }
}

async function startScan() {
  showState("scanning");
  updateProgress(0, "Starting scan...");
  updateStats(0, 0, 0);
  if (chrome.action?.setBadgeText) chrome.action.setBadgeText({ text: "" });

  const tab = await getActiveTab();
  if (!tab?.id) { showError("No active tab found."); return; }

  const url = tab.url || "";
  if (!url.includes("open.spotify.com")) {
    showError("Please open open.spotify.com first.");
    return;
  }

  if (!url.includes("/user/")) {
    showError("Go to your profile page first. Click your profile picture then 'Profile'.");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "START_SCAN" }, (response) => {
    if (chrome.runtime.lastError) {
      showError("Cannot connect to Spotify page. Refresh the page and try again.");
    } else if (response?.error) {
      showError(response.error);
    } else if (response?.navigating) {
      updateProgress(5, "Navigating to following list...");
    }
  });
}

function init() {
  showState("loading");

  chrome.storage.local.get("scanState", (data) => {
    const state = data.scanState as ScanState | undefined;

    if (state?.error) {
      showError(state.error);
      return;
    }

    if (state?.phase === "done" && Array.isArray(state.unfollowersList)) {
      updateStats(state.followingCount, state.followersCount, state.unfollowersCount);
      showResults(state);
      return;
    }

    if (state && ACTIVE_SCAN_PHASES.includes(state.phase)) {
      showState("scanning");
      const following = state.followingCount || 0;

      if (state.phase === "navigate_following") {
        updateProgress(10, "Loading following list...");
      } else if (state.phase === "navigate_followers") {
        updateProgress(55, "Loading followers list...");
      }

      updateStats(following, 0, 0);
      return;
    }

    chrome.storage.local.set({ scanState: {
      phase: "idle", progress: 0, followingCount: 0, followersCount: 0, unfollowersCount: 0,
      followingList: [], followersList: [], unfollowersList: [], notFollowingBackList: [],
      notFollowingBackCount: 0, userId: null, userName: null, userImg: "", error: null
    } as ScanState }, showInitial);
  });
}

document.getElementById("btn-go-spotify")?.addEventListener("click", () => {
  getActiveTab().then(tab => {
    if (tab?.id && tab.url && tab.url.includes("open.spotify.com")) {
      chrome.tabs.update(tab.id, { url: "https://open.spotify.com" });
    } else {
      chrome.tabs.create({ url: "https://open.spotify.com" });
    }
  });
});

document.getElementById("btn-start-scan")?.addEventListener("click", () => startScan());
document.getElementById("btn-scan-again")?.addEventListener("click", () => startScan());
document.getElementById("btn-retry")?.addEventListener("click", () => startScan());
document.getElementById("btn-show-unfollowers")?.addEventListener("click", () => switchList("unfollowers"));
document.getElementById("btn-show-notfollow")?.addEventListener("click", () => switchList("notfollow"));

document.getElementById("btn-cancel-scan")?.addEventListener("click", () => {
  getActiveTab().then(tab => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "CANCEL_SCAN" }, () => {
      if (chrome.runtime.lastError) return;
    });
    updateProgress(100, "Cancelling scan...");
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.scanState) return;
  const state = changes.scanState.newValue as ScanState;
  if (!state) return;
  if (state.error) {
    showError(state.error);
    return;
  }
  handleStorageChange(state);
});

init();
