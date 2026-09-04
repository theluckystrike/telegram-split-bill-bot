/** Telegram Mini App: initData validation (HMAC-SHA256, key "WebAppData") + tiny JSON API + HTML shell. */
const enc = new TextEncoder();
const hex = (b: ArrayBuffer): string => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}

export interface InitUser { id: number; first_name: string; username?: string; }

async function hashMatches(hash: string, dcs: string, token: string): Promise<boolean> {
  const secret = await hmac(enc.encode("WebAppData"), token);
  return hex(await hmac(secret, dcs)) === hash;
}

/** Returns the user if initData is authentic (signed by any of `tokens`, e.g. a bot's own
 * BOT_TOKEN plus a shared hub bot token) and younger than maxAgeSec, else null. */
export async function validateInitData(initData: string, tokens: string | string[], maxAgeSec = 86_400): Promise<InitUser | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const list = Array.isArray(tokens) ? tokens : [tokens];
  let ok = false;
  for (const token of list) { if (await hashMatches(hash, dcs, token)) { ok = true; break; } }
  if (!ok) return null;
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get("user") ?? "null") as InitUser | null; } catch { return null; }
}

/** Pure: one-line pitch + an attributable deep link (?start=<startParam>), for both the
 * "Share to a chat" prepared message and any "Share to story" widget_link text. Kept short
 * enough (fleet convention: <=300 chars) to fit comfortably in a story/chat share sheet.
 * Lives here (not kit.ts) so it stays importable by tests without pulling in kit.ts's
 * "cloudflare:workers" DurableObject dependency. */
export function buildShareText(pitch: string, botUsername: string, startParam: string): string {
  return `${pitch}\n\nhttps://t.me/${botUsername}?start=${startParam}`;
}

export const APP_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SplitTabs</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>body{margin:0;font:16px/1.4 -apple-system,system-ui,sans-serif;background:var(--tg-theme-bg-color,#fff);color:var(--tg-theme-text-color,#111);padding:16px}
h1{font-size:18px;margin:0 0 8px}h2{font-size:14px;margin:14px 0 6px;color:var(--tg-theme-hint-color,#777)}.g{padding:12px;border-radius:12px;background:var(--tg-theme-secondary-bg-color,#f3f3f3);margin-bottom:8px}
.r{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}.pos{color:#2e9e4f}.neg{color:#d33}small{color:var(--tg-theme-hint-color,#777)}.empty{color:var(--tg-theme-hint-color,#777)}</style></head><body>
<h1>🧾 Your groups</h1><div id="list" class="empty">Loading…</div>
<div id="shareRow" style="margin-top:14px"></div>
<div id="more"></div>
<script>
const tg=window.Telegram.WebApp;tg.ready();tg.expand();
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:tg.initData,...body})});return r.json()}
function esc(s){return String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}
const OTHER_BOTS=[['🔒 WhisperLock','WhisperLockBot'],['⏰ Nudge','NudgeRemindBot'],['📮 AnonInbox','AnonInboxProBot'],['🔥 HabitStreak','HabitStreakProBot']];
function renderMore(){document.getElementById('more').innerHTML='<h2 style="font-size:14px;margin:16px 0 6px;color:var(--tg-theme-hint-color,#777)">More apps</h2>'+OTHER_BOTS.map(([label,bot])=>'<button class="mo" data-bot="'+bot+'">'+label+'</button>').join('');for(const b of document.querySelectorAll('.mo'))b.onclick=()=>tg.openTelegramLink('https://t.me/'+b.dataset.bot)}
function renderShare(){const el=document.getElementById("shareRow");if(!el)return;let ok=false;try{ok=typeof tg.shareMessage==="function"&&tg.isVersionAtLeast("8.0")}catch(e){}if(ok){const b=document.createElement("button");b.textContent="💬 Share to a chat";b.style.cssText="border:0;border-radius:10px;padding:10px 14px;font-size:14px;background:var(--tg-theme-secondary-bg-color,#f3f3f3);color:var(--tg-theme-text-color,#111);width:100%";b.onclick=async()=>{try{const r=await fetch("/api/share",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData:tg.initData})});const d=await r.json();if(d&&d.id)tg.shareMessage(d.id)}catch(e){}};el.appendChild(b)}let ok2=false;try{ok2=typeof tg.shareToStory==="function"&&tg.isVersionAtLeast("7.8")}catch(e){}if(ok2){const s=document.createElement("button");s.textContent="📣 Share to story";s.style.cssText="border:0;border-radius:10px;padding:10px 14px;font-size:14px;background:var(--tg-theme-secondary-bg-color,#f3f3f3);color:var(--tg-theme-text-color,#111);width:100%;margin-top:8px";s.onclick=()=>{try{fetch("/api/share-story",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData:tg.initData})}).catch(()=>{});tg.shareToStory("https://tg.zovo.one/img/banner-split.png",{text:"Split group expenses without the spreadsheet, right inside Telegram.\\n\\nhttps://t.me/SplitTabsBot?start=story",widget_link:{url:"https://t.me/SplitTabsBot?start=story",name:"SplitTabs"}})}catch(e){}};el.appendChild(s)}}
async function load(){const d=await api('/api/groups',{});const el=document.getElementById('list');if(d.error){el.textContent=d.error;return}
 if(!d.groups.length){el.innerHTML='No groups yet. Add @SplitTabsBot to a group and send <b>/add 20 dinner @friend</b>.';return}
 el.className='';el.innerHTML=d.groups.map(g=>'<div class="g"><b>'+esc(g.title||'Group')+'</b> <small>'+g.count+' expenses · '+esc(g.total)+' total'+(g.pro?' · Pro':'')+'</small>'+
  '<h2>Balances</h2>'+g.balances.map(b=>'<div class="r"><span>'+esc(b.who)+'</span><span class="'+(b.amount>=0?'pos':'neg')+'">'+(b.amount>=0?'+':'')+b.amount.toFixed(2)+'</span></div>').join('')+
  (g.settle.length?'<h2>Settle up</h2>'+g.settle.map(t=>'<div class="r"><span>'+esc(t.from)+' → '+esc(t.to)+'</span><span>'+t.amount.toFixed(2)+'</span></div>').join(''):'')+'</div>').join('')}
load();renderMore();renderShare();
</script></body></html>`;
