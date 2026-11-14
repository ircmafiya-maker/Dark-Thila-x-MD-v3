// HTML for the home, pair and admin pages. No external assets, works on phones.
import { config } from '../config.js';

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const ICONS = {
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .6 3.2 2.4 3.5 5.2"/>',
  term: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 10l3 2-3 2M12.5 15H17"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

const CSS = `
:root{--bg:#07070c;--card:rgba(255,255,255,.035);--card2:rgba(255,255,255,.06);--line:rgba(255,255,255,.09);--fg:#f1f1f7;--mut:#9494ab;--a1:#8b5cf6;--a2:#ec4899;--ok:#34d399;--warn:#fbbf24;--bad:#f87171;--r:16px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
background:radial-gradient(900px 500px at 10% -10%,rgba(139,92,246,.22),transparent 60%),radial-gradient(800px 500px at 100% 0%,rgba(236,72,153,.16),transparent 55%),var(--bg);background-attachment:fixed}
a{color:inherit;text-decoration:none}.wrap{max-width:1080px;margin:0 auto;padding:18px 16px 56px}
.nav{display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:22px;border:1px solid var(--line);border-radius:999px;background:rgba(10,10,18,.6);backdrop-filter:blur(14px);position:sticky;top:10px;z-index:5}
.logo{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,var(--a1),var(--a2));display:grid;place-items:center;font-weight:800;font-size:13px;letter-spacing:.5px;box-shadow:0 6px 22px rgba(139,92,246,.45)}
.brand{font-weight:700;letter-spacing:.4px}.brand small{display:block;font-weight:500;color:var(--mut);font-size:11px;letter-spacing:.3px;margin-top:-2px}
.sp{flex:1}.links{display:flex;gap:6px;align-items:center}
.lnk{padding:7px 14px;border-radius:999px;font-size:14px;color:var(--mut);border:1px solid transparent}.lnk:hover{color:var(--fg);background:var(--card2)}.lnk.on{color:var(--fg);background:var(--card2);border-color:var(--line)}
.hero{text-align:center;margin:34px auto 26px;max-width:620px}
.hero h1{margin:14px 0 8px;font-size:clamp(28px,6vw,40px);line-height:1.1;letter-spacing:-.5px}
.grad{background:linear-gradient(90deg,#c4b5fd,#f9a8d4);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{color:var(--mut);margin:0}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:20px;backdrop-filter:blur(10px)}
.card h2{display:flex;align-items:center;gap:8px;font-size:12px;margin:0 0 14px;color:var(--mut);text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.ic{width:17px;height:17px;flex:none}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}.full{grid-column:1/-1}
.stats{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:14px}
.stat{padding:16px 18px;border:1px solid var(--line);border-radius:var(--r);background:var(--card)}
.stat .l{display:flex;align-items:center;gap:7px;color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.stat .v{font-size:24px;font-weight:700;margin-top:6px;letter-spacing:-.3px}.stat .v small{font-size:13px;color:var(--mut);font-weight:500}
label{display:block;font-size:13px;color:var(--mut);margin:0 0 6px}
input,select,textarea{width:100%;background:rgba(0,0,0,.35);border:1px solid var(--line);color:var(--fg);border-radius:12px;padding:12px 14px;font:inherit;margin-bottom:12px}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--a1);box-shadow:0 0 0 3px rgba(139,92,246,.25)}
button{background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;border:0;border-radius:12px;padding:11px 18px;font:inherit;font-weight:600;cursor:pointer;transition:transform .08s,filter .15s}
button:hover{filter:brightness(1.12)}button:active{transform:scale(.98)}button:disabled{opacity:.5;cursor:default}
button.ghost{background:var(--card2);border:1px solid var(--line);color:var(--fg)}button.bad{background:linear-gradient(135deg,#ef4444,#f97316)}button.ok{background:linear-gradient(135deg,#10b981,#34d399);color:#03271a}
button.sm{padding:6px 12px;font-size:13px;border-radius:9px}.block{width:100%}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.pill{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:4px 12px;font-size:13px;font-weight:600;text-transform:capitalize}
.dot{width:8px;height:8px;border-radius:50%;background:var(--mut)}
.online .dot{background:var(--ok);box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:pulse 2s infinite}.connecting .dot,.reconnecting .dot,.starting .dot{background:var(--warn)}.logged_out .dot{background:var(--bad)}
@keyframes pulse{70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
.kv{display:grid;grid-template-columns:auto 1fr;gap:9px 16px;font-size:14px}.kv span:nth-child(odd){color:var(--mut)}.kv span:nth-child(even){text-align:right;word-break:break-all;font-weight:500}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:5px;border:1px solid var(--line);border-radius:14px;background:rgba(0,0,0,.3);margin-bottom:18px}
.tab{background:transparent;color:var(--mut);border-radius:10px;display:flex;gap:8px;align-items:center;justify-content:center}.tab.on{background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;box-shadow:0 6px 18px rgba(139,92,246,.35)}
.code{display:flex;gap:7px;justify-content:center;margin:6px 0 10px}
.code b{width:clamp(30px,9vw,42px);height:clamp(42px,12vw,56px);display:grid;place-items:center;border-radius:11px;background:rgba(0,0,0,.4);border:1px solid var(--line);font:700 clamp(18px,5vw,26px) ui-monospace,Menlo,Consolas,monospace}
.code i{align-self:center;color:var(--mut);font-style:normal}
.qrbox{width:min(300px,100%);aspect-ratio:1;margin:4px auto 12px;border-radius:16px;background:#fff;padding:10px;display:grid;place-items:center;color:#555;text-align:center;font-size:14px}
.qrbox img{width:100%;height:100%;display:block;image-rendering:pixelated}
.steps{margin:16px 0 0;padding:0;list-style:none;counter-reset:s;display:grid;gap:9px}
.steps li{counter-increment:s;display:flex;gap:11px;color:var(--mut);font-size:14px}.steps li:before{content:counter(s);flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--a1),var(--a2))}
.steps b{color:var(--fg);font-weight:600}
.msg{padding:11px 14px;border-radius:12px;margin:10px 0;font-size:14px;display:none}.msg.show{display:block}.msg.err{background:rgba(248,113,113,.12);color:#fca5a5;border:1px solid rgba(248,113,113,.25)}.msg.good{background:rgba(52,211,153,.1);color:#6ee7b7;border:1px solid rgba(52,211,153,.25)}
.banner{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 18px;margin-bottom:14px;border-radius:var(--r);border:1px solid rgba(251,191,36,.35);background:rgba(251,191,36,.08);color:#fde68a}
.logs{background:rgba(0,0,0,.5);border:1px solid var(--line);border-radius:12px;height:280px;overflow:auto;padding:12px;font:12px/1.6 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all}
.logs .error{color:#fca5a5}.logs .warn{color:#fcd34d}.logs i{color:#6b6b82;font-style:normal;margin-right:6px}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:9px 8px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--mut);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.8px}tr:last-child td{border:0}
.scroll{max-height:300px;overflow:auto}.tag{font-size:12px;color:var(--mut);word-break:break-all}.small{font-size:13px;color:var(--mut)}
.cats h3{margin:14px 0 8px;font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:1px}.chips{display:flex;flex-wrap:wrap;gap:6px}
.chips span{background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:9px;padding:3px 10px;font-size:13px}
.center{display:grid;place-items:center;text-align:center}.ok-badge{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(52,211,153,.12);color:var(--ok);margin:0 auto 12px}.ok-badge .ic{width:30px;height:30px}
.wrapnarrow{max-width:480px;margin:0 auto}
@media(max-width:560px){.links .lnk:not(.on){display:none}.nav{border-radius:18px}}
`;

const FAV = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%238b5cf6'/%3E%3Cstop offset='1' stop-color='%23ec4899'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='9' fill='url(%23g)'/%3E%3C/svg%3E";

const page = (title, body, script = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#07070c"><link rel="icon" href="${FAV}"><title>${title}</title><style>${CSS}</style></head>
<body><div class="wrap">${body}</div><noscript><p style="text-align:center">Enable JavaScript.</p></noscript><script>
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){
  const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(r.status===401&&path.indexOf('/api/admin/login')<0&&path.indexOf('/api/pair')<0){location.reload();throw new Error('Session expired');}
  if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
  return j;
}
function note(el,text,good){el.textContent=text;el.className='msg show '+(good?'good':'err');}
const login=async pw=>api('/api/admin/login',{password:pw});
${script}
</script></body></html>`;

const initials = () => esc(config.botName.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase());
const nav = (active, right = '') => `<nav class="nav"><a class="row" href="/" style="gap:11px"><span class="logo">${initials()}</span><span class="brand">${esc(config.botName)}<small>WhatsApp Multi-Device Bot</small></span></a><span class="sp"></span>
<div class="links"><a class="lnk ${active === 'home' ? 'on' : ''}" href="/">Home</a><a class="lnk ${active === 'pair' ? 'on' : ''}" href="/pair">Pair</a><a class="lnk ${active === 'admin' ? 'on' : ''}" href="/admin">Admin</a>${right}</div></nav>`;

// ---------------------------------------------------------------- home
export const homePage = () => page(esc(config.botName), `
${nav('home')}
<div class="hero"><span id="st" class="pill starting"><span class="dot"></span><span id="stt">checking…</span></span>
<h1><span class="grad">${esc(config.botName)}</span></h1>
<p>Fast, simple WhatsApp bot with group management, moderation, status tools and media downloaders.</p>
<div class="row" style="justify-content:center;margin-top:22px"><a href="/pair"><button>${ic('qr')}&nbsp; Pair device</button></a><a href="/admin"><button class="ghost">${ic('shield')}&nbsp; Admin panel</button></a></div></div>`,
`api('/api/pair/status').then(s=>{$('#st').className='pill '+s.status;$('#stt').textContent=s.status.replace('_',' ');}).catch(()=>{});`);

// ---------------------------------------------------------------- pair
export const pairPage = () => page(`Pair · ${esc(config.botName)}`, `
${nav('pair')}
<div class="wrapnarrow">
<div class="hero" style="margin-top:8px"><h1>Link your <span class="grad">WhatsApp</span></h1><p>Pair with a code or scan a QR. Takes about 20 seconds.</p></div>
<div class="card" id="box"><div class="small center">Checking…</div></div></div>`,
`
let tab='code',qrTimer=null,codeTimer=null,view='';
const steps={
  code:'<ol class="steps"><li><span>Open <b>WhatsApp</b> on your phone</span></li><li><span>Go to <b>Settings → Linked devices → Link a device</b></span></li><li><span>Tap <b>Link with phone number instead</b></span></li><li><span>Enter the 8-character code shown here</span></li></ol>',
  qr:'<ol class="steps"><li><span>Open <b>WhatsApp</b> on your phone</span></li><li><span>Go to <b>Settings → Linked devices → Link a device</b></span></li><li><span>Point the camera at the QR code</span></li></ol>'
};
function render(s){
  const box=$('#box');
  if(s.registered){stop();view='done';box.innerHTML='<div class="center"><div class="ok-badge"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></div><h2 style="font-size:20px;color:var(--fg);text-transform:none;letter-spacing:0;justify-content:center">Bot is linked</h2><p class="small">'+(s.user?'Connected as <b>+'+esc(s.user)+'</b>. ':'')+'To pair a different number, use <b>Admin → Logout WhatsApp</b>.</p><a href="/admin"><button class="ghost">Open admin</button></a></div>';return;}
  if(s.needsPassword&&!s.loggedIn){
    if(view==='lock')return;view='lock';stop();
    box.innerHTML=s.passwordConfigured?'<h2>${ic('key')} Unlock</h2><p class="small" style="margin-top:0">Enter the admin password to pair this bot.</p><form id="lf"><input id="pw" type="password" placeholder="Admin password" autocomplete="current-password" required><button class="block" type="submit">Unlock</button></form><div id="lm" class="msg"></div>':'<p class="small">Pairing is locked. Set <b>ADMIN_PASSWORD</b> (or <b>PAIR_PUBLIC=true</b>) in the environment and redeploy.</p>';
    const f=$('#lf');if(f)f.addEventListener('submit',async e=>{e.preventDefault();try{await login($('#pw').value);view='';poll();}catch(err){note($('#lm'),err.message,false);}});
    return;}
  if(view==='main'){$('#rd').textContent=s.ready?'Ready':'Connecting…';$('#rd').className='pill '+(s.ready?'online':'connecting');return;}
  view='main';
  box.innerHTML='<div class="row" style="justify-content:space-between;margin-bottom:14px"><span class="small">Connection</span><span id="rd" class="pill '+(s.ready?'online':'connecting')+'"><span class="dot"></span>'+(s.ready?'Ready':'Connecting…')+'</span></div>'
  +'<div class="tabs"><button class="tab" id="t1" type="button">${ic('key')} Pair code</button><button class="tab" id="t2" type="button">${ic('qr')} QR code</button></div>'
  +'<div id="p1"><form id="f"><label for="num">WhatsApp number (with country code)</label><input id="num" inputmode="numeric" placeholder="94771234567" autocomplete="off" required><button id="go" class="block" type="submit">Get pairing code</button></form><div id="out" style="display:none"><div class="code" id="code"></div><div class="row" style="justify-content:center"><button class="ghost sm" id="copy" type="button">Copy code</button><span class="small" id="cd"></span></div></div></div>'
  +'<div id="p2" style="display:none"><div class="qrbox" id="qr">Waiting for QR…</div><p class="small" style="text-align:center;margin:0">QR refreshes automatically</p></div>'
  +'<div id="st">'+steps.code+'</div><div id="m" class="msg"></div>';
  $('#t1').onclick=()=>setTab('code');$('#t2').onclick=()=>setTab('qr');setTab(tab);
  $('#f').addEventListener('submit',getCode);
  $('#copy').onclick=()=>{const c=$('#code').dataset.c||'';navigator.clipboard&&navigator.clipboard.writeText(c).then(()=>{$('#copy').textContent='Copied ✓';setTimeout(()=>$('#copy').textContent='Copy code',1500)})};
}
function setTab(t){
  tab=t;$('#t1').className='tab '+(t==='code'?'on':'');$('#t2').className='tab '+(t==='qr'?'on':'');
  $('#p1').style.display=t==='code'?'block':'none';$('#p2').style.display=t==='qr'?'block':'none';$('#st').innerHTML=steps[t];
  $('#m').className='msg';clearInterval(qrTimer);if(t==='qr'){loadQr();qrTimer=setInterval(loadQr,3000);}
}
async function loadQr(){
  try{const r=await api('/api/pair/qr');const b=$('#qr');if(!b)return;
    if(r.qr)b.innerHTML='<img alt="WhatsApp QR" src="'+r.qr+'">';else b.textContent=r.error||'Waiting for QR…';
  }catch(e){const b=$('#qr');if(b)b.textContent=e.message;}
}
async function getCode(e){
  e.preventDefault();$('#go').disabled=true;$('#m').className='msg';
  try{
    const r=await api('/api/pair',{number:$('#num').value});
    const c=r.code.replace('-','');$('#code').dataset.c=c;
    $('#code').innerHTML=c.split('').map((x,i)=>(i===4?'<i>–</i>':'')+'<b>'+esc(x)+'</b>').join('');
    $('#out').style.display='block';startCountdown();
  }catch(err){note($('#m'),err.message,false);$('#out').style.display='none';}
  $('#go').disabled=false;
}
function startCountdown(){clearInterval(codeTimer);let n=60;const el=$('#cd');el.textContent='expires in '+n+'s';codeTimer=setInterval(()=>{n--;if(!$('#cd')||n<=0){clearInterval(codeTimer);if($('#cd'))$('#cd').textContent='expired, get a new code';return;}$('#cd').textContent='expires in '+n+'s';},1000);}
function stop(){clearInterval(qrTimer);clearInterval(codeTimer);}
async function poll(){try{render(await api('/api/pair/status'));}catch(e){}}
poll();setInterval(poll,5000);
`);

// ---------------------------------------------------------------- admin login
export const loginPage = (configured) => page(`Admin · ${esc(config.botName)}`, `
${nav('admin')}
<div class="wrapnarrow"><div class="hero" style="margin-top:8px"><h1>Admin <span class="grad">panel</span></h1><p>Sign in to manage the bot.</p></div>
<div class="card"><h2>${ic('shield')} Sign in</h2>
${configured ? `<form id="f"><input id="pw" type="password" placeholder="Password" autocomplete="current-password" autofocus required><button class="block" type="submit">Sign in</button></form>`
  : `<p class="small" style="margin:0">Admin panel is locked. Set the <b>ADMIN_PASSWORD</b> environment variable and redeploy.</p>`}
<div id="m" class="msg"></div></div></div>`,
`const f=$('#f');if(f)f.addEventListener('submit',async e=>{e.preventDefault();try{await login($('#pw').value);location.reload();}catch(err){note($('#m'),err.message,false);}});`);

// ---------------------------------------------------------------- admin
export const adminPage = () => page(`Admin · ${esc(config.botName)}`, `
${nav('admin', `<span id="pill" class="pill starting"><span class="dot"></span><span id="pt">…</span></span><button class="ghost sm" id="out" type="button">Sign out</button>`)}
<div id="ban"></div>
<div class="stats">
  <div class="stat"><div class="l">${ic('pulse')} Status</div><div class="v" id="s1">—</div></div>
  <div class="stat"><div class="l">${ic('clock')} Uptime</div><div class="v" id="s2">—</div></div>
  <div class="stat"><div class="l">${ic('users')} Groups</div><div class="v" id="s3">—</div></div>
  <div class="stat"><div class="l">${ic('term')} Commands</div><div class="v" id="s4">—</div></div>
  <div class="stat"><div class="l">${ic('chip')} Memory</div><div class="v" id="s5">—</div></div>
</div>
<div class="grid">
  <div class="card"><h2>${ic('pulse')} Bot info</h2><div class="kv" id="kv"></div></div>
  <div class="card"><h2>${ic('shield')} Controls</h2>
    <label>Who can use commands</label>
    <div class="row" style="margin-bottom:16px"><button id="mpub" class="ghost" type="button">Public</button><button id="mpri" class="ghost" type="button">Private (owner only)</button></div>
    <label>Connection</label>
    <div class="row"><button id="rs" class="ghost" type="button">Restart connection</button><button id="lo" class="bad" type="button">Logout WhatsApp</button></div>
    <div id="cm" class="msg"></div><p class="small" style="margin:12px 0 0">Mode resets to the MODE env value on redeploy.</p></div>
  <div class="card"><h2>${ic('send')} Send message</h2>
    <form id="sf"><label for="to">To</label><input id="to" placeholder="94771234567 or 1203…@g.us" required>
    <label for="tx">Message</label><textarea id="tx" rows="3" placeholder="Type a message" required></textarea><button class="block" type="submit">Send</button></form><div id="sm" class="msg"></div></div>
  <div class="card full"><h2>${ic('users')} Groups <span class="tag" id="gc"></span></h2>
    <div class="row" style="margin-bottom:12px"><input id="gq" placeholder="Search groups…" style="margin:0;flex:1;min-width:180px"><button class="ghost sm" id="gr" type="button">Refresh</button></div>
    <div class="scroll"><table><thead><tr><th>Name</th><th>Members</th><th>ID</th></tr></thead><tbody id="gb"><tr><td colspan="3" class="small">Loading…</td></tr></tbody></table></div></div>
  <div class="card full"><h2>${ic('term')} Live logs</h2>
    <div class="row" style="margin-bottom:12px"><select id="lv" style="width:auto;margin:0"><option value="all">All</option><option value="warn">Warnings + errors</option><option value="error">Errors only</option></select><button class="ghost sm" id="lc" type="button">Copy</button></div>
    <div class="logs" id="logs"></div></div>
  <div class="card full cats"><h2>${ic('term')} Commands</h2><input id="cq" placeholder="Search commands…"><div id="cmds"></div></div>
</div>`,
`
let GROUPS=[],CMDS=[],LOGS=[];
const fmt=ms=>{let s=Math.floor(ms/1000),d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);return d?d+'d '+h+'h':h?h+'h '+m+'m':m+'m';};
async function status(){
  const s=await api('/api/admin/status');
  $('#pill').className='pill '+s.status;$('#pt').textContent=s.status.replace('_',' ');
  $('#s1').textContent=s.status.replace('_',' ');$('#s2').textContent=fmt(s.uptime);$('#s4').textContent=s.commands;$('#s5').innerHTML=s.memMb+' <small>MB</small>';
  const rows=[['Number',s.user?'+'+s.user:'not linked'],['Owner',s.owner?'+'+s.owner:'not set'],['Prefix',s.prefix],['Mode',s.mode],['Session store',s.storage],['Node',s.node]];
  $('#kv').innerHTML=rows.map(r=>'<span>'+esc(r[0])+'</span><span>'+esc(r[1])+'</span>').join('');
  $('#mpub').className=s.mode==='public'?'ok':'ghost';$('#mpri').className=s.mode==='private'?'ok':'ghost';
  $('#ban').innerHTML=s.registered?'':'<div class="banner"><span>This bot is not linked to a WhatsApp number yet.</span><a href="/pair"><button class="sm" type="button">Pair now</button></a></div>';
}
function drawLogs(){
  const lv=$('#lv').value;const box=$('#logs');const stick=box.scrollTop+box.clientHeight>=box.scrollHeight-30;
  const list=LOGS.filter(x=>lv==='all'||(lv==='error'?x.level==='error':x.level!=='log'));
  box.innerHTML=list.map(x=>'<div class="'+x.level+'"><i>'+new Date(x.t).toLocaleTimeString()+'</i>'+esc(x.line)+'</div>').join('')||'<span class="small">No logs</span>';
  if(stick)box.scrollTop=box.scrollHeight;
}
async function logs(){LOGS=(await api('/api/admin/logs')).logs;drawLogs();}
function drawGroups(){
  const q=$('#gq').value.toLowerCase();const l=GROUPS.filter(g=>g.name.toLowerCase().indexOf(q)>=0||g.id.indexOf(q)>=0);
  $('#gb').innerHTML=l.length?l.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.size+'</td><td class="tag">'+esc(x.id)+' <button class="ghost sm cp" data-id="'+esc(x.id)+'" type="button">Use</button></td></tr>').join(''):'<tr><td colspan="3" class="small">No groups</td></tr>';
}
async function groups(){
  $('#gb').innerHTML='<tr><td colspan="3" class="small">Loading…</td></tr>';
  try{GROUPS=(await api('/api/admin/groups')).groups;$('#gc').textContent='('+GROUPS.length+')';$('#s3').textContent=GROUPS.length;drawGroups();}
  catch(e){$('#gb').innerHTML='<tr><td colspan="3" class="small">'+esc(e.message)+'</td></tr>';}
}
function drawCmds(){
  const q=$('#cq').value.toLowerCase();const by={};
  CMDS.filter(c=>!q||c.name.indexOf(q)>=0||(c.desc||'').toLowerCase().indexOf(q)>=0).forEach(c=>{(by[c.category]=by[c.category]||[]).push(c);});
  $('#cmds').innerHTML=Object.keys(by).sort().map(k=>'<h3>'+esc(k)+'</h3><div class="chips">'+by[k].map(c=>'<span title="'+esc(c.desc||'')+'">'+esc(c.name)+'</span>').join('')+'</div>').join('')||'<span class="small">No commands</span>';
}
async function setMode(m){try{await api('/api/admin/mode',{mode:m});note($('#cm'),'Mode set to '+m,true);status();}catch(e){note($('#cm'),e.message,false);}}
$('#mpub').onclick=()=>setMode('public');$('#mpri').onclick=()=>setMode('private');
$('#rs').onclick=async()=>{try{await api('/api/admin/restart',{});note($('#cm'),'Restarting connection…',true);}catch(e){note($('#cm'),e.message,false);}};
$('#lo').onclick=async()=>{if(!confirm('Log the bot out of WhatsApp? You will have to pair again.'))return;try{await api('/api/admin/logout-wa',{});note($('#cm'),'Logged out. Use the Pair page to link again.',true);}catch(e){note($('#cm'),e.message,false);}};
$('#sf').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/admin/send',{to:$('#to').value,text:$('#tx').value});note($('#sm'),'Sent ✓',true);$('#tx').value='';}catch(err){note($('#sm'),err.message,false);}});
$('#gr').onclick=groups;$('#gq').oninput=drawGroups;$('#cq').oninput=drawCmds;$('#lv').onchange=drawLogs;
$('#gb').addEventListener('click',e=>{const b=e.target.closest('.cp');if(b){$('#to').value=b.dataset.id;$('#to').scrollIntoView({behavior:'smooth',block:'center'});$('#tx').focus();}});
$('#lc').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(LOGS.map(x=>x.line).join('\\n')).then(()=>{$('#lc').textContent='Copied ✓';setTimeout(()=>$('#lc').textContent='Copy',1500)})};
$('#out').onclick=async()=>{await fetch('/api/admin/signout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.href='/admin';};
api('/api/admin/commands').then(c=>{CMDS=c.commands;drawCmds();}).catch(()=>{});
status();logs();setTimeout(groups,1200);
setInterval(()=>{status().catch(()=>{});logs().catch(()=>{});},4000);
`);
