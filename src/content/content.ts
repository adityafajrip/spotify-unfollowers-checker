const SCROLL_MAX_ITERS = 60;
const SCROLL_DELAY_MS = 500;
const INITIAL_DELAY_MS = 2000;

let scanAborted = false;

function handleStorageError() {
  if (chrome.runtime.lastError) {
    console.warn("SU: Storage error", chrome.runtime.lastError);
  }
}

function loadState() {
  return new Promise((resolve) => chrome.storage.local.get("scanState", (data) => {
    handleStorageError();
    resolve((data.scanState || {}) as any);
  }));
}

function saveState(patch: any) {
  return new Promise((resolve) => {
    chrome.storage.local.get("scanState", (data) => {
      handleStorageError();
      const state = { ...(data.scanState || {}), ...patch };
      chrome.storage.local.set({ scanState: state }, () => {
        handleStorageError();
        resolve(undefined);
      });
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractAvatar(link: HTMLElement | null) {
  if (!link) return "";
  const checks = [
    () => link.querySelector("img"),
    () => link.parentElement?.querySelector("img"),
    () => link.parentElement?.parentElement?.querySelector("img"),
    () => link.closest("[data-encore-id='card']")?.querySelector("img[data-testid='card-image']"),
    () => link.closest("[data-encore-id='card']")?.querySelector("img"),
  ];
  for (const fn of checks) {
    const img = fn() as HTMLImageElement | null;
    if (!img) continue;
    const src = img.getAttribute("src") || img.getAttribute("srcset") || "";
    if (!src) continue;
    if (src.includes("default") || src.includes("placeholder")) continue;
    if (src.includes("scdn.co") || src.includes("i.scdn.co")) return src;
  }
  return "";
}

function collectUsers(container: Element) {
  const ownId = getUserId();
  const links = container.querySelectorAll('a[href*="/user/"], a[href*="/artist/"]');
  const seen = new Map<string, any>();
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || seen.has(href)) return;
    if (ownId && href.endsWith("/" + ownId)) return;
    const name = link.textContent?.trim() || "";
    if (!name) return;
    const type = href.includes("/artist/") ? "artist" : "user";
    seen.set(href, {
      name,
      url: "https://open.spotify.com" + href,
      img: extractAvatar(link as HTMLElement),
      type,
    });
  });
  return Array.from(seen.values());
}

async function scrollPage(phase: 'navigate_following' | 'navigate_followers') {
  const container = document.querySelector("main") || document.body;
  let prev = 0;
  let stuckCount = 0;
  let lastReported = 0;
  for (let i = 0; i < SCROLL_MAX_ITERS; i++) {
    if (scanAborted) return collectUsers(container);
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY_MS);
    if (scanAborted) return collectUsers(container);
    const users = collectUsers(container);
    if (users.length !== lastReported) {
      lastReported = users.length;
      const patch = phase === "navigate_following"
        ? { followingCount: users.length }
        : { followersCount: users.filter((u: any) => u.type !== "artist").length };
      saveState(patch);
    }
    if (users.length === prev) {
      stuckCount++;
      if (stuckCount > 3) break;
    } else {
      stuckCount = 0;
    }
    prev = users.length;
  }
  return collectUsers(container);
}

function getUserId() {
  const m = window.location.href.match(/\/user\/([^/?]+)/);
  return m ? m[1] : null;
}

function getUserUrlBase() {
  const uid = getUserId();
  return uid ? "https://open.spotify.com/user/" + uid : null;
}

function scrapeProfile() {
  const uid = getUserId();
  const displayNameEl = document.querySelector("[data-testid='entityTitle'] h1[data-encore-id='text']");
  const displayName = displayNameEl ? displayNameEl.textContent?.trim() : uid;
  const avatarEl = document.querySelector("div[data-testid='user-image'] img") as HTMLImageElement | null;
  const avatarSrc = avatarEl ? (avatarEl.getAttribute("src") || "") : "";
  return { displayName: displayName || uid, avatarSrc };
}

async function scrapeFollowing() {
  return scrollPage("navigate_following");
}

async function scrapeFollowers() {
  return scrollPage("navigate_followers");
}

function compareLists(following: any[], followers: any[]) {
  const filteredFollowing = following.filter((u) => u.type !== "artist");
  const filteredFollowers = followers.filter((u) => u.type !== "artist");
  const followerIds = new Set(filteredFollowers.map((u) => u.url));
  const followingIds = new Set(filteredFollowing.map((u) => u.url));
  return {
    unfollowers: filteredFollowing.filter((u) => !followerIds.has(u.url)),
    notFollowingBack: filteredFollowers.filter((u) => !followingIds.has(u.url)),
  };
}

window.addEventListener("message", (event) => {
  if (event.origin !== "https://open.spotify.com") return;
  if (event.data?.type !== "__SU_PROFILE__") return;
  const { displayName, imgUrl, userId } = event.data as { displayName: string; imgUrl: string; userId: string };
  if (!displayName && !imgUrl) return;
  loadState().then((state: any) => {
    if (state.phase !== "navigate_following" && state.phase !== "navigate_followers") return;
    if (state.userId !== userId) return;
    const patch: any = {};
    if (displayName && state.userName === state.userId) patch.userName = displayName;
    if (imgUrl && !state.userImg) patch.userImg = imgUrl;
    if (Object.keys(patch).length) saveState(patch);
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "PING") { sendResponse({ ok: true }); return false; }

  if (msg.type === "CANCEL_SCAN") {
    scanAborted = true;
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "START_SCAN") {
    scanAborted = false;
    const uid = getUserId();
    const base = getUserUrlBase();
    if (!uid || !base) {
      sendResponse({ error: "Go to your profile page first (open.spotify.com/user/your_id)" });
      return true;
    }

    const { displayName, avatarSrc } = scrapeProfile();

    saveState({
      phase: "navigate_following",
      progress: 0,
      followingCount: 0, followersCount: 0, unfollowersCount: 0,
      followingList: [], followersList: [], unfollowersList: [],
      userId: uid, userName: displayName, userImg: avatarSrc,
      error: null,
    }).then(() => {
      window.location.href = base + "/following";
    });

    sendResponse({ ok: true, navigating: true });
    return false;
  }

  return false;
});

async function runPhase(state: any) {
  const uid = getUserId();
  const base = getUserUrlBase();
  if (!uid || !base) return;

  if (state.phase === "navigate_following") {
    const users = await scrapeFollowing();
    if (scanAborted) {
      await saveState({
        phase: "done",
        progress: 100,
        followingCount: users.length,
        followersCount: 0,
        unfollowersCount: 0,
        unfollowersList: [],
        notFollowingBackList: [],
        notFollowingBackCount: 0,
        userName: state.userName,
        userImg: state.userImg,
        userId: state.userId,
        error: "Scan cancelled. Partial following list saved (" + users.length + " users).",
      });
      window.location.href = base;
      return;
    }
    if (!users || users.length === 0) {
      await saveState({
        phase: "done",
        progress: 100,
        followingCount: 0,
        followersCount: 0,
        unfollowersCount: 0,
        unfollowersList: [],
        notFollowingBackList: [],
        notFollowingBackCount: 0,
        userName: state.userName,
        userImg: state.userImg,
        userId: state.userId,
        error: "No following users found. Private account or profile page is empty.",
      });
      window.location.href = base;
      return;
    }

    await saveState({
      phase: "navigate_followers",
      progress: 50,
      followingCount: users.length,
      followingList: users,
      userName: state.userName,
      userImg: state.userImg,
      userId: state.userId,
    });
    window.location.href = base + "/followers";
    return;
  }

  if (state.phase === "navigate_followers") {
    const following = state.followingList || [];
    const users = await scrapeFollowers();
    if (scanAborted) {
      const { unfollowers, notFollowingBack } = compareLists(following, users);
      await saveState({
        phase: "done",
        progress: 100,
        followingCount: following.length,
        followersCount: users.length,
        unfollowersCount: unfollowers.length,
        unfollowersList: unfollowers,
        notFollowingBackList: notFollowingBack,
        notFollowingBackCount: notFollowingBack.length,
        userName: state.userName,
        userImg: state.userImg,
        userId: state.userId,
        error: "Scan cancelled. Results based on partial followers list (" + users.length + " users).",
      });
      window.location.href = base;
      return;
    }
    if (!users || users.length === 0) {
      await saveState({
        phase: "done",
        progress: 100,
        followingCount: following.length,
        followersCount: 0,
        unfollowersCount: 0,
        unfollowersList: [],
        notFollowingBackList: [],
        notFollowingBackCount: 0,
        userName: state.userName,
        userImg: state.userImg,
        userId: state.userId,
        error: "No followers found. Profile is private or has no followers.",
      });
      window.location.href = base;
      return;
    }

    const { unfollowers, notFollowingBack } = compareLists(following, users);

    await saveState({
      phase: "done",
      progress: 100,
      followingCount: following.length,
      followersCount: users.length,
      unfollowersCount: unfollowers.length,
      unfollowersList: unfollowers,
      notFollowingBackList: notFollowingBack,
      notFollowingBackCount: notFollowingBack.length,
      userName: state.userName,
      userImg: state.userImg,
      userId: state.userId,
    });

    window.location.href = base;
    return;
  }
}

loadState().then(async (state: any) => {
  if (state.phase === "navigate_following" || state.phase === "navigate_followers") {
    await sleep(INITIAL_DELAY_MS);
    runPhase(state);
  }
});
