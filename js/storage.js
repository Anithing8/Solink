// storage.js — everything about persisting data in the browser.
// Post/account/stat data lives in localStorage. API keys also live in
// localStorage (never on a server) and are sent to the backend only
// at the moment you publish a post.

const DB_KEY = "solink_data_v1";
const KEYS_KEY = "solink_keys_v1";

const PLATFORM_LIMITS = { YouTube: 5000, Instagram: 2200, X: 280, TikTok: 2200, LinkedIn: 3000 };
const PLATFORM_COLORS = { YouTube: "#C4302B", Instagram: "#B23A72", X: "#181A2A", TikTok: "#1F8E82", LinkedIn: "#2457A5" };

// Which credential fields each platform needs before it can actually publish.
const PLATFORM_KEY_FIELDS = {
  YouTube: [
    { name: "accessToken", label: "OAuth2 access token" },
    { name: "refreshToken", label: "OAuth2 refresh token (optional)", optional: true }
  ],
  X: [
    { name: "apiKey", label: "API key" },
    { name: "apiSecret", label: "API key secret" },
    { name: "accessToken", label: "Access token" },
    { name: "accessSecret", label: "Access token secret" }
  ],
  Instagram: [
    { name: "accessToken", label: "Page/IG access token" },
    { name: "igUserId", label: "Instagram Business account ID" }
  ]
};

function cuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    accounts: [
      { id: cuid(), platform: "YouTube", handle: "@yourchannel", followers: 0, color: PLATFORM_COLORS.YouTube },
      { id: cuid(), platform: "Instagram", handle: "@yourhandle", followers: 0, color: PLATFORM_COLORS.Instagram },
      { id: cuid(), platform: "X", handle: "@yourhandle", followers: 0, color: PLATFORM_COLORS.X }
    ],
    posts: [],
    stats: [],
    notes: ""
  };
}

function loadKeys() {
  try {
    const raw = localStorage.getItem(KEYS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { YouTube: {}, X: {}, Instagram: {} };
}

let DB = loadDB();
let KEYS = loadKeys();

function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
}
function persistKeys() {
  localStorage.setItem(KEYS_KEY, JSON.stringify(KEYS));
}

// Returns true only if every required field for a platform has a non-empty value.
function platformHasKeys(platform) {
  const fields = PLATFORM_KEY_FIELDS[platform];
  if (!fields) return true; // platforms with no publish integration yet (TikTok, LinkedIn) are treated as "manual"
  const saved = KEYS[platform] || {};
  return fields.filter(f => !f.optional).every(f => (saved[f.name] || "").trim().length > 0);
}

function missingKeyFields(platform) {
  const fields = PLATFORM_KEY_FIELDS[platform] || [];
  const saved = KEYS[platform] || {};
  return fields.filter(f => !f.optional && !(saved[f.name] || "").trim());
}
