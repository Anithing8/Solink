// api.js — frontend client for the SoLink backend (see /server).
// The backend is what actually talks to YouTube / X / Instagram, because
// those APIs either require OAuth signing or block direct browser calls
// with CORS. This file just packages the request and reports what happened.

// Change this if you deploy the backend somewhere other than localhost.
const API_BASE = (window.SOLINK_API_BASE || "http://localhost:8787");

async function pingBackend() {
  try {
    const res = await fetch(API_BASE + "/api/health", { method: "GET" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Publishes one post to one platform. Returns { ok, message, url? }
async function publishToPlatform(platform, account, post) {
  const keys = KEYS[platform] || {};
  const endpointMap = { YouTube: "/api/youtube/post", X: "/api/x/post", Instagram: "/api/instagram/post" };
  const endpoint = endpointMap[platform];

  if (!endpoint) {
    return { ok: false, message: `${platform} doesn't have an automatic publish integration yet — post it manually.` };
  }
  if (!platformHasKeys(platform)) {
    return { ok: false, message: `Missing API credentials for ${platform}. Add them in Settings → API Keys.`, needsKeys: true };
  }

  try {
    const res = await fetch(API_BASE + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keys,
        account: { handle: account.handle, igUserId: keys.igUserId },
        caption: post.caption,
        mediaUrl: post.mediaUrl || null
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: data.error || `${platform} rejected the request (HTTP ${res.status}).` };
    }
    return { ok: true, message: data.message || "Published.", url: data.url };
  } catch (e) {
    return { ok: false, message: `Couldn't reach the SoLink backend at ${API_BASE}. Is the server running? (see /server/README)` };
  }
}

// Publishes to every account attached to a post, sequentially, and
// returns a per-account result list so the UI can show exactly what
// succeeded and what didn't.
async function publishPostEverywhere(post) {
  const results = [];
  for (const accountId of post.accountIds) {
    const account = DB.accounts.find(a => a.id === accountId);
    if (!account) continue;
    const result = await publishToPlatform(account.platform, account, post);
    results.push({ accountId, platform: account.platform, ...result });
  }
  return results;
}
