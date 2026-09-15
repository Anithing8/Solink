# SoLink

A social media command center: manage multiple accounts, draft and schedule
posts, track follower/engagement stats, and — with your own API keys — publish
for real to YouTube, X (Twitter), and Instagram from one place.

## Why there's a `/server` folder

A plain static site (like GitHub Pages) **cannot** publish to these platforms
directly:

- **X / Instagram** block direct browser requests (CORS).
- **YouTube / X / Instagram** all require signed OAuth requests. Doing that
  with secrets sitting in client-side JavaScript would expose your keys to
  anyone who opens dev tools.

So the frontend (`index.html`, `css/`, `js/`) is a static site you can host
anywhere, including GitHub Pages — and the `server/` folder is a small
Node/Express backend that does the actual API calls. The frontend sends your
keys to your own backend only at the moment you hit "Publish."

If a platform's keys aren't saved yet, SoLink disables/blocks publishing to
that platform and tells you exactly what's missing instead of failing
silently — check the 🔒 icon in Compose or the status pill in Accounts/Settings.

## Project structure

```
index.html          — app shell
css/style.css        — all styling
js/storage.js         — localStorage layer (accounts, posts, stats, keys)
js/api.js             — frontend client that calls the backend
js/app.js             — UI logic / rendering
server/server.js       — Express backend: real YouTube/X/Instagram calls
server/package.json
server/.env.example
```

## Running it locally

**1. Backend**
```bash
cd server
npm install
npm start
```
This starts the API at `http://localhost:8787`.

**2. Frontend**
Just open `index.html` in a browser, or serve the root folder with any static
server (e.g. `npx serve .`). By default `js/api.js` points at
`http://localhost:8787` — if you deploy the backend elsewhere, set
`window.SOLINK_API_BASE` before the other scripts load, e.g. add this in
`index.html` above the `<script src="js/api.js">` line:
```html
<script>window.SOLINK_API_BASE = "https://your-backend.onrender.com";</script>
```

**3. Add your API keys**
In the app, go to **Settings → API keys** and paste in credentials per
platform (see below for where to get each one). Keys are stored in your
browser's local storage and sent to your backend only when you publish —
never committed to git, never stored server-side.

## Where to get each platform's keys

- **X (Twitter):** [developer.twitter.com](https://developer.twitter.com) →
  create a project/app → set it to **Read and Write** → generate API key/secret
  and access token/secret (user context, not app-only).
- **YouTube:** [Google Cloud Console](https://console.cloud.google.com) →
  enable the YouTube Data API v3 → create an OAuth2 client → use
  [OAuth2 Playground](https://developers.google.com/oauthplayground) (or your
  own consent flow) with scope `https://www.googleapis.com/auth/youtube.upload`
  to get an access token. YouTube only supports video uploads via API — there's
  no "text post" endpoint.
- **Instagram:** [developers.facebook.com](https://developers.facebook.com) →
  set up the Graph API with an Instagram **Business** account connected to a
  Facebook Page → generate a Page access token with `instagram_content_publish`
  permission → find your IG Business Account ID. Instagram publishes by URL,
  so `mediaUrl` in a post must be a public image link.

## Deploying

- **Frontend:** GitHub Pages, Netlify, Vercel, or any static host — just the
  root folder (`index.html`, `css/`, `js/`).
- **Backend:** Render, Railway, Fly.io, or any Node host — deploy the
  `server/` folder, run `npm install && npm start`.

## What's real vs. what's local-only

| Feature | Status |
|---|---|
| Accounts, drafts, calendar, stats | Fully working, stored locally in your browser |
| Publish to X | Real API call once keys are added |
| Publish to YouTube | Real API call once keys are added (video upload only) |
| Publish to Instagram | Real API call once keys are added (image posts) |
| TikTok / LinkedIn | Tracked as accounts, but no publish integration yet — send manually |

## Backup

Settings → **Export backup** downloads your posts/accounts/stats as JSON (API
keys are intentionally excluded from exports). **Import backup** restores it.
