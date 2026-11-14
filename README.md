# DARK THILA X MD (base)

Clean single-session WhatsApp bot base (Node 20+, Baileys).

## Run
```bash
npm install
cp .env.example .env     # fill OWNER_NUMBER, PAIR_NUMBER, MONGODB_URI
npm start
```
- `PAIR_NUMBER` set: pairing code is printed in the log. Empty: QR in the terminal.
- `MONGODB_URI` set: session survives Render redeploys. Empty: SQLite in `data/`.

## Structure
```
index.js                 health server + start
src/config.js            env settings
src/connection.js        socket, auth, reconnect
src/handler.js           prefix/permission check, XP, runs the command
src/commands/*.js        1 file = 1 command (auto-loaded). See _TEMPLATE.txt
src/events/*.js          1 file = 1 event listener (auto-loaded)
src/lib/utils.js         sendImage, isAdmin (LID-safe), getText, serialize
src/lib/store.js         JSON store with safe read-modify-write
src/lib/xp.js            XP / level / rank
src/auth/                mongo + sqlite auth state
```

## Included
Main: .menu .alive .ping .mode
Group: .add .kick .promote .demote .setname .setdesc .setgroupdp .open .close .lock .unlock .link .revoke
       .tagall .hidetag .groupinfo .pinmsg .unpinmsg .disappear .welcome .setwelcome .setgoodbye .setwelcomeimg .setgoodbyeimg .level .leaderboard
Moderation: .antilink .antiflood .warn .warns .resetwarn .setwarnlimit .mute .unmute .mutelist
Status: .autostatusview .autostatusreact .autostatusreply .setstatusreact .setstatusreplymsg .statusinfo .send
Tools: .vv (reply to a view-once; the media is sent to your DM)
Download: .tt .fb .ig .pin .tw .song .video (+ call block)

Notes:
- `.pin` = Pinterest downloader, so message pinning is `.pinmsg` / `.unpinmsg`.
- Group admin commands need the BOT to be a group admin (add, kick, promote, open/close, antilink, mute...).
- Status settings are owner-only and saved in `data/status.json`; group settings in `data/group-*.json`.
- Welcome text uses `@user` and `@group`.

## Downloaders
- Link commands: `.tt <link>` `.fb <link>` `.ig <link>` `.pin <link>` `.tw <link>`. Also work by replying to a message that contains a link.
- `.song <name|link>` sends mp3, `.video <name|link>` sends 480p mp4 (max 20 / 15 min).
- Powered by yt-dlp (auto-downloaded into `bin/` on start, refreshed every 3 days) + ffmpeg-static. No python/ffmpeg install needed on Linux.
- TikTok uses the tikwm API first (no watermark, slideshows), yt-dlp as fallback. Pinterest falls back to og:image/og:video.
- Instagram and YouTube sometimes demand login: put a Netscape `cookies.txt` in the project root (or set `YT_COOKIES_FILE`).
- Files over ~95MB are refused (WhatsApp limit). Max 2 parallel downloads (`MAX_DOWNLOADS`).

## Rules learned the hard way
- Never add fake `forwardedNewsletterMessageInfo`: WhatsApp silently drops the message.
- Use `sendImage()` instead of inline `{ image: { url } }`.
- Admin checks compare phone digits and fail open (see `isAdmin`).
