// server.js — SoLink backend.
//
// This is the piece that actually talks to YouTube, X, and Instagram.
// It exists because none of those platforms let a browser page call them
// directly: X and Instagram block cross-origin requests, and all three
// require signed/OAuth-authenticated requests that should never be done
// with secrets sitting in client-side JavaScript.
//
// The frontend sends your API keys with each publish request (it does not
// store them here) — so there's nothing to configure server-side except
// optionally running this and pointing js/api.js at it.

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { TwitterApi } = require("twitter-api-v2");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8787;

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "solink-backend" });
});

/* ---------------------------------------------------------------- */
/* X (Twitter) — posts a text tweet using OAuth 1.0a user context.   */
/* Needs: apiKey, apiSecret, accessToken, accessSecret               */
/* (Get these from developer.twitter.com — your app must have        */
/* "Read and Write" permissions, and the access token/secret must    */
/* be the USER's, generated after enabling that permission.)         */
/* ---------------------------------------------------------------- */
app.post("/api/x/post", async (req, res) => {
  const { keys, caption } = req.body || {};
  const missing = requireKeys(keys, ["apiKey", "apiSecret", "accessToken", "accessSecret"]);
  if (missing.length) return res.status(400).json({ error: `Missing X credentials: ${missing.join(", ")}. Add them in Settings.` });

  try {
    const client = new TwitterApi({
      appKey: keys.apiKey,
      appSecret: keys.apiSecret,
      accessToken: keys.accessToken,
      accessSecret: keys.accessSecret
    });
    const { data } = await client.v2.tweet(caption || "");
    res.json({ message: "Tweet posted.", url: `https://x.com/i/web/status/${data.id}` });
  } catch (err) {
    res.status(400).json({ error: describeError(err) });
  }
});

/* ---------------------------------------------------------------- */
/* YouTube — uploads a video from a URL using an OAuth2 access token.*/
/* Needs: accessToken (and ideally refreshToken)                     */
/* mediaUrl is required — the Data API has no "text-only post"       */
/* endpoint, only video uploads.                                     */
/* Get an access token via Google OAuth2 Playground or your own      */
/* OAuth consent flow, scoped to https://www.googleapis.com/auth/youtube.upload */
/* ---------------------------------------------------------------- */
app.post("/api/youtube/post", async (req, res) => {
  const { keys, caption, mediaUrl } = req.body || {};
  const missing = requireKeys(keys, ["accessToken"]);
  if (missing.length) return res.status(400).json({ error: `Missing YouTube credentials: ${missing.join(", ")}. Add them in Settings.` });
  if (!mediaUrl) return res.status(400).json({ error: "YouTube requires a video file — add a media URL to this post." });

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: keys.accessToken, refresh_token: keys.refreshToken || undefined });
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const videoRes = await fetch(mediaUrl);
    if (!videoRes.ok) return res.status(400).json({ error: `Couldn't download the media URL (HTTP ${videoRes.status}).` });

    const upload = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: (caption || "New video").slice(0, 95) || "New video",
          description: caption || ""
        },
        status: { privacyStatus: "public" }
      },
      media: { body: videoRes.body }
    });

    res.json({ message: "Video uploaded to YouTube.", url: `https://youtube.com/watch?v=${upload.data.id}` });
  } catch (err) {
    res.status(400).json({ error: describeError(err) });
  }
});

/* ---------------------------------------------------------------- */
/* Instagram — publishes an image post via the Graph API.            */
/* Needs: accessToken (a Page/IG access token with the right scopes),*/
/* igUserId (your Instagram Business Account ID)                     */
/* mediaUrl is required — Instagram's API only publishes existing    */
/* public image/video URLs, it doesn't accept raw uploads here.      */
/* ---------------------------------------------------------------- */
app.post("/api/instagram/post", async (req, res) => {
  const { keys, caption, mediaUrl } = req.body || {};
  const missing = requireKeys(keys, ["accessToken", "igUserId"]);
  if (missing.length) return res.status(400).json({ error: `Missing Instagram credentials: ${missing.join(", ")}. Add them in Settings.` });
  if (!mediaUrl) return res.status(400).json({ error: "Instagram requires a public image/video URL — add one to this post." });

  try {
    const GRAPH = "https://graph.facebook.com/v19.0";

    // Step 1: create a media container
    const createRes = await fetch(`${GRAPH}/${keys.igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: mediaUrl,
        caption: caption || "",
        access_token: keys.accessToken
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) return res.status(400).json({ error: describeGraphError(createData) });

    // Step 2: publish the container
    const publishRes = await fetch(`${GRAPH}/${keys.igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: createData.id, access_token: keys.accessToken })
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) return res.status(400).json({ error: describeGraphError(publishData) });

    res.json({ message: "Published to Instagram.", url: `https://instagram.com` });
  } catch (err) {
    res.status(400).json({ error: describeError(err) });
  }
});

/* ---------------------------------------------------------------- */
function requireKeys(keys, fields) {
  const k = keys || {};
  return fields.filter(f => !(k[f] || "").toString().trim());
}
function describeError(err) {
  if (err && err.data && err.data.detail) return err.data.detail;
  if (err && err.message) return err.message;
  return "Unknown error contacting the platform API.";
}
function describeGraphError(data) {
  if (data && data.error && data.error.message) return data.error.message;
  return "Unknown error from the Instagram Graph API.";
}

app.listen(PORT, () => {
  console.log(`SoLink backend running on http://localhost:${PORT}`);
});
