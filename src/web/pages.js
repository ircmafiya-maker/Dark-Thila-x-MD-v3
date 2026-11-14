// HTML for the pair + admin pages. No external assets, works on phones.
import { config } from '../config.js';

const CSS = `
:root{--bg:#0b0b10;--card:#14141c;--line:#262633;--fg:#ececf3;--mut:#8b8ba0;--acc:#8b5cf6;--ok:#22c55e;--warn:#f59e0b;--bad:#ef4444}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--acc);text-decoration:none}.wrap{max-width:1000px;margin:0 auto;padding:20px 16px 48px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
h1{font-size:20px;margin:0;letter-spacing:.5px}h2{font-size:13px;margin:0 0 12px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;font-weight:600}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}.full{grid-column:1/-1}
input,select,textarea{width:100%;background:#0e0e15;border:1px solid var(--line);color:var(--fg);border-radius:10px;padding:11px 12px;font:inherit;margin-bottom:10px}
input:focus,textarea:focus{outline:2px solid var(--acc);outline-offset:0;border-color:transparent}
button{background:var(--acc);color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}
button:hover{filter:brightness(1.1)}button:disabled{opacity:.5;cursor:default}
button.ghost{background:transparent;border:1px solid var(--line);color:var(--fg)}button.bad{background:var(--bad)}button.ok{background:var(--ok);color:#04230f}
.row{display:flex;gap:8px;flex-wrap:wrap}.pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:99px;padding:3px 11px;font-size:13px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--mut)}.online .dot{background:var(--ok)}.connecting .dot,.reconnecting .dot,.starting .dot{background:var(--warn)}.logged_out .dot{background:var(--bad)}
.kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:14px}.kv span:nth-child(odd){color:var(--mut)}.kv span:nth-child(even){text-align:right;word-break:break-all}
.code{font:700 34px/1.2 ui-monospace,Menlo,Consolas,monospace;letter-spacing:6px;text-align:center;padding:18px 8px;background:#0e0e15;border:1px dashed var(--acc);border-radius:12px;margin:12px 0;user-select:all}
.msg{padding:10px 12px;border-radius:10px;margin:10px 0;font-size:14px;display:none}.msg.show{display:block}.msg.err{background:#3a1519;color:#fca5a5}.msg.good{background:#10301b;color:#86efac}
.logs{background:#07070b;border:1px solid var(--line);border-radius:10px;height:260px;overflow:auto;padding:10px;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all}
.logs .error{color:#fca5a5}.logs .warn{color:#fcd34d}.logs i{color:var(--mut);font-style:normal}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:7px 6px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--mut);font-weight:500}
.scroll{max-height:280px;overflow:auto}.tag{font-size:12px;color:var(--mut)}.small{font-size:13px;color:var(--mut)}
details summary{cursor:pointer;color:var(--mut)}.cmds{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.cmds span{background:#0e0e15;border:1px solid var(--line);border-radius:8px;padding:2px 9px;font-size:13px}
`;

const page = (title, body, script = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${title}</title><style>${CSS}</style></head>
<body><div class="wrap">${body}</div><script>
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){
  const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(r.status===401&&path.indexOf('/api/admin/login')<0){location.reload();throw new Error('Session expired');}
  if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
  return j;
}
function note(el,text,good){el.textContent=text;el.className='msg show '+(good?'good':'err');}
${script}
</script></body></html>`;

const header = (right = '') => `<header><div><h1>${esc(config.botName)}</h1></div><div class="row">${right}</div></header>`;
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export const homePage = () => page(esc(config.botName), `
${header(`<a class="pill" href="/pair">Pair</a><a class="pill" href="/admin">Admin</a>`)}
<div class="card"><h2>Status</h2><div id="st" class="pill starting"><span class="dot"></span><span id="stt">…</span></div>
<p class="small">WhatsApp bot. Use <b>Pair</b> to link a number, <b>Admin</b> to manage the bot.</p></div>`,
`api('/api/pair/status').then(s=>{$('#st').className='pill '+s.status;$('#stt').textContent=s.status.replace('_',' ');}).catch(()=>{});`);

export const pairPage = () => page(`Pair · ${esc(config.botName)}`, `
${header(`<a class="pill" href="/">Home</a><a class="pill" href="/admin">Admin</a>`)}
<div class="card" style="max-width:520px;margin:0 auto">
<h2>Link WhatsApp</h2>
<div id="state" class="small" style="margin-bottom:12px">Checking…</div>
<form id="f" style="display:none">
  <label class="small">WhatsApp number (country code, digits only)</label>
  <input id="num" inputmode="numeric" placeholder="94771234567" autocomplete="off" required>
  <div id="pwbox" style="display:none"><label class="small">Admin password</label><input id="pw" type="password" autocomplete="current-password"></div>
  <button id="go" type="submit">Get pairing code</button>
</form>
<div id="out" style="display:none"><div class="code" id="code"></div>
<button class="ghost" id="copy" type="button">Copy code</button>
<p class="small">WhatsApp → Settings → Linked devices → Link a device → <b>Link with phone number instead</b>, then enter this code. It expires in about 60 seconds.</p></div>
<div id="m" class="msg"></div></div>`,
`
let needsPw=false;
async function load(){
  const s=await api('/api/pair/status');needsPw=s.needsPassword;
  if(s.registered){$('#state').innerHTML='✅ Bot is already linked'+(s.user?' as <b>'+esc(s.user)+'</b>':'')+'. To re-pair, use Admin → Logout WhatsApp.';$('#f').style.display='none';return;}
  if(s.needsPassword&&!s.passwordConfigured){$('#state').textContent='Pairing is locked. Set the ADMIN_PASSWORD environment variable (or PAIR_PUBLIC=true) and redeploy.';return;}
  $('#state').textContent=s.ready?'Ready. Enter your number below.':'Bot is connecting… the form works in a few seconds.';
  $('#f').style.display='block';$('#pwbox').style.display=s.needsPassword&&!s.loggedIn?'block':'none';
}
$('#f').addEventListener('submit',async e=>{
  e.preventDefault();$('#go').disabled=true;$('#m').className='msg';
  try{
    const r=await api('/api/pair',{number:$('#num').value,password:$('#pw').value});
    $('#code').textContent=r.code;$('#out').style.display='block';
  }catch(err){note($('#m'),err.message,false);$('#out').style.display='none';}
  $('#go').disabled=false;
});
$('#copy').addEventListener('click',()=>{navigator.clipboard&&navigator.clipboard.writeText($('#code').textContent.replace('-','')).then(()=>{$('#copy').textContent='Copied';setTimeout(()=>$('#copy').textContent='Copy code',1500)})});
load().catch(e=>note($('#m'),e.message,false));
setInterval(()=>load().catch(()=>{}),10000);
`);

export const loginPage = (configured) => page(`Admin · ${esc(config.botName)}`, `
${header(`<a class="pill" href="/">Home</a><a class="pill" href="/pair">Pair</a>`)}
<div class="card" style="max-width:420px;margin:0 auto"><h2>Admin login</h2>
${configured ? `<form id="f"><input id="pw" type="password" placeholder="Password" autocomplete="current-password" autofocus required><button type="submit">Sign in</button></form>`
  : `<p class="small">Admin panel is locked. Set the <b>ADMIN_PASSWORD</b> environment variable and redeploy.</p>`}
<div id="m" class="msg"></div></div>`,
`const f=$('#f');if(f)f.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/admin/login',{password:$('#pw').value});location.reload();}catch(err){note($('#m'),err.message,false);}});`);

export const adminPage = () => page(`Admin · ${esc(config.botName)}`, `
${header(`<span id="pill" class="pill starting"><span class="dot"></span><span id="pt">…</span></span><a class="pill" href="/pair">Pair</a><button class="ghost" id="out">Sign out</button>`)}
<div class="grid">
  <div class="card"><h2>Bot</h2><div class="kv" id="kv"></div></div>
  <div class="card"><h2>Controls</h2>
    <p class="small" style="margin-top:0">Mode: who can use commands (resets to the MODE env var on redeploy).</p>
    <div class="row" style="margin-bottom:14px"><button id="mpub" class="ghost">Public</button><button id="mpri" class="ghost">Private</button></div>
    <div class="row"><button id="rs" class="ghost">Restart connection</button><button id="lo" class="bad">Logout WhatsApp</button></div>
    <div id="cm" class="msg"></div>
  </div>
  <div class="card"><h2>Send message</h2>
    <form id="sf"><input id="to" placeholder="Number (94771234567) or group id (…@g.us)" required>
    <textarea id="tx" rows="3" placeholder="Message" required></textarea><button type="submit">Send</button></form><div id="sm" class="msg"></div></div>
  <div class="card full"><h2>Groups <span class="tag" id="gc"></span></h2><div class="scroll"><table><thead><tr><th>Name</th><th>Members</th><th>ID</th></tr></thead><tbody id="gb"><tr><td colspan="3" class="small">Loading…</td></tr></tbody></table></div>
    <div class="row" style="margin-top:10px"><button class="ghost" id="gr">Refresh groups</button></div></div>
  <div class="card full"><h2>Live logs</h2><div class="logs" id="logs"></div></div>
  <div class="card full"><details><summary>Commands (<span id="cn">0</span>)</summary><div class="cmds" id="cmds"></div></details></div>
</div>`,
`
const fmt=ms=>{let s=Math.floor(ms/1000),d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);return (d?d+'d ':'')+h+'h '+m+'m';};
async function status(){
  const s=await api('/api/admin/status');
  $('#pill').className='pill '+s.status;$('#pt').textContent=s.status.replace('_',' ');
  const rows=[['Number',s.user||'—'],['Owner',s.owner||'not set'],['Prefix',s.prefix],['Mode',s.mode],['Uptime',fmt(s.uptime)],['Session store',s.storage],['Commands',s.commands],['Memory',s.memMb+' MB'],['Node',s.node]];
  $('#kv').innerHTML=rows.map(r=>'<span>'+esc(r[0])+'</span><span>'+esc(r[1])+'</span>').join('');
  $('#mpub').className=s.mode==='public'?'ok':'ghost';$('#mpri').className=s.mode==='private'?'ok':'ghost';
}
async function logs(){
  const l=await api('/api/admin/logs');const box=$('#logs');const stick=box.scrollTop+box.clientHeight>=box.scrollHeight-30;
  box.innerHTML=l.logs.map(x=>'<div class="'+x.level+'"><i>'+new Date(x.t).toLocaleTimeString()+'</i> '+esc(x.line)+'</div>').join('');
  if(stick)box.scrollTop=box.scrollHeight;
}
async function groups(){
  $('#gb').innerHTML='<tr><td colspan="3" class="small">Loading…</td></tr>';
  try{const g=await api('/api/admin/groups');$('#gc').textContent='('+g.groups.length+')';
    $('#gb').innerHTML=g.groups.length?g.groups.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.size+'</td><td class="tag">'+esc(x.id)+'</td></tr>').join(''):'<tr><td colspan="3" class="small">No groups</td></tr>';
  }catch(e){$('#gb').innerHTML='<tr><td colspan="3" class="small">'+esc(e.message)+'</td></tr>';}
}
async function setMode(m){try{await api('/api/admin/mode',{mode:m});note($('#cm'),'Mode → '+m,true);status();}catch(e){note($('#cm'),e.message,false);}}
$('#mpub').onclick=()=>setMode('public');$('#mpri').onclick=()=>setMode('private');
$('#rs').onclick=async()=>{try{await api('/api/admin/restart',{});note($('#cm'),'Restarting connection…',true);}catch(e){note($('#cm'),e.message,false);}};
$('#lo').onclick=async()=>{if(!confirm('Log the bot out of WhatsApp? You will need to pair again.'))return;try{await api('/api/admin/logout-wa',{});note($('#cm'),'Logged out. Use the Pair page to link again.',true);}catch(e){note($('#cm'),e.message,false);}};
$('#sf').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/admin/send',{to:$('#to').value,text:$('#tx').value});note($('#sm'),'Sent ✅',true);$('#tx').value='';}catch(err){note($('#sm'),err.message,false);}});
$('#gr').onclick=groups;
$('#out').onclick=async()=>{await fetch('/api/admin/signout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.reload();};
api('/api/admin/commands').then(c=>{$('#cn').textContent=c.commands.length;$('#cmds').innerHTML=c.commands.map(x=>'<span title="'+esc(x.desc||'')+'">'+esc(x.name)+'</span>').join('');}).catch(()=>{});
status();logs();setTimeout(groups,1500);
setInterval(()=>{status().catch(()=>{});logs().catch(()=>{});},4000);
`);
