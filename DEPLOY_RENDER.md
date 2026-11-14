# Deploy to Render (multi-user bot)

Every person links their OWN number on `/pair` and gets their OWN dashboard. You (owner) get `/admin`.

1. Push this project to GitHub (`.env`, `data/`, `bin/` are git-ignored).
2. MongoDB Atlas (free): create a cluster + DB user, allow `0.0.0.0/0`, copy the connection string -> `MONGODB_URI`.
3. Render -> New -> **Blueprint** -> pick the repo (reads `render.yaml`).
4. Env vars: `OWNER_NUMBER`, `ADMIN_PASSWORD` (long!), `MONGODB_URI`. `SESSION_SECRET` is generated for you.
5. Deploy, then share `https://<app>.onrender.com/pair`.

## For users
- `/pair`: enter your number -> 8-character code, or switch to the QR tab and scan it.
  WhatsApp -> Linked devices -> Link a device. When it links you land on your dashboard.
- `/dashboard`: later logins: enter your number, a 6-digit code arrives in your own WhatsApp chat.
  You only see and control YOUR session: mode, prefix, restart, groups, send message, your logs, unlink.

## For you (owner)
- `/admin`: all sessions (restart, make public/private, remove), open/close public pairing, max sessions,
  send via any session, groups of any session, all logs.
- A session made with the old single-session setup (`SESSION_ID`, default `main`) is kept and shows as "legacy".
  Its owner rights still follow `OWNER_NUMBER`.

## Notes
- Each linked number costs roughly 40-80 MB RAM. Render free has 512 MB, so keep `MAX_SESSIONS` around 5-10.
- Sessions live in Mongo (ids start with `dtx_`) so they survive redeploys. Per-user settings stored in files
  (XP, welcome/goodbye, warns, antilink) live in `data/sessions/<id>/` and reset on the free plan's redeploys.
  Mode and prefix are saved in Mongo and survive.
- Free web services sleep after 15 min idle; the self-ping in `index.js` prevents that.
- YouTube/Instagram from datacenter IPs may ask for login -> add `cookies.txt`.
