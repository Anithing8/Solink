// app.js — UI wiring: rendering views, handling forms, tying storage.js and api.js together.

function go(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  document.querySelector(`.nav button[data-view="${view}"]`).classList.add("active");
  if (view === "dashboard") renderDashboard();
  if (view === "compose") renderCompose();
  if (view === "calendar") renderCalendar();
  if (view === "drafts") renderDrafts();
  if (view === "accounts") renderAccounts();
  if (view === "analytics") renderAnalytics();
  if (view === "settings") renderSettings();
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav button").forEach(b => b.addEventListener("click", () => go(b.dataset.view)));
  document.getElementById("caption").addEventListener("input", updateCharCount);
  document.getElementById("mediaUrl").addEventListener("input", updatePreview);
  renderDashboard();
  checkBackend();
});

async function checkBackend() {
  const ok = await pingBackend();
  const el = document.getElementById("backendStatus");
  if (!el) return;
  el.textContent = ok ? "Backend: connected" : "Backend: not running";
  el.className = ok ? "key-status ok" : "key-status missing";
}

function toast(msg, kind) {
  const t = document.createElement("div");
  t.className = "toast" + (kind ? " " + kind : "");
  t.textContent = msg;
  document.getElementById("toastWrap").appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const totalFollowers = DB.accounts.reduce((s, a) => s + (+a.followers || 0), 0);
  const scheduled = DB.posts.filter(p => p.status === "scheduled").length;
  const published = DB.posts.filter(p => p.status === "published").length;
  const drafts = DB.posts.filter(p => p.status === "draft").length;

  document.getElementById("statRow").innerHTML = `
    <div class="stat"><div class="label">Total followers</div><div class="value">${fmt(totalFollowers)}</div><div class="delta">across ${DB.accounts.length} account${DB.accounts.length === 1 ? "" : "s"}</div></div>
    <div class="stat"><div class="label">Scheduled</div><div class="value">${scheduled}</div><div class="delta">queued to go out</div></div>
    <div class="stat"><div class="label">Published</div><div class="value">${published}</div><div class="delta">sent so far</div></div>
    <div class="stat"><div class="label">Drafts</div><div class="value">${drafts}</div><div class="delta">not finished yet</div></div>
  `;

  const upcoming = DB.posts.filter(p => p.status === "scheduled").sort((a, b) => new Date(a.scheduleTime) - new Date(b.scheduleTime)).slice(0, 6);
  document.getElementById("upcomingCount").textContent = DB.posts.filter(p => p.status === "scheduled").length + " total";
  document.getElementById("upcomingList").innerHTML = upcoming.length ? upcoming.map(postRowHTML).join("") :
    `<div class="empty">Nothing scheduled. <a href="#" onclick="go('compose');return false;" style="color:var(--accent);font-weight:600;">Write a post</a> to fill your queue.</div>`;

  document.getElementById("dashAccounts").innerHTML = DB.accounts.length ? DB.accounts.map(a => `
    <div class="kv"><span>${escapeHtml(a.handle)} <span style="color:var(--ink-soft);">· ${a.platform}</span></span><b>${fmt(a.followers || 0)}</b></div>
  `).join("") : `<div class="empty">No accounts yet.</div>`;

  const recent = DB.posts.filter(p => p.status === "published").sort((a, b) => new Date(b.publishedAt || b.scheduleTime || 0) - new Date(a.publishedAt || a.scheduleTime || 0)).slice(0, 5);
  document.getElementById("recentPosts").innerHTML = recent.length ? recent.map(postRowHTML).join("") : `<div class="empty">Nothing published yet.</div>`;
}

function postRowHTML(p) {
  const accts = p.accountIds.map(id => DB.accounts.find(a => a.id === id)).filter(Boolean);
  const tags = accts.map(a => `<span class="tag" style="background:${a.color || PLATFORM_COLORS[a.platform]}">${a.platform}</span>`).join(" ");
  const when = p.status === "scheduled" ? "Scheduled · " + fmtDate(p.scheduleTime) : p.status === "published" ? "Published · " + fmtDate(p.publishedAt || p.scheduleTime) : "Draft";
  const failed = (p.publishResults || []).some(r => !r.ok);
  const statusPill = p.status === "published"
    ? (failed ? `<span class="status-pill fail">some failed</span>` : `<span class="status-pill ok">sent</span>`)
    : "";
  return `<div class="post-row" onclick="openPost('${p.id}')" style="cursor:pointer;">
    <div class="platform-dot" style="background:${accts[0] ? (accts[0].color || PLATFORM_COLORS[accts[0].platform]) : '#999'}"></div>
    <div class="post-body">
      <div class="cap">${escapeHtml(p.caption) || "<em style='color:var(--ink-soft)'>(no caption)</em>"}</div>
      <div class="post-meta">${tags} <span>${when}</span> ${statusPill}</div>
    </div>
  </div>`;
}

function openPost(id) {
  const p = DB.posts.find(x => x.id === id);
  if (!p) return;
  const accts = p.accountIds.map(aid => DB.accounts.find(a => a.id === aid)).filter(Boolean);
  const resultsHtml = (p.publishResults || []).map(r => `
    <div class="kv"><span>${r.platform}</span><span class="status-pill ${r.ok ? 'ok' : 'fail'}">${r.ok ? 'sent' : 'failed'}</span></div>
    ${!r.ok ? `<div style="font-size:11.5px;color:var(--bad);margin:-4px 0 6px;">${escapeHtml(r.message || '')}</div>` : ""}
  `).join("");

  document.getElementById("postModalContent").innerHTML = `
    <h3>Post details</h3>
    <div class="field"><label>Caption</label><div style="font-size:13.5px;white-space:pre-wrap;">${escapeHtml(p.caption) || "(none)"}</div></div>
    ${p.mediaUrl ? `<div class="field"><label>Media</label><div style="font-size:12.5px;word-break:break-all;color:var(--ink-soft);">${escapeHtml(p.mediaUrl)}</div></div>` : ""}
    <div class="field"><label>Accounts</label><div>${accts.map(a => `<span class="tag" style="background:${a.color || PLATFORM_COLORS[a.platform]};margin-right:5px;">${a.platform} ${escapeHtml(a.handle)}</span>`).join("")}</div></div>
    <div class="field"><label>Status</label><div style="font-size:13px;text-transform:capitalize;">${p.status} ${p.scheduleTime ? "· " + fmtDate(p.scheduleTime) : ""}</div></div>
    ${resultsHtml ? `<div class="field"><label>Publish results</label>${resultsHtml}</div>` : ""}
    <div class="modal-actions">
      ${p.status === "scheduled" ? `<button class="btn secondary" onclick="attemptPublish('${p.id}')">Publish now</button>` : ""}
      ${p.status !== "published" ? `<button class="btn danger" onclick="deletePost('${p.id}')">Delete</button>` : ""}
      <button class="btn secondary" onclick="closePostModal()">Close</button>
    </div>
  `;
  document.getElementById("postModalBg").classList.add("active");
}
function closePostModal() { document.getElementById("postModalBg").classList.remove("active"); }

async function attemptPublish(id) {
  const p = DB.posts.find(x => x.id === id);
  if (!p) return;
  toast("Publishing…");
  const results = await publishPostEverywhere(p);
  p.publishResults = results;
  const anyOk = results.some(r => r.ok);
  const allOk = results.every(r => r.ok);
  p.status = "published";
  p.publishedAt = new Date().toISOString();
  persist();
  openPost(id);
  refreshBackground();
  if (allOk) toast("Published everywhere.", "ok");
  else if (anyOk) toast("Published to some accounts — check details.", "err");
  else toast("Publishing failed. Check API keys in Settings.", "err");
}

function deletePost(id) {
  DB.posts = DB.posts.filter(x => x.id !== id);
  persist(); closePostModal(); refreshCurrentView(); toast("Post deleted.");
}

/* ---------- Compose ---------- */
let selectedAccountIds = new Set();
function renderCompose() {
  selectedAccountIds = new Set();
  document.getElementById("composeAccounts").innerHTML = DB.accounts.length ? DB.accounts.map(a => {
    const hasKeys = platformHasKeys(a.platform);
    const isIntegrated = !!PLATFORM_KEY_FIELDS[a.platform];
    return `
    <label class="platform-pick" id="pick-${a.id}">
      <input type="checkbox" onchange="toggleAccount('${a.id}')">
      <span class="swatch" style="background:${a.color || PLATFORM_COLORS[a.platform]}"></span>
      ${a.platform} · ${escapeHtml(a.handle)}
      ${isIntegrated && !hasKeys ? `<span class="lock-ico" title="No API key set for ${a.platform}">🔒</span>` : ""}
    </label>`;
  }).join("") : `<div class="empty">Add an account first, in the Accounts tab.</div>`;
  document.getElementById("caption").value = "";
  document.getElementById("mediaUrl").value = "";
  document.getElementById("scheduleTime").value = "";
  updateCharCount();
  updatePreview();
}
function toggleAccount(id) {
  const el = document.getElementById("pick-" + id);
  if (selectedAccountIds.has(id)) { selectedAccountIds.delete(id); el.classList.remove("checked"); }
  else { selectedAccountIds.add(id); el.classList.add("checked"); }
  updateCharCount(); updatePreview();
}
function updateCharCount() {
  const len = document.getElementById("caption").value.length;
  document.getElementById("charcount").textContent = len + " characters";
  const warnBox = document.getElementById("limitWarnings");
  let warnings = [];
  selectedAccountIds.forEach(id => {
    const a = DB.accounts.find(x => x.id === id);
    if (!a) return;
    const limit = PLATFORM_LIMITS[a.platform];
    if (limit && len > limit) warnings.push(`<span class="warn">Over ${a.platform}'s ${limit}-character limit by ${len - limit}.</span>`);
    if (PLATFORM_KEY_FIELDS[a.platform] && !platformHasKeys(a.platform)) {
      warnings.push(`<span class="warn">No API key saved for ${a.platform} yet — <a href="#" onclick="go('settings');return false;" style="color:var(--bad);">add one in Settings</a> to publish automatically, or send it manually.</span>`);
    }
  });
  warnBox.innerHTML = warnings.join("<br>");
  updatePreview();
}
function updatePreview() {
  const cap = document.getElementById("caption").value;
  const media = document.getElementById("mediaUrl").value;
  const box = document.getElementById("composePreview");
  if (!cap && !media && selectedAccountIds.size === 0) {
    box.innerHTML = `<div class="empty">Your post preview appears here as you type.</div>`;
    return;
  }
  const accts = [...selectedAccountIds].map(id => DB.accounts.find(a => a.id === id)).filter(Boolean);
  box.innerHTML = `
    ${accts.length ? `<div style="margin-bottom:10px;">${accts.map(a => `<span class="tag" style="background:${a.color || PLATFORM_COLORS[a.platform]};margin-right:5px;">${a.platform}</span>`).join("")}</div>` : ""}
    ${media ? `<div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:8px;word-break:break-all;">🔗 ${escapeHtml(media)}</div>` : ""}
    <div style="font-size:13.5px;white-space:pre-wrap;line-height:1.55;">${escapeHtml(cap) || "<em style='color:var(--ink-soft)'>No caption yet</em>"}</div>
  `;
}

function buildPostFromForm(status) {
  const caption = document.getElementById("caption").value.trim();
  const mediaUrl = document.getElementById("mediaUrl").value.trim();
  const scheduleTime = document.getElementById("scheduleTime").value;
  if (status !== "draft" && selectedAccountIds.size === 0) { toast("Pick at least one account."); return null; }
  return {
    id: cuid(),
    caption, mediaUrl,
    accountIds: [...selectedAccountIds],
    scheduleTime: scheduleTime || null,
    status,
    createdAt: new Date().toISOString(),
    publishedAt: null,
    publishResults: []
  };
}
function saveDraft() {
  const p = buildPostFromForm("draft");
  if (!p) return;
  DB.posts.push(p); persist();
  toast("Draft saved."); go("drafts");
}
function scheduleForLater() {
  const scheduleTime = document.getElementById("scheduleTime").value;
  if (!scheduleTime) { toast("Pick a schedule time first, or use Publish now."); return; }
  const p = buildPostFromForm("scheduled");
  if (!p) return;
  DB.posts.push(p); persist();
  toast("Post scheduled.");
  go("dashboard");
}
async function publishNow() {
  const p = buildPostFromForm("draft"); // build as draft, then attempt publish
  if (!p) return;
  DB.posts.push(p); persist();
  toast("Publishing…");
  const results = await publishPostEverywhere(p);
  p.publishResults = results;
  p.status = "published";
  p.publishedAt = new Date().toISOString();
  persist();
  const allOk = results.every(r => r.ok);
  const anyOk = results.some(r => r.ok);
  if (allOk) toast("Published to every selected account.", "ok");
  else if (anyOk) toast("Published to some accounts — open the post for details.", "err");
  else toast("Nothing published — check API keys in Settings.", "err");
  go("dashboard");
}

/* ---------- Calendar ---------- */
let calCursor = new Date();
function calShift(dir) {
  if (dir === 0) { calCursor = new Date(); } else { calCursor.setMonth(calCursor.getMonth() + dir); }
  renderCalendar();
}
function renderCalendar() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  document.getElementById("calMonthLabel").textContent = calCursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const firstDay = new Date(y, m, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const today = new Date();

  let cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, other: true, dateObj: new Date(y, m - 1, daysInPrevMonth - i) });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false, dateObj: new Date(y, m, d) });
  while (cells.length % 7 !== 0) {
    const nextD = cells.length - (startOffset + daysInMonth) + 1;
    cells.push({ day: nextD, other: true, dateObj: new Date(y, m + 1, nextD) });
  }

  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join("");

  html += cells.map(c => {
    const isToday = c.dateObj.toDateString() === today.toDateString();
    const dayPosts = DB.posts.filter(p => p.scheduleTime && new Date(p.scheduleTime).toDateString() === c.dateObj.toDateString());
    const postsHtml = dayPosts.slice(0, 3).map(p => {
      const a = DB.accounts.find(x => x.id === p.accountIds[0]);
      const color = a ? (a.color || PLATFORM_COLORS[a.platform]) : "#999";
      return `<div class="cal-post" style="background:${color}" onclick="openPost('${p.id}')" title="${escapeHtml(p.caption)}">${escapeHtml(p.caption) || "(no caption)"}</div>`;
    }).join("");
    const more = dayPosts.length > 3 ? `<div style="font-size:10px;color:var(--ink-soft);">+${dayPosts.length - 3} more</div>` : "";
    return `<div class="cal-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}"><div class="datenum">${c.day}</div>${postsHtml}${more}</div>`;
  }).join("");

  document.getElementById("calGrid").innerHTML = html;
}

/* ---------- Drafts / queue ---------- */
function renderDrafts() {
  const drafts = DB.posts.filter(p => p.status === "draft").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const scheduled = DB.posts.filter(p => p.status === "scheduled").sort((a, b) => new Date(a.scheduleTime) - new Date(b.scheduleTime));
  const published = DB.posts.filter(p => p.status === "published").sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  document.getElementById("draftsList").innerHTML = drafts.length ? drafts.map(postRowHTML).join("") : `<div class="empty">No drafts.</div>`;
  document.getElementById("scheduledList").innerHTML = scheduled.length ? scheduled.map(postRowHTML).join("") : `<div class="empty">Nothing scheduled.</div>`;
  document.getElementById("publishedList").innerHTML = published.length ? published.map(postRowHTML).join("") : `<div class="empty">Nothing published yet.</div>`;
}

/* ---------- Accounts ---------- */
function renderAccounts() {
  document.getElementById("acctGrid").innerHTML = DB.accounts.length ? DB.accounts.map(a => {
    const initials = (a.handle || a.platform).replace("@", "").slice(0, 2).toUpperCase();
    const postsCount = DB.posts.filter(p => p.accountIds.includes(a.id)).length;
    const integrated = !!PLATFORM_KEY_FIELDS[a.platform];
    const hasKeys = platformHasKeys(a.platform);
    return `<div class="acct-card">
      <div class="top">
        <div class="acct-avatar" style="background:${a.color || PLATFORM_COLORS[a.platform]}">${initials}</div>
        <div><div class="handle">${escapeHtml(a.handle)}</div><div class="plat">${a.platform}</div></div>
      </div>
      <div class="acct-stats">
        <div><b>${fmt(a.followers || 0)}</b>followers</div>
        <div><b>${postsCount}</b>posts</div>
      </div>
      ${integrated ? `<div class="key-status ${hasKeys ? 'ok' : 'missing'}">${hasKeys ? 'API key connected' : 'No API key — add one in Settings'}</div>` : `<div class="key-status missing">No auto-publish integration for ${a.platform} yet</div>`}
      <div class="row-actions">
        <button class="btn secondary small" onclick="openAcctModal('${a.id}')">Edit</button>
        ${integrated ? `<button class="btn secondary small" onclick="go('settings')">${hasKeys ? 'Manage key' : 'Add key'}</button>` : ""}
        <button class="btn danger small" onclick="deleteAccount('${a.id}')">Remove</button>
      </div>
    </div>`;
  }).join("") : `<div class="empty">No accounts yet. Add your first one.</div>`;
}
function openAcctModal(id) {
  document.getElementById("acctEditId").value = id || "";
  if (id) {
    const a = DB.accounts.find(x => x.id === id);
    document.getElementById("acctModalTitle").textContent = "Edit account";
    document.getElementById("acctPlatform").value = a.platform;
    document.getElementById("acctHandle").value = a.handle;
    document.getElementById("acctFollowers").value = a.followers || 0;
  } else {
    document.getElementById("acctModalTitle").textContent = "Add account";
    document.getElementById("acctPlatform").value = "YouTube";
    document.getElementById("acctHandle").value = "";
    document.getElementById("acctFollowers").value = "";
  }
  document.getElementById("acctModalBg").classList.add("active");
}
function closeAcctModal() { document.getElementById("acctModalBg").classList.remove("active"); }
function saveAccount() {
  const id = document.getElementById("acctEditId").value;
  const platform = document.getElementById("acctPlatform").value;
  const handle = document.getElementById("acctHandle").value.trim() || "@untitled";
  const followers = +document.getElementById("acctFollowers").value || 0;
  if (id) {
    const a = DB.accounts.find(x => x.id === id);
    Object.assign(a, { platform, handle, followers });
  } else {
    DB.accounts.push({ id: cuid(), platform, handle, followers, color: PLATFORM_COLORS[platform] });
  }
  persist(); closeAcctModal(); renderAccounts(); toast("Account saved.");
}
function deleteAccount(id) {
  if (!confirm("Remove this account?")) return;
  DB.accounts = DB.accounts.filter(a => a.id !== id);
  persist(); renderAccounts(); toast("Account removed.");
}

/* ---------- Analytics ---------- */
function renderAnalytics() {
  const maxF = Math.max(1, ...DB.accounts.map(a => +a.followers || 0));
  document.getElementById("followerChart").innerHTML = DB.accounts.length ? DB.accounts.map(a => {
    const h = Math.max(4, Math.round(((+a.followers || 0) / maxF) * 150));
    return `<div class="bar-col"><div class="bar-val">${fmt(a.followers || 0)}</div><div class="bar" style="height:${h}px;background:${a.color || PLATFORM_COLORS[a.platform]}"></div><div class="bar-label">${a.platform}</div></div>`;
  }).join("") : `<div class="empty">Add accounts to see this chart.</div>`;

  const tbody = document.querySelector("#statTable tbody");
  const rows = [...DB.stats].sort((a, b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = rows.length ? rows.map(s => {
    const a = DB.accounts.find(x => x.id === s.accountId);
    return `<tr><td>${escapeHtml(s.date)}</td><td>${a ? escapeHtml(a.handle) : "(removed)"}</td><td>${fmt(s.followers)}</td><td>${fmt(s.views)}</td><td>${s.engagement}%</td><td><button class="btn danger small" onclick="deleteStat('${s.id}')">Delete</button></td></tr>`;
  }).join("") : `<tr><td colspan="6" style="color:var(--ink-soft);">No entries logged yet.</td></tr>`;
}
function openStatModal() {
  document.getElementById("statAccount").innerHTML = DB.accounts.map(a => `<option value="${a.id}">${a.platform} · ${escapeHtml(a.handle)}</option>`).join("");
  document.getElementById("statDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("statFollowers").value = "";
  document.getElementById("statViews").value = "";
  document.getElementById("statEngagement").value = "";
  document.getElementById("statModalBg").classList.add("active");
}
function closeStatModal() { document.getElementById("statModalBg").classList.remove("active"); }
function saveStat() {
  const accountId = document.getElementById("statAccount").value;
  if (!accountId) { toast("Add an account first."); return; }
  const entry = {
    id: cuid(), accountId,
    date: document.getElementById("statDate").value || new Date().toISOString().slice(0, 10),
    followers: +document.getElementById("statFollowers").value || 0,
    views: +document.getElementById("statViews").value || 0,
    engagement: +document.getElementById("statEngagement").value || 0
  };
  DB.stats.push(entry);
  const a = DB.accounts.find(x => x.id === accountId);
  if (a && entry.followers) a.followers = entry.followers;
  persist(); closeStatModal(); renderAnalytics(); toast("Stats logged.");
}
function deleteStat(id) {
  DB.stats = DB.stats.filter(s => s.id !== id);
  persist(); renderAnalytics();
}

/* ---------- Settings ---------- */
function renderSettings() {
  document.getElementById("apiNotes").value = DB.notes || "";
  const box = document.getElementById("apiKeysBox");
  box.innerHTML = Object.keys(PLATFORM_KEY_FIELDS).map(platform => {
    const fields = PLATFORM_KEY_FIELDS[platform];
    const saved = KEYS[platform] || {};
    const hasKeys = platformHasKeys(platform);
    return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <h2>${platform}</h2>
        <span class="key-status ${hasKeys ? 'ok' : 'missing'}">${hasKeys ? 'Connected' : 'Missing keys'}</span>
      </div>
      <div class="panel-body">
        ${fields.map(f => `
          <div class="field">
            <label>${f.label}${f.optional ? ' (optional)' : ''}</label>
            <div class="key-field">
              <input type="password" id="key-${platform}-${f.name}" value="${escapeHtml(saved[f.name] || '')}" placeholder="Paste your ${f.label.toLowerCase()}">
            </div>
          </div>
        `).join("")}
        <button class="btn secondary small" onclick="saveKeysFor('${platform}')">Save ${platform} keys</button>
        ${hasKeys ? `<button class="btn danger small" onclick="clearKeysFor('${platform}')">Clear</button>` : ""}
      </div>
    </div>`;
  }).join("");
  checkBackend();
}
function saveKeysFor(platform) {
  const fields = PLATFORM_KEY_FIELDS[platform];
  const values = {};
  fields.forEach(f => { values[f.name] = document.getElementById(`key-${platform}-${f.name}`).value.trim(); });
  KEYS[platform] = values;
  persistKeys();
  toast(`${platform} keys saved.`, "ok");
  renderSettings();
}
function clearKeysFor(platform) {
  KEYS[platform] = {};
  persistKeys();
  toast(`${platform} keys cleared.`);
  renderSettings();
}
function saveNotes() {
  DB.notes = document.getElementById("apiNotes").value;
  persist(); toast("Notes saved.");
}
function exportData() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "solink-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click(); URL.revokeObjectURL(url);
  toast("Backup downloaded (this does not include API keys).");
}
function importData(evt) {
  const file = evt.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.accounts || !data.posts) throw new Error("bad shape");
      DB = data; persist();
      toast("Backup imported.");
      refreshCurrentView();
    } catch (e) { toast("That file doesn't look like a SoLink backup."); }
  };
  reader.readAsText(file);
}
function resetAll() {
  if (!confirm("This deletes all posts/accounts/stats stored in this browser (API keys are kept separately and untouched). Continue?")) return;
  localStorage.removeItem(DB_KEY);
  DB = loadDB(); persist();
  refreshCurrentView();
  toast("Data reset.");
}

/* ---------- Helpers ---------- */
function fmt(n) {
  n = +n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function refreshCurrentView() {
  const active = document.querySelector(".view.active").id.replace("view-", "");
  go(active);
}
function refreshBackground() {
  const active = document.querySelector(".view.active").id.replace("view-", "");
  if (["dashboard", "drafts", "calendar"].includes(active)) go(active);
}
document.getElementById("postModalBg").addEventListener("click", e => { if (e.target.id === "postModalBg") closePostModal(); });
document.getElementById("acctModalBg").addEventListener("click", e => { if (e.target.id === "acctModalBg") closeAcctModal(); });
document.getElementById("statModalBg").addEventListener("click", e => { if (e.target.id === "statModalBg") closeStatModal(); });
