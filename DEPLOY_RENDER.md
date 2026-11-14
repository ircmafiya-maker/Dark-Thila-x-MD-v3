# Deploy to Render

1. Push this project to a GitHub repo (`.env`, `data/`, `bin/` are git-ignored).
2. MongoDB Atlas (free): create a cluster, a DB user, allow `0.0.0.0/0` network access, copy the connection string -> `MONGODB_URI`.
3. Render -> New -> **Blueprint** -> pick the repo (reads `render.yaml`). Or New -> Web Service with
   Build `npm install`, Start `npm start`, Health check path `/health`.
4. Fill the env vars: `OWNER_NUMBER`, `PAIR_NUMBER`, `MONGODB_URI` (digits only for numbers).
5. Deploy, open the Logs tab: the **pairing code** is printed. WhatsApp -> Linked devices -> Link with phone number -> enter the code.
6. After pairing, the session is stored in Mongo, so redeploys/restarts won't need pairing again.

Notes
- Free plan: the disk is wiped on every redeploy/restart. Session is safe in Mongo, but `data/*.json`
  (XP, welcome/goodbye text, warns, antilink and status settings) resets. A paid plan with a persistent disk
  mounted at `/opt/render/project/src/data` keeps them.
- Free web services sleep after 15 min idle. The built-in self-ping (index.js) prevents that; an external
  pinger (UptimeRobot on `https://<app>.onrender.com/health`) makes it more reliable.
- Downloaders: yt-dlp downloads itself into `bin/` at start. YouTube from datacenter IPs often asks for login -> add `cookies.txt`.
