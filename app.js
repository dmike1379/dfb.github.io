/* ╔═══════════════════════════════════════════════════════════════════╗
   ║                  FAMILY BANK — app.js  v31.0                      ║
   ║  v31 adds: Phosphor icons (vendor/phosphor-sprite.svg), avatar    ║
   ║  system (emoji default + per-device photo), empty-state SVG       ║
   ║  illustrations, upgraded chore celebration.                       ║
   ║                                                                   ║
   ║  Sections:                                                        ║
   ║    1.  Configuration & defaults                                   ║
   ║    2.  Runtime state                                              ║
   ║    3.  Utilities                                                  ║
   ║    4.  Modal + toast + earned popup                               ║
   ║    5.  Cloud load & sync                                          ║
   ║    6.  Branding + balances + status                               ║
   ║    7.  Tabs + chore badges                                        ║
   ║    8.  Auth (login, logout, remember-me, child picker)            ║
   ║    9.  Child money actions                                        ║
   ║   10.  Parent adjust + allowance + rates                          ║
   ║   11.  Chores — schedule UI, per-day times, create/edit/approve   ║
   ║   12.  Chore checklist (child view)                               ║
   ║   13.  Savings goals                                              ║
   ║   14.  Loans                                                      ║
   ║   15.  History (ledger drawer)                                    ║
   ║   16.  Net Worth Chart (Chart.js)                                 ║
   ║   17.  Streaks                                                    ║
   ║   18.  Admin (PIN gate, user mgmt, settings save)                 ║
   ║   19.  Multi-select picker (children, tabs)                       ║
   ║   20.  PWA install + service worker auto-update                   ║
   ║   21.  Auto-logout timer                                          ║
   ║   22.  Init                                                       ║
   ╚═══════════════════════════════════════════════════════════════════╝ */

// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    ★ CONFIGURATION ★                             ║
// ║   Edit this block to match your family. Most settings can also   ║
// ║   be changed in the in-app Admin panel after first run.          ║
// ╚═══════════════════════════════════════════════════════════════════╝

// ── API URL — paste this from Apps Script Deploy → Manage Deployments ──
const API_URL = "https://script.google.com/macros/s/AKfycbwk8cM1mmmHMz2F8Ss5nBBkLt4KKTL2m7_PVRSV4X0kHn-B0mpJCc93DaW8j6TMnZa3jw/exec";

// ── Bank identity ──
const CFG_BANK_NAME    = "Family Bank";
const CFG_BANK_TAGLINE = "Your money, your future.";

// ── Brand colors ──
const CFG_COLOR_PRIMARY   = "#2563eb";   // checking / buttons
const CFG_COLOR_SECONDARY = "#10b981";   // savings / deposits

// ── Timezone (display only) ──
const CFG_TIMEZONE = "GMT-5";

// ── Admin panel PIN (default — change in Admin panel after first run) ──
const CFG_ADMIN_PIN = "9999";

// ── Image paths (relative to repo root, or full https:// URLs) ──
const CFG_IMG_BANNER = "images/banner.png";
const CFG_IMG_LOGO   = "images/logo.png";
const CFG_IMG_ICON   = "images/icon.png";

// ── Version ──
const APP_VERSION = "31.3";

// ╔═══════════════════════════════════════════════════════════════════╗
// ║         END OF CONFIGURATION — DO NOT EDIT BELOW THIS LINE       ║
// ╚═══════════════════════════════════════════════════════════════════╝

// ════════════════════════════════════════════════════════════════════
// 0a. ICONS — central Phosphor map. Every UI icon in the app references
//     a semantic key here; to swap an icon, change one line.
//     Usage: icon('approve')  →  '<svg class="icon"><use href="..."/></svg>'
// ════════════════════════════════════════════════════════════════════
const ICONS = {
  // Actions
  approve:    "ph-check-circle",
  deny:       "ph-x-circle",
  check:      "ph-check",
  close:      "ph-x",
  add:        "ph-plus",
  edit:       "ph-pencil",
  trash:      "ph-trash",
  save:       "ph-floppy-disk",
  refresh:    "ph-arrows-clockwise",
  // Auth
  login:      "ph-sign-in",
  logout:     "ph-sign-out",
  lock:       "ph-lock",
  key:        "ph-key",
  // Money
  money:      "ph-money",
  dollar:     "ph-currency-dollar",
  checking:   "ph-money",
  savings:    "ph-piggy-bank",
  loan:       "ph-credit-card",
  deposit:    "ph-arrow-circle-down",
  withdraw:   "ph-arrow-circle-up",
  bank:       "ph-bank",
  // Content
  chores:     "ph-clipboard-text",
  history:    "ph-receipt",
  calendar:   "ph-calendar",
  chart:      "ph-chart-line-up",
  goal:       "ph-target",
  streak:     "ph-fire",
  milestone:  "ph-trophy",
  celebrate:  "ph-party-popper",
  sparkle:    "ph-sparkle",
  // Status
  pending:    "ph-hourglass",
  clock:      "ph-clock",
  warning:    "ph-warning",
  info:       "ph-info",
  email:      "ph-envelope",
  search:     "ph-magnifying-glass",
  hand:       "ph-hand",
  // People
  user:       "ph-user",
  users:      "ph-users",
  child:      "ph-baby",
  // System
  settings:   "ph-gear",
  image:      "ph-image",
  globe:      "ph-globe",
  timer:      "ph-timer",
  lightning:  "ph-lightning",
  // Arrows
  arrowRight: "ph-arrow-right",
  arrowLeft:  "ph-arrow-left",
  caretRight: "ph-caret-right",
  caretDown:  "ph-caret-down"
};

function icon(key, extraClass){
  const name = ICONS[key] || key; // allow direct ph-* keys too
  const cls  = "icon" + (extraClass ? " "+extraClass : "");
  return `<svg class="${cls}" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#${name}"/></svg>`;
}

// ════════════════════════════════════════════════════════════════════
// 0b. EMPTY-STATE ILLUSTRATIONS — inline SVG, duotone via CSS vars.
// ════════════════════════════════════════════════════════════════════
const ILLUSTRATIONS = {
  chores: () => `<svg class="illust" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="120" cy="96" r="60" fill="var(--primary)" opacity=".08"/><circle cx="120" cy="96" r="44" fill="var(--primary)" opacity=".18"/><path d="M100 96 L116 112 L144 82" stroke="var(--primary)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><g fill="var(--secondary)" opacity=".8"><circle cx="52" cy="44" r="4"/><circle cx="192" cy="52" r="5"/><circle cx="44" cy="140" r="3"/><circle cx="200" cy="132" r="4"/></g><path d="M180 28 L184 36 L192 40 L184 44 L180 52 L176 44 L168 40 L176 36 Z" fill="var(--warning,#f59e0b)" opacity=".7"/><path d="M60 68 L62 72 L66 74 L62 76 L60 80 L58 76 L54 74 L58 72 Z" fill="var(--primary)" opacity=".5"/></svg>`,
  history: () => `<svg class="illust" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="70" y="38" width="80" height="104" rx="6" fill="var(--primary)" opacity=".12"/><rect x="70" y="38" width="80" height="104" rx="6" stroke="var(--primary)" stroke-width="2.5" fill="none" opacity=".5"/><line x1="82" y1="62" x2="138" y2="62" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" opacity=".45"/><line x1="82" y1="80" x2="128" y2="80" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" opacity=".3"/><line x1="82" y1="98" x2="138" y2="98" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" opacity=".3"/><line x1="82" y1="116" x2="118" y2="116" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" opacity=".3"/><circle cx="156" cy="108" r="28" stroke="var(--secondary)" stroke-width="5" fill="white"/><line x1="176" y1="128" x2="196" y2="148" stroke="var(--secondary)" stroke-width="6" stroke-linecap="round"/></svg>`,
  goals:   () => `<svg class="illust" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="110" cy="100" r="52" fill="var(--secondary)" opacity=".12"/><circle cx="110" cy="100" r="52" stroke="var(--secondary)" stroke-width="2.5" opacity=".4" fill="none"/><circle cx="110" cy="100" r="36" stroke="var(--secondary)" stroke-width="2.5" opacity=".55" fill="none"/><circle cx="110" cy="100" r="20" stroke="var(--secondary)" stroke-width="2.5" opacity=".7" fill="none"/><circle cx="110" cy="100" r="6" fill="var(--secondary)"/><path d="M140 70 L188 30" stroke="var(--primary)" stroke-width="5" stroke-linecap="round"/><path d="M175 30 L188 30 L188 43" stroke="var(--primary)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M140 70 L150 60 L150 80 Z" fill="var(--primary)"/></svg>`,
  loans:   () => `<svg class="illust" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="120" cy="148" rx="72" ry="10" fill="var(--primary)" opacity=".08"/><ellipse cx="120" cy="138" rx="50" ry="10" fill="var(--primary)" opacity=".25"/><rect x="70" y="108" width="100" height="30" fill="var(--primary)" opacity=".45"/><ellipse cx="120" cy="108" rx="50" ry="10" fill="var(--primary)" opacity=".6"/><rect x="74" y="80" width="92" height="28" fill="var(--secondary)" opacity=".45"/><ellipse cx="120" cy="80" rx="46" ry="9" fill="var(--secondary)" opacity=".7"/><rect x="80" y="54" width="80" height="26" fill="var(--warning,#f59e0b)" opacity=".45"/><ellipse cx="120" cy="54" rx="40" ry="8" fill="var(--warning,#f59e0b)" opacity=".7"/><text x="120" y="60" text-anchor="middle" font-size="11" font-weight="700" fill="white" font-family="DM Mono, monospace">$</text><text x="120" y="86" text-anchor="middle" font-size="11" font-weight="700" fill="white" font-family="DM Mono, monospace">$</text><text x="120" y="114" text-anchor="middle" font-size="11" font-weight="700" fill="white" font-family="DM Mono, monospace">$</text></svg>`,
  children:() => `<svg class="illust" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="100" cy="70" r="24" fill="var(--primary)" opacity=".25"/><path d="M60 146 C60 122, 80 108, 100 108 C120 108, 140 122, 140 146 Z" fill="var(--primary)" opacity=".25"/><circle cx="170" cy="54" r="22" fill="var(--primary)" opacity=".15" stroke="var(--primary)" stroke-width="2.5" stroke-dasharray="4 4"/><circle cx="170" cy="108" r="20" fill="white" stroke="var(--secondary)" stroke-width="3"/><line x1="170" y1="100" x2="170" y2="116" stroke="var(--secondary)" stroke-width="3" stroke-linecap="round"/><line x1="162" y1="108" x2="178" y2="108" stroke="var(--secondary)" stroke-width="3" stroke-linecap="round"/></svg>`,
  chart:   () => `<svg class="illust" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="40" y1="150" x2="210" y2="150" stroke="var(--border,#e2e8f0)" stroke-width="2.5" stroke-linecap="round"/><line x1="40" y1="30" x2="40" y2="150" stroke="var(--border,#e2e8f0)" stroke-width="2.5" stroke-linecap="round"/><rect x="60"  y="110" width="22" height="40" rx="3" fill="var(--primary)"   opacity=".5"/><rect x="96"  y="90"  width="22" height="60" rx="3" fill="var(--primary)"   opacity=".7"/><rect x="132" y="70"  width="22" height="80" rx="3" fill="var(--secondary)" opacity=".7"/><rect x="168" y="50"  width="22" height="100" rx="3" fill="var(--secondary)"/><path d="M71 100 L107 80 L143 60 L179 40" stroke="var(--warning,#f59e0b)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="179" cy="40" r="5" fill="var(--warning,#f59e0b)"/></svg>`
};

function emptyState(illustKey, msg, extraStyle){
  const svg = (ILLUSTRATIONS[illustKey] && ILLUSTRATIONS[illustKey]()) || "";
  const sty = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="empty-state"${sty}>${svg}<div class="empty-msg">${msg}</div></div>`;
}

// ════════════════════════════════════════════════════════════════════
// 0c. AVATARS — emoji picker options + resolution helpers.
//     Per spec: device photo (localStorage) → synced emoji → fallback.
// ════════════════════════════════════════════════════════════════════
const AVATAR_EMOJIS = [
  "😀","😎","🤠","🥳","🤓","🦸","🧙","🧑‍🚀",
  "🐶","🐱","🐼","🦊","🐵","🦁","🐸","🐧",
  "🦄","🐙","🐢","🦖","🐝","🦋","🐳","🦈",
  "⭐","🌈","🌟","⚡","🔥","🎨","🎮","🎯"
];
const DEFAULT_AVATAR_PARENT = "😀";
const DEFAULT_AVATAR_CHILD  = "🐶";

function avatarPhotoKey(username){ return "fb_avatar_" + username; }

function getAvatarPhoto(username){
  if(!username) return null;
  try { return localStorage.getItem(avatarPhotoKey(username)) || null; } catch(e){ return null; }
}
function setAvatarPhoto(username, dataUrl){
  if(!username) return;
  try { localStorage.setItem(avatarPhotoKey(username), dataUrl); } catch(e){}
}
function clearAvatarPhoto(username){
  if(!username) return;
  try { localStorage.removeItem(avatarPhotoKey(username)); } catch(e){}
}

function getAvatarEmoji(username){
  if(!username) return DEFAULT_AVATAR_CHILD;
  const map = (state.config && state.config.avatars) || {};
  if(map[username]) return map[username];
  const role = state.roles && state.roles[username];
  return role === "parent" ? DEFAULT_AVATAR_PARENT : DEFAULT_AVATAR_CHILD;
}
function setAvatarEmoji(username, emoji){
  if(!state.config.avatars) state.config.avatars = {};
  state.config.avatars[username] = emoji;
}

/* Render an avatar chip. size: 'xs' | 'sm' | 'md' | 'lg'.
   Output is a <span class="avatar avatar-sm"> containing either an <img>
   or the emoji as text. */
function renderAvatar(username, size){
  size = size || "sm";
  const photo = getAvatarPhoto(username);
  if(photo){
    return `<span class="avatar avatar-${size} has-photo"><img src="${photo}" alt="" draggable="false"></span>`;
  }
  const emoji = getAvatarEmoji(username);
  return `<span class="avatar avatar-${size}"><span class="avatar-emoji">${emoji}</span></span>`;
}

/* Resize a File (from <input type="file">) to a 200x200 square PNG data URL.
   Center-crops. Returns a Promise. */
function resizeImageFileTo200(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width  - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 200, 200);
        try { resolve(canvas.toDataURL("image/jpeg", 0.85)); }
        catch(e){ reject(e); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ════════════════════════════════════════════════════════════════════
// 1. DEFAULTS
// ════════════════════════════════════════════════════════════════════
const DEFAULT_CONFIG = {
  bankName:       CFG_BANK_NAME,
  tagline:        CFG_BANK_TAGLINE,
  colorPrimary:   CFG_COLOR_PRIMARY,
  colorSecondary: CFG_COLOR_SECONDARY,
  imgBanner:      CFG_IMG_BANNER,
  imgLogo:        CFG_IMG_LOGO,
  imgIcon:        CFG_IMG_ICON,
  timezone:       CFG_TIMEZONE,
  adminPin:       CFG_ADMIN_PIN,
  emails:         {},
  avatars:        {},
  loginStats:     {}
};

// ════════════════════════════════════════════════════════════════════
// 2. RUNTIME STATE
// ════════════════════════════════════════════════════════════════════
let state = {
  config:   {...DEFAULT_CONFIG},
  pins: {}, roles: {}, users: [],
  children: {},
  history:  {}
};
let currentUser         = null;   // logged-in username
let currentRole         = null;   // "child" | "parent"
let activeChild         = null;   // child being managed (parent view)
let pendingTransactions = [];
let editingChoreId      = null;
let editingLoanId       = null;  // v30.1
let modalCallback       = null;
let inactivityTimer     = null;
let toastTimer          = null;
let choreFilter         = "today";
let nwFilterMonths      = 3;
let nwChartInstance     = null;   // Chart.js instance — destroyed/recreated on filter change
let pickerMode          = null;
let pickerSelected      = [];

// ════════════════════════════════════════════════════════════════════
// 3. UTILITIES
// ════════════════════════════════════════════════════════════════════
function fmt(v){ return "$"+(parseFloat(v)||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function todayStr(){ return new Date().toISOString().split("T")[0]; }
function fmtDate(d){
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
       + " " + d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
}
function shadeColor(hex,pct){
  try{
    const n=parseInt((hex||"#2563eb").replace("#",""),16);
    const r=Math.max(0,Math.min(255,(n>>16)+Math.round(2.55*pct)));
    const g=Math.max(0,Math.min(255,((n>>8)&0xff)+Math.round(2.55*pct)));
    const b=Math.max(0,Math.min(255,(n&0xff)+Math.round(2.55*pct)));
    return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
  }catch(e){ return "#1d4ed8"; }
}
function showFieldError(iId,mId,msg){
  const i=document.getElementById(iId), m=document.getElementById(mId);
  if(i) i.classList.add("input-error");
  if(m){ m.className="field-msg error"; m.textContent=msg; }
}
function clearFieldError(iId,mId){
  const i=document.getElementById(iId), m=document.getElementById(mId);
  if(i) i.classList.remove("input-error");
  if(m){ m.className="field-msg"; m.textContent=""; }
}
function getChildData(name){
  if(!state.children[name]){
    state.children[name]={balances:{checking:0,savings:0},rates:{checking:0,savings:0},autoDeposit:{checking:0,savings:0},chores:[]};
  }
  return state.children[name];
}
function getChildNames(){  return (state.users||[]).filter(u=>(state.roles||{})[u]==="child"); }
function getParentNames(){ return (state.users||[]).filter(u=>(state.roles||{})[u]==="parent"); }

function buildCalEventTitle(chore){
  return "🏦 "+chore.name+" — Earn $"+(parseFloat(chore.amount)||0).toFixed(2);
}

function choreRewardsEnabled(childName){
  const n=(state.config&&state.config.notify&&state.config.notify[childName||activeChild||currentUser])||{};
  return n.choreRewards!==false; // default ON
}

function getChildTabs(childName){
  const tabs = (state.config.tabs && state.config.tabs[childName]) || {};
  return {
    money:  tabs.money  !== false,  // default ON
    chores: tabs.chores !== false,  // default ON
    loans:  tabs.loans  === true    // default OFF
  };
}

// Migration — v1 flat structure → per-child
function migrateIfNeeded(){
  if(state.balances && !state.children["Linnea"]){
    const cn=getChildNames()[0]||"Linnea";
    state.children[cn]={
      balances:{...state.balances},
      rates:{...state.rates},
      autoDeposit:{...state.autoDeposit},
      chores:state.chores||[]
    };
    delete state.balances; delete state.rates; delete state.autoDeposit; delete state.chores;
  }
  // v32: migrate celebration sound from global config → per-user record.
  // Idempotent: only runs once, flagged on state.config.
  if(!state.config.celebrationMigrated_v32){
    if(!state.usersData) state.usersData = {};
    // state.users is an array of display names; mirror per-user settings
    // into state.usersData[name] objects so we have somewhere to live.
    (state.users||[]).forEach(u => {
      if(!state.usersData[u]) state.usersData[u] = {};
      if(state.usersData[u].celebrationSound === undefined){
        state.usersData[u].celebrationSound = true; // default ON for v32
      }
    });
    delete state.config.celebrationSound;
    state.config.celebrationMigrated_v32 = true;
  }
  // Build a convenience accessor — makes the playback site cleaner.
  if(!state.users_map) state.users_map = state.usersData || {};
}

// ════════════════════════════════════════════════════════════════════
// 4. MODAL + TOAST + EARNED POPUP
// ════════════════════════════════════════════════════════════════════
function openModal(opts){
  document.getElementById("modal-icon").textContent  = opts.icon  || "⚠️";
  document.getElementById("modal-title").textContent = opts.title || "Are you sure?";
  document.getElementById("modal-body").textContent  = opts.body  || "";
  const de=document.getElementById("modal-detail");
  if(opts.detail && Object.keys(opts.detail).length){
    de.innerHTML=Object.entries(opts.detail).map(([l,v])=>
      `<div class="detail-row"><span class="detail-label">${l}</span><span class="detail-val">${v}</span></div>`
    ).join("");
    de.classList.remove("hidden");
  } else { de.innerHTML=""; de.classList.add("hidden"); }
  const cb=document.getElementById("modal-confirm-btn");
  cb.textContent=opts.confirmText || "Confirm";
  cb.className="btn "+(opts.confirmClass || "btn-primary");
  document.getElementById("modal-btns").querySelector(".btn-ghost").style.display = opts.hideCancel ? "none" : "";
  modalCallback = opts.onConfirm || null;
  document.getElementById("modal-overlay").classList.add("open");
}
function openInputModal(opts){
  const de=document.getElementById("modal-detail");
  de.innerHTML=`<input type="${opts.inputType||"text"}" id="modal-dynamic-input" ${opts.inputAttrs||""} style="width:100%;margin-bottom:0;">`;
  de.classList.remove("hidden");
  document.getElementById("modal-icon").textContent=opts.icon||"✏️";
  document.getElementById("modal-title").textContent=opts.title||"";
  document.getElementById("modal-body").textContent=opts.body||"";
  const cb=document.getElementById("modal-confirm-btn");
  cb.textContent=opts.confirmText||"OK";
  cb.className="btn "+(opts.confirmClass||"btn-primary");
  document.getElementById("modal-btns").querySelector(".btn-ghost").style.display="";
  modalCallback = v => { if(opts.onConfirm) opts.onConfirm(v); };
  document.getElementById("modal-overlay").classList.add("open");
  setTimeout(()=>document.getElementById("modal-dynamic-input")?.focus(),200);
}
function closeModal(){ document.getElementById("modal-overlay").classList.remove("open"); modalCallback=null; }
function fireModalConfirm(){
  const v = document.getElementById("modal-dynamic-input")?.value ?? null;
  const cb = modalCallback;
  closeModal();
  if(typeof cb === "function") cb(v);
}
function handleOverlayClick(e){ if(e.target===document.getElementById("modal-overlay")) closeModal(); }

function showToast(msg,type="",dur=3200){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.className="toast "+type+" show";
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),dur);
}

function showEarnedPopup(amount,choreName){
  const p=document.getElementById("earned-popup");
  document.getElementById("earned-popup-amount").textContent="+"+fmt(amount);
  document.getElementById("earned-popup-label").textContent='"'+choreName+'" submitted!';
  // Confetti burst — rebuilt every time
  let burst = p.querySelector(".confetti-burst");
  if(!burst){
    burst = document.createElement("div");
    burst.className = "confetti-burst";
    p.insertBefore(burst, p.firstChild);
  }
  burst.innerHTML = "";
  const colors = ["var(--primary)","var(--secondary)","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];
  const pieces = 16;
  for(let i=0;i<pieces;i++){
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    const angle = (360/pieces)*i + (Math.random()*20 - 10);
    const dist  = 70 + Math.random()*40;
    const rot   = Math.random()*540 - 270;
    piece.style.setProperty("--cx", Math.cos(angle*Math.PI/180)*dist + "px");
    piece.style.setProperty("--cy", Math.sin(angle*Math.PI/180)*dist + "px");
    piece.style.setProperty("--cr", rot + "deg");
    piece.style.background = colors[i % colors.length];
    burst.appendChild(piece);
  }
  p.classList.remove("show");
  // reflow so animation restarts cleanly
  void p.offsetWidth;
  p.classList.add("show");
  // v32: Per-user celebration sound. Default on. Reads from the *child whose
  // chore was completed* (activeChild in parent sessions, currentUser in child
  // sessions). Falls back to false only if the user record says so explicitly.
  const celebrateFor = activeChild || currentUser;
  const userRec = celebrateFor && state.usersData ? state.usersData[celebrateFor] : null;
  const celebOn = userRec ? (userRec.celebrationSound !== false) : true;
  if(celebOn){
    try { playCelebrationSound(); } catch(e){}
  }
  setTimeout(()=>p.classList.remove("show"),3000);
}

/* Quick ascending chime via WebAudio — no asset needed, respects user opt-in. */
function playCelebrationSound(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return;
  const ctx = new Ctx();
  const notes = [660, 880, 1100];   // E5, A5, C#6
  const now = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = now + i*0.10;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.30);
  });
  setTimeout(() => { try { ctx.close(); } catch(e){} }, 800);
}

// ════════════════════════════════════════════════════════════════════
// 5. CLOUD LOAD & SYNC
// ════════════════════════════════════════════════════════════════════
async function loadFromCloud(){
  setStatus("loading","Connecting to bank...");
  try{
    const res=await fetch(API_URL+"?t="+Date.now());
    const data=await res.json();
    if(data && (data.children || data.balances || data.pins)){
      state={
        ...state,
        ...data,
        config:{...DEFAULT_CONFIG, ...(data.config||{})},
        children:data.children||{},
        history:data.history||{}
      };
      if(!state.users || !state.users.length) state.users=Object.keys(state.pins||{});
      if(!state.roles || !Object.keys(state.roles).length){
        state.roles={};
        state.users.forEach(u=>{ state.roles[u] = u==="Dad" ? "parent" : "child"; });
      }
      if(!state.config.emails) state.config.emails={};
      if(!state.config.avatars) state.config.avatars={};
      if(!state.config.loginStats) state.config.loginStats={};
      migrateIfNeeded();
      pendingTransactions=[];
      applyBranding();
      restoreRememberedUser();
      setStatus("ready","Connected ✓");
    } else {
      setStatus("error","Unexpected data — check API URL");
    }
  } catch(err){
    setStatus("error","Could not connect");
    console.error("[FamilyBank]",err);
  }
}

async function syncToCloud(action){
  renderBalances();
  const payload={
    ...state,
    tempTransactions:pendingTransactions,
    lastAction:action,
    activeChild:activeChild
  };
  delete payload.history;
  // Strip transient calendar-helper keys — must NOT persist
  delete payload._deletedChoreId;
  delete payload._deletedChoreTitle;
  delete payload._approvedChoreId;
  delete payload._approvedChoreTitle;
  delete payload._approvedChoreSchedule;
  delete payload._editedChoreId;
  pendingTransactions=[];
  try{
    await fetch(API_URL,{method:"POST",mode:"no-cors",body:JSON.stringify(payload)});
    setTimeout(loadFromCloud,1800);
  } catch(err){
    showToast("Sync error — change may not have saved!","error",5000);
  }
}

function recordTransaction(user,note,amt){
  const child=activeChild||user;
  const entry={date:fmtDate(new Date()),user,note,amt,child};
  pendingTransactions.push(entry);
  if(!state.history[child]) state.history[child]=[];
  state.history[child].push(entry);
}

// ════════════════════════════════════════════════════════════════════
// 6. BRANDING + BALANCES + STATUS
// ════════════════════════════════════════════════════════════════════
function applyBranding(){
  const cfg=state.config;
  document.getElementById("bank-name-display").textContent    = cfg.bankName || CFG_BANK_NAME;
  document.getElementById("bank-tagline-display").textContent = cfg.tagline  || CFG_BANK_TAGLINE;
  document.title = cfg.bankName || CFG_BANK_NAME;
  document.documentElement.style.setProperty("--primary",        cfg.colorPrimary   || CFG_COLOR_PRIMARY);
  document.documentElement.style.setProperty("--primary-dark",   shadeColor(cfg.colorPrimary   || CFG_COLOR_PRIMARY,   -20));
  document.documentElement.style.setProperty("--secondary",      cfg.colorSecondary || CFG_COLOR_SECONDARY);
  document.documentElement.style.setProperty("--secondary-dark", shadeColor(cfg.colorSecondary || CFG_COLOR_SECONDARY, -20));
  const bi=document.getElementById("banner-img"), li=document.getElementById("logo-img");
  if(cfg.imgBanner && bi){ bi.src=cfg.imgBanner; bi.style.display=""; }
  if(cfg.imgLogo   && li){ li.src=cfg.imgLogo;   li.style.display=""; }
}

function previewColor(which,val){
  if(which==="primary"){
    document.documentElement.style.setProperty("--primary",val);
    document.documentElement.style.setProperty("--primary-dark",shadeColor(val,-20));
  } else {
    document.documentElement.style.setProperty("--secondary",val);
    document.documentElement.style.setProperty("--secondary-dark",shadeColor(val,-20));
  }
}

function setStatus(type,text){
  document.getElementById("status-dot").className="status-dot "+type;
  document.getElementById("status-text").textContent=text;
  // Dismiss splash and reveal login form once connected (or errored)
  if(type==="ready" || type==="error"){
    const splash=document.getElementById("splash-screen");
    const form=document.getElementById("login-form-wrap");
    if(splash){ splash.style.opacity="0"; setTimeout(()=>splash.style.display="none",400); }
    if(form){ setTimeout(()=>{ form.style.opacity="1"; },200); }
    // Update splash bank name from loaded config
    const sbn=document.getElementById("splash-bank-name");
    const stag=document.getElementById("splash-tagline");
    const sst=document.getElementById("splash-status-text");
    if(sbn)  sbn.textContent  = state.config?.bankName || CFG_BANK_NAME;
    if(stag) stag.textContent = state.config?.tagline  || CFG_BANK_TAGLINE;
    if(sst)  sst.textContent  = type==="ready" ? "Connected ✓" : "Could not connect — check API URL";
  }
}

function renderBalances(){
  const child=activeChild||currentUser;
  const data=child ? getChildData(child) : {balances:{checking:0,savings:0},rates:{checking:0,savings:0}};
  document.getElementById("checking-val").textContent     = fmt(data.balances.checking);
  document.getElementById("savings-val").textContent      = fmt(data.balances.savings);
  document.getElementById("rate-chk-display").textContent = data.rates.checking || 0;
  document.getElementById("rate-sav-display").textContent = data.rates.savings  || 0;
  // v31: owner chip on checking card
  const chkCard = document.querySelector(".balance-card.checking");
  if(chkCard && child){
    let owner = chkCard.querySelector(".account-owner");
    if(!owner){
      owner = document.createElement("div");
      owner.className = "account-owner";
      chkCard.appendChild(owner);
    }
    owner.innerHTML = renderAvatar(child,"xs") + "<span>" + child + "</span>";
  }
  // Interest earned this month estimate
  const ec=(data.balances.checking*(data.rates.checking/100/12));
  const es=(data.balances.savings *(data.rates.savings /100/12));
  const echkEl=document.getElementById("earned-chk-display");
  const esavEl=document.getElementById("earned-sav-display");
  if(ec>0 && echkEl){ echkEl.textContent="+"+fmt(ec)+" /mo"; echkEl.classList.remove("hidden"); }
  else if(echkEl)   { echkEl.classList.add("hidden"); }
  if(es>0 && esavEl){ esavEl.textContent="+"+fmt(es)+" /mo"; esavEl.classList.remove("hidden"); }
  else if(esavEl)   { esavEl.classList.add("hidden"); }
}

// ════════════════════════════════════════════════════════════════════
// 7. TABS + CHORE BADGES
// ════════════════════════════════════════════════════════════════════
function switchTab(panel,tab){
  const bar=document.getElementById(panel+"-tab-bar");
  if(bar){
    bar.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    const idx=Array.from(bar.querySelectorAll(".tab-btn")).findIndex(b=>b.getAttribute("onclick")?.includes("'"+tab+"'"));
    if(idx>=0) bar.querySelectorAll(".tab-btn")[idx].classList.add("active");
  }
  // Hide all panels for this owner
  document.querySelectorAll("#"+panel+"-panel .tab-panel").forEach(p=>p.classList.remove("active"));
  const target=document.getElementById(panel+"-tab-"+tab);
  if(target) target.classList.add("active");
  // Render content for the activated tab
  if(panel==="parent" && tab==="chores")   renderParentChores();
  if(panel==="parent" && tab==="loans")    renderParentLoans();
  if(panel==="parent" && tab==="settings") renderParentSettings();
  if(panel==="child"  && tab==="chores")   renderChildChores();
  if(panel==="child"  && tab==="loans")    renderChildLoans();
}

function updateChoreBadges(){
  const child=activeChild||currentUser;
  if(!child) return;
  const chores=getChildData(child).chores||[];
  // Child badge — chores due today, not yet completed
  const childCount = chores.filter(c=>
    c.status==="available" && isDueToday(c) && c.lastCompleted!==todayStr()
  ).length;
  const cb=document.getElementById("child-chore-badge");
  if(cb){
    if(childCount>0){ cb.textContent=childCount; cb.classList.remove("hidden"); }
    else            { cb.classList.add("hidden"); }
  }
  // Parent badge — pending approvals
  const pendingCount = chores.filter(c=>c.status==="pending").length;
  const pb=document.getElementById("parent-chore-badge");
  if(pb){
    if(pendingCount>0){ pb.textContent=pendingCount; pb.classList.remove("hidden"); }
    else              { pb.classList.add("hidden"); }
    bindLongPressApprove();  // v31.2: long-press → quick approve
  }
}

function renderParentTabBar(){
  const bar=document.getElementById("parent-tab-bar");
  if(!bar||!activeChild) return;
  const tabs=getChildTabs(activeChild);
  const btns=[];
  btns.push(`<button class="tab-btn active" onclick="switchTab('parent','adjust')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-currency-dollar'/></svg> Adjust</button>`);
  btns.push(`<button class="tab-btn" onclick="switchTab('parent','chores')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-check-circle'/></svg> Chores <span class="notif-badge hidden" id="parent-chore-badge">0</span></button>`);
  if(tabs.loans) btns.push(`<button class="tab-btn" onclick="switchTab('parent','loans')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-bank'/></svg> Loans</button>`);
  btns.push(`<button class="tab-btn" onclick="switchTab('parent','settings')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-gear'/></svg> Settings</button>`);
  bar.className="tab-bar tabs-"+btns.length;
  bar.innerHTML=btns.join("");
}

function renderChildTabBar(){
  const tabs=getChildTabs(currentUser);
  const bar=document.getElementById("child-tab-bar");
  if(!bar) return;
  const btns=[];
  let firstTab=null;
  if(tabs.money) { btns.push({tab:"money", html:`<button class="tab-btn" onclick="switchTab('child','money')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-money'/></svg> Money</button>`}); if(!firstTab) firstTab="money"; }
  if(tabs.chores){ btns.push({tab:"chores",html:`<button class="tab-btn" onclick="switchTab('child','chores')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-check-circle'/></svg> Chores <span class="notif-badge hidden" id="child-chore-badge">0</span></button>`}); if(!firstTab) firstTab="chores"; }
  if(tabs.loans) { btns.push({tab:"loans", html:`<button class="tab-btn" onclick="switchTab('child','loans')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-bank'/></svg> Loans</button>`}); if(!firstTab) firstTab="loans"; }
  bar.className="tab-bar tabs-"+btns.length;
  bar.innerHTML=btns.map(b=>b.html).join("");
  if(firstTab){
    bar.querySelectorAll(".tab-btn")[0]?.classList.add("active");
    document.getElementById("child-tab-"+firstTab)?.classList.add("active");
  }
}

// ════════════════════════════════════════════════════════════════════
// 8. AUTH (login, logout, remember-me, child picker)
// ════════════════════════════════════════════════════════════════════
function attemptLogin(){
  clearFieldError("pin-input","pin-error");
  const userRaw=document.getElementById("username-input").value.trim();
  const pin=document.getElementById("pin-input").value;
  const user=state.users.find(u=>u.toLowerCase()===userRaw.toLowerCase());
  if(!user){ showFieldError("pin-input","pin-error","Name not recognised — check spelling."); return; }
  if(state.pins[user]!==pin){
    showFieldError("pin-input","pin-error","Incorrect PIN. Try again.");
    document.getElementById("pin-input").value="";
    return;
  }

  // Persist remember-me / auto-login choices
  const rememberUser=document.getElementById("remember-me").checked;
  const autoLogin=document.getElementById("auto-login-cb")?.checked;
  try{
    if(rememberUser){
      localStorage.setItem("fb_remembered_user",user);
      if(autoLogin) localStorage.setItem("fb_remembered_pin",pin);
      else          localStorage.removeItem("fb_remembered_pin");
    } else {
      localStorage.removeItem("fb_remembered_user");
      localStorage.removeItem("fb_remembered_pin");
    }
  } catch(e){}

  enterApp(user);
}

// Shared landing logic used by both attemptLogin and auto-login restore
function enterApp(user){
  currentUser=user;
  // v32: login counter 5-min guard — only increment if >5 min since last login.
  // stats.lastAt updates ONLY when counter increments (reloads inside window
  // leave both untouched).
  if(!state.config.loginStats) state.config.loginStats = {};
  const stats = state.config.loginStats[user] || {count:0, lastAt:null};
  const nowMs = Date.now();
  const lastMs = stats.lastAt ? new Date(stats.lastAt).getTime() : 0;
  const FIVE_MIN = 5*60*1000;
  if(!lastMs || (nowMs - lastMs) > FIVE_MIN){
    stats.count  = (parseInt(stats.count)||0) + 1;
    stats.lastAt = new Date().toISOString();
    state.config.loginStats[user] = stats;
    // Sync in the background — non-blocking, we don't want to delay the UI
    setTimeout(()=>{ try { syncToCloud("Login"); } catch(e){} }, 500);
  }
  currentRole=state.roles[user]||"child";
  document.getElementById("login-screen").classList.add("hidden");
  updateLogoutButtonLabel();
  if(currentRole==="parent"){
    // v32: parent uses single-line top bar, not child top-bar
    document.getElementById("child-top-bar")?.classList.add("hidden");
    document.getElementById("parent-top-bar")?.classList.remove("hidden");
    const children=getAssignedChildren();
    if(children.length===1){
      document.getElementById("main-screen").classList.remove("hidden");
      selectChild(children[0]);
    } else if(children.length>1){
      document.getElementById("child-picker-screen").classList.remove("hidden");
      showChildPicker();
    } else {
      document.getElementById("main-screen").classList.remove("hidden");
      // No assigned children — keep parent top bar visible but label generic
      const ptb=document.getElementById("ptb-child-name"); if(ptb) ptb.textContent="—";
      document.getElementById("parent-panel").classList.remove("hidden");
    }
  } else {
    // v32: child uses the original top-bar; parent top-bar stays hidden
    document.getElementById("parent-top-bar")?.classList.add("hidden");
    document.getElementById("child-top-bar")?.classList.remove("hidden");
    activeChild=user;
    document.getElementById("main-screen").classList.remove("hidden");
    document.getElementById("welcome-msg").innerHTML=renderAvatar(user,"sm")+' <span>Hi, '+user+'! 👋</span>';
    document.getElementById("child-panel").classList.remove("hidden");
    renderChildTabBar();
    renderBalances(); renderChildChores(); renderSavingsGoals(); renderPendingDeposits(); renderChildLoans(); showChoreWaitingBanner(); updateChoreBadges(); renderChildAvatar();
    initInactivityTimer();
  }
}

function logout(){
  currentUser=null; currentRole=null; activeChild=null;
  pendingTransactions=[];
  document.getElementById("main-screen").classList.add("hidden");
  document.getElementById("child-picker-screen").classList.add("hidden");
  document.getElementById("parent-panel").classList.add("hidden");
  document.getElementById("child-panel").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("pin-input").value="";
  clearTimeout(inactivityTimer);
}

function updateLogoutButtonLabel(){
  const btn=document.getElementById("logout-btn-main");
  if(btn) btn.textContent=currentRole==="parent" ? "Log Out" : "Log Out";
}

function changePinPrompt(who){
  const target = who==="parent" ? currentUser : (activeChild||currentUser);
  openInputModal({
    icon:"🔑", title:"Change PIN for "+target,
    body:"Enter a new 4-digit PIN.",
    inputType:"password", inputAttrs:'maxlength="4" inputmode="numeric" placeholder="••••"',
    confirmText:"Save",
    onConfirm:v=>{
      if(!v||v.length!==4||!/^\d{4}$/.test(v)){ showToast("PIN must be exactly 4 digits.","error"); return; }
      state.pins[target]=v;
      syncToCloud("PIN Changed");
      showToast("PIN updated.","success");
    }
  });
}

function confirmResetChildPin(){
  if(!activeChild) return;
  openModal({
    icon:"🔄", title:"Reset "+activeChild+"'s PIN?",
    body:"PIN will be set to 0000.",
    confirmText:"Reset", confirmClass:"btn-danger",
    onConfirm:()=>{
      state.pins[activeChild]="0000";
      syncToCloud("Child PIN Reset");
      showToast(activeChild+"'s PIN reset to 0000.","success");
    }
  });
}

function onRememberMeChange(){
  const checked=document.getElementById("remember-me").checked;
  const autoWrap=document.getElementById("auto-login-wrap");
  const autoCb=document.getElementById("auto-login-cb");
  if(autoWrap) autoWrap.style.display = checked ? "block" : "none";
  if(!checked){
    if(autoCb) autoCb.checked=false;
    try{
      localStorage.removeItem("fb_remembered_user");
      localStorage.removeItem("fb_remembered_pin");
    }catch(e){}
    document.getElementById("not-you-btn")?.classList.add("hidden");
  }
}
function onAutoLoginChange(){
  const autoCb=document.getElementById("auto-login-cb");
  if(!autoCb||!autoCb.checked){ try{ localStorage.removeItem("fb_remembered_pin"); }catch(e){} }
}
function clearRememberedUser(){
  try{
    localStorage.removeItem("fb_remembered_user");
    localStorage.removeItem("fb_remembered_pin");
  }catch(e){}
  const ni=document.getElementById("username-input");
  const rc=document.getElementById("remember-me");
  const ac=document.getElementById("auto-login-cb");
  const nb=document.getElementById("not-you-btn");
  const aw=document.getElementById("auto-login-wrap");
  if(ni){ ni.value=""; ni.focus(); }
  if(rc) rc.checked=false;
  if(ac) ac.checked=false;
  if(nb) nb.classList.add("hidden");
  if(aw) aw.style.display="none";
}
function restoreRememberedUser(){
  try{
    const saved=localStorage.getItem("fb_remembered_user");
    if(!saved) return;
    const valid=state.users.find(u=>u.toLowerCase()===saved.toLowerCase());
    if(!valid){
      localStorage.removeItem("fb_remembered_user");
      localStorage.removeItem("fb_remembered_pin");
      return;
    }
    const ni=document.getElementById("username-input");
    const rc=document.getElementById("remember-me");
    const aw=document.getElementById("auto-login-wrap");
    const nb=document.getElementById("not-you-btn");
    if(ni) ni.value=valid;
    if(rc) rc.checked=true;
    if(aw) aw.style.display="block";
    if(nb) nb.classList.remove("hidden");
    // Try auto-login
    const savedPin=localStorage.getItem("fb_remembered_pin");
    if(savedPin && state.pins[valid]===savedPin){
      const ac=document.getElementById("auto-login-cb");
      if(ac) ac.checked=true;
      enterApp(valid);
      return;
    }
    setTimeout(()=>document.getElementById("pin-input")?.focus(),400);
  }catch(e){}
}

function showChildPicker(){
  if(currentRole!=="parent") return;  // safety: children must never reach the picker
  const children=getAssignedChildren();
  document.getElementById("picker-welcome").innerHTML=renderAvatar(currentUser,"sm")+' <span>Hi '+currentUser+'! 👋</span>';
  document.getElementById("main-screen").classList.add("hidden");
  document.getElementById("child-picker-screen").classList.remove("hidden");
  const list=document.getElementById("child-picker-list");
  if(!children.length){
    list.innerHTML=emptyState("children","No children assigned. Add one in Admin.");
    return;
  }
  list.innerHTML=children.map(name=>{
    const d=getChildData(name);
    const total=(d.balances?.checking||0)+(d.balances?.savings||0);
    return `<button class="child-btn with-avatar" onclick="selectChild('${name}')">
      ${renderAvatar(name,"md")}
      ${name}
      <div class="child-btn-balance">Total: ${fmt(total)}</div>
      <span class="child-btn-arrow">›</span>
    </button>`;
  }).join("");
}

function selectChild(childName){
  activeChild=childName;
  document.getElementById("child-picker-screen").classList.add("hidden");
  document.getElementById("main-screen").classList.remove("hidden");
  // v32: Parent uses single-line top bar; child-top-bar stays hidden for parent
  document.getElementById("child-top-bar")?.classList.add("hidden");
  document.getElementById("parent-top-bar")?.classList.remove("hidden");
  const ptb=document.getElementById("ptb-child-name");
  if(ptb) ptb.textContent=childName;
  document.getElementById("parent-panel").classList.remove("hidden");
  document.getElementById("child-panel").classList.add("hidden");
  renderParentTabBar();
  renderBalances(); renderParentChores(); renderParentLoans(); renderParentGoals(); renderPendingDeposits(); renderParentDepositApprovals(); renderParentSettings(); renderWeekAtGlance();
  document.getElementById("goals-child-name").textContent=childName;
  document.getElementById("loans-child-name").textContent=childName;
  updateChoreBadges();
  initInactivityTimer();
}

function getAssignedChildren(){
  const all=getChildNames();
  if(!currentUser || currentRole!=="parent") return all;
  const assigned=(state.config.parentChildren && state.config.parentChildren[currentUser]) || [];
  if(!assigned.length) return all;  // none selected = sees all
  return all.filter(c=>assigned.indexOf(c)!==-1);
}

// ════════════════════════════════════════════════════════════════════
// 9. CHILD MONEY ACTIONS
// ════════════════════════════════════════════════════════════════════
function onChildActionChange(){
  const action=document.getElementById("child-action").value;
  const hint=document.getElementById("child-action-hint");
  const btn=document.getElementById("child-action-btn");
  const splitWrap=document.getElementById("child-deposit-split-wrap");
  const loanWrap=document.getElementById("child-loan-select-wrap");
  const noteLabel=document.getElementById("child-note-label");

  splitWrap.classList.add("hidden");
  loanWrap.classList.add("hidden");

  if(action==="withdraw"){
    hint.textContent="Take cash out of your checking account.";
    btn.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-arrow-circle-up'/></svg> Withdraw Cash"; btn.className="btn btn-primary";
    noteLabel.textContent="What is this for?";
  } else if(action==="transfer"){
    hint.textContent="Move money from checking to savings.";
    btn.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-piggy-bank'/></svg> Transfer to Savings"; btn.className="btn btn-secondary";
    noteLabel.textContent="What is this for?";
  } else if(action==="deposit"){
    hint.textContent="Submit money for parent approval. Once approved it will be added to your account.";
    btn.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-arrow-circle-down'/></svg> Submit Deposit"; btn.className="btn btn-secondary";
    splitWrap.classList.remove("hidden");
    noteLabel.textContent="Where did this money come from?";
  } else if(action==="loanpayment"){
    hint.textContent="Pay extra toward a loan's principal balance.";
    btn.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-credit-card'/></svg> Pay Loan"; btn.className="btn btn-warning";
    loanWrap.classList.remove("hidden");
    noteLabel.textContent="Note (optional)";
    populateChildLoanSelect();
  }
}

function updateDepositSplitLabel(){
  const p=parseInt(document.getElementById("deposit-split").value);
  document.getElementById("dep-split-chk-label").textContent=p;
  document.getElementById("dep-split-sav-label").textContent=100-p;
}

function validateChildForm(){
  const action=document.getElementById("child-action").value;
  const amt=parseFloat(document.getElementById("child-amt").value);
  const note=document.getElementById("child-note").value.trim();
  clearFieldError("child-amt","child-amt-msg");
  clearFieldError("child-note","child-note-msg");
  if(!amt||amt<=0){ showFieldError("child-amt","child-amt-msg","Enter a valid amount."); return null; }
  if(action!=="loanpayment" && !note){ showFieldError("child-note","child-note-msg","Please add a note."); return null; }
  return {action,amt,note};
}

function doChildAction(){
  const v=validateChildForm();
  if(!v) return;
  if(v.action==="withdraw")    confirmWithdraw();
  else if(v.action==="transfer") confirmTransfer();
  else if(v.action==="deposit")  submitDeposit();
  else if(v.action==="loanpayment"){
    const sel=document.getElementById("child-loan-select").value;
    if(!sel){ showToast("Select a loan to pay.","error"); return; }
    applyLoanPayment(sel);
  }
}

function confirmWithdraw(){
  const v=validateChildForm(); if(!v) return;
  const data=getChildData(currentUser);
  if(v.amt>data.balances.checking){ showToast("Not enough in checking.","error"); return; }
  openModal({
    icon:"💸", title:"Withdraw "+fmt(v.amt)+"?",
    body:"This will take "+fmt(v.amt)+" from your checking account.",
    detail:{Note:v.note,From:"Checking",Amount:fmt(v.amt)},
    confirmText:"Withdraw", confirmClass:"btn-primary",
    onConfirm:()=>{
      data.balances.checking-=v.amt;
      recordTransaction(currentUser,"Withdraw: "+v.note,-v.amt);
      syncToCloud("Withdraw");
      showToast("Withdrew "+fmt(v.amt)+".","success");
      document.getElementById("child-amt").value=""; document.getElementById("child-note").value="";
    }
  });
}

function confirmTransfer(){
  const v=validateChildForm(); if(!v) return;
  const data=getChildData(currentUser);
  if(v.amt>data.balances.checking){ showToast("Not enough in checking.","error"); return; }
  openModal({
    icon:"🏦", title:"Transfer "+fmt(v.amt)+" to savings?",
    body:"Move "+fmt(v.amt)+" from checking to savings.",
    detail:{Note:v.note,From:"Checking",To:"Savings",Amount:fmt(v.amt)},
    confirmText:"Transfer", confirmClass:"btn-secondary",
    onConfirm:()=>{
      data.balances.checking-=v.amt; data.balances.savings+=v.amt;
      recordTransaction(currentUser,"Transfer to Savings: "+v.note,-v.amt);
      recordTransaction(currentUser,"Transfer to Savings: "+v.note+" (Sav)",v.amt);
      syncToCloud("Transfer");
      showToast("Transferred "+fmt(v.amt)+" to savings.","success");
      document.getElementById("child-amt").value=""; document.getElementById("child-note").value="";
    }
  });
}

function submitDeposit(){
  const v=validateChildForm(); if(!v) return;
  const splitChk=parseInt(document.getElementById("deposit-split").value);
  const data=getChildData(currentUser);
  if(!data.pendingDeposits) data.pendingDeposits=[];
  data.pendingDeposits.push({
    id:"dep_"+Date.now(),
    amount:v.amt, note:v.note, splitChk,
    submittedBy:currentUser, submittedAt:fmtDate(new Date())
  });
  syncToCloud("Deposit Submitted");
  showToast("Deposit submitted for approval. 📥","success");
  document.getElementById("child-amt").value=""; document.getElementById("child-note").value="";
  renderPendingDeposits();
}

function renderPendingDeposits(){
  const child=activeChild||currentUser;
  const data=getChildData(child);
  const el=document.getElementById("deposit-pending-list");
  if(!el) return;
  const pending=(data.pendingDeposits||[]).filter(d=>d.submittedBy===currentUser);
  if(!pending.length){ el.innerHTML=""; return; }
  el.innerHTML=`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px;margin-bottom:10px;font-size:.78rem;color:#92400e;">
    <svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-hourglass'/></svg> ${pending.length} deposit${pending.length===1?"":"s"} awaiting approval — total ${fmt(pending.reduce((s,d)=>s+d.amount,0))}
  </div>`;
}

function renderParentDepositApprovals(){
  const data=getChildData(activeChild);
  const pending=data.pendingDeposits||[];
  const el=document.getElementById("parent-deposit-approvals");
  if(!el) return;
  if(!pending.length){ el.innerHTML=""; return; }
  el.innerHTML=`<div class="approval-banner">
    <h3><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-hourglass'/></svg> Deposits Awaiting Approval (${pending.length})</h3>
    ${pending.map(d=>`
      <div class="chore-card state-pending">
        <div class="chore-card-header">
          <span class="chore-card-name">${d.note}</span>
          <span class="chore-card-amount">${fmt(d.amount)}</span>
        </div>
        <div class="chore-card-meta">
          By <strong>${d.submittedBy}</strong> at ${d.submittedAt}<br>
          Split: ${d.splitChk}% Chk / ${100-d.splitChk}% Sav
        </div>
        <div class="row" style="gap:8px;">
          <button class="btn btn-secondary btn-sm col" onclick="approveDeposit('${d.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-check-circle'/></svg> Approve</button>
          <button class="btn btn-danger    btn-sm col" onclick="denyDeposit('${d.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-x-circle'/></svg> Deny</button>
        </div>
      </div>`).join("")}
  </div>`;
}

function approveDeposit(depositId){
  const data=getChildData(activeChild);
  const dep=(data.pendingDeposits||[]).find(d=>d.id===depositId);
  if(!dep) return;
  const ck=dep.amount*(dep.splitChk/100), sv=dep.amount*((100-dep.splitChk)/100);
  data.balances.checking+=ck; data.balances.savings+=sv;
  if(ck>0) recordTransaction("Bank","Deposit: "+dep.note+" (Chk)",ck);
  if(sv>0) recordTransaction("Bank","Deposit: "+dep.note+" (Sav)",sv);
  data.pendingDeposits=data.pendingDeposits.filter(d=>d.id!==depositId);
  syncToCloud("Deposit Approved");
  showToast("Deposit approved! "+fmt(dep.amount)+" added.","success");
  renderParentDepositApprovals();
}

function denyDeposit(depositId){
  const data=getChildData(activeChild);
  const dep=(data.pendingDeposits||[]).find(d=>d.id===depositId);
  if(!dep) return;
  openModal({
    icon:"❌", title:"Deny deposit?",
    body:"Reject this "+fmt(dep.amount)+" deposit from "+dep.submittedBy+"?",
    confirmText:"Deny", confirmClass:"btn-danger",
    onConfirm:()=>{
      data.pendingDeposits=data.pendingDeposits.filter(d=>d.id!==depositId);
      syncToCloud("Deposit Denied");
      showToast("Deposit denied.","info");
      renderParentDepositApprovals();
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// 10. PARENT ADJUST + ALLOWANCE + RATES
// ════════════════════════════════════════════════════════════════════
function confirmAdjust(){
  const ck=parseFloat(document.getElementById("adj-chk").value)||0;
  const sv=parseFloat(document.getElementById("adj-sav").value)||0;
  const note=document.getElementById("adj-note").value.trim();
  clearFieldError("adj-note","adj-msg");
  if(!note){ showFieldError("adj-note","adj-msg","Reason is required."); return; }
  if(ck===0 && sv===0){ showFieldError("adj-note","adj-msg","Enter at least one amount (positive or negative)."); return; }
  const data=getChildData(activeChild);
  data.balances.checking+=ck; data.balances.savings+=sv;
  if(ck!==0) recordTransaction(currentUser,"Adjust: "+note+(ck<0?" (withdraw)":" (deposit)"),ck);
  if(sv!==0) recordTransaction(currentUser,"Adjust: "+note+(sv<0?" (withdraw, Sav)":" (deposit, Sav)"),sv);
  syncToCloud("Adjustment");
  showToast("Adjustment applied.","success");
  document.getElementById("adj-chk").value=""; document.getElementById("adj-sav").value=""; document.getElementById("adj-note").value="";
}

function saveAllowance(){
  const data=getChildData(activeChild);
  const sched=document.getElementById("allow-schedule").value;
  data.autoDeposit=data.autoDeposit||{};
  data.autoDeposit.checking=parseFloat(document.getElementById("allow-chk").value)||0;
  data.autoDeposit.savings =parseFloat(document.getElementById("allow-sav").value)||0;
  data.autoDeposit.schedule=sched;
  if(sched==="weekly"||sched==="biweekly"){
    data.autoDeposit.weekday=getAllowanceSelectedDay();
  } else if(sched==="monthly"){
    data.autoDeposit.monthlyDay=document.getElementById("allow-monthly-day").value;
  }
  syncToCloud("Allowance Update");
  showToast("Allowance saved.","success");
}

function saveRates(){
  const data=getChildData(activeChild);
  data.rates.checking=parseFloat(document.getElementById("rate-chk").value)||0;
  data.rates.savings =parseFloat(document.getElementById("rate-sav").value)||0;
  renderBalances();
  syncToCloud("Rates Update");
  showToast("Interest rates saved.","success");
}

function renderParentSettings(){
  const data=getChildData(activeChild);
  document.getElementById("rate-chk").value=data.rates.checking||"";
  document.getElementById("rate-sav").value=data.rates.savings ||"";
  const ad=data.autoDeposit||{};
  document.getElementById("allow-chk").value=ad.checking||"";
  document.getElementById("allow-sav").value=ad.savings ||"";
  document.getElementById("allow-schedule").value=ad.schedule||"weekly";
  onAllowanceScheduleChange();
  if(ad.schedule==="monthly" && ad.monthlyDay){
    document.getElementById("allow-monthly-day").value=ad.monthlyDay;
  }
  if((ad.schedule==="weekly"||ad.schedule==="biweekly"||!ad.schedule) && ad.weekday!==undefined){
    setAllowanceDayToggles([ad.weekday]);
  }
  // v30.1: populate child profile section
  renderChildProfileSection();
}

// v30.1: Child profile — email, calendar, notifications, tabs
function renderChildProfileSection(){
  if(!activeChild) return;
  const cfg=state.config;
  document.getElementById("profile-section-title").textContent = activeChild + " — Profile";
  document.getElementById("profile-email").value       = (cfg.emails    && cfg.emails[activeChild])    || "";
  document.getElementById("profile-calendar-id").value = (cfg.calendars && cfg.calendars[activeChild]) || "";
  const notify=(cfg.notify && cfg.notify[activeChild]) || {};
  document.getElementById("profile-notify-email").checked  = notify.email        !== false;  // default ON
  document.getElementById("profile-notify-cal").checked    = !!notify.calendar;              // default OFF
  document.getElementById("profile-chore-rewards").checked = notify.choreRewards !== false;  // default ON
  // v32: per-user celebration sound (default ON)
  const ud = (state.usersData && state.usersData[activeChild]) || {};
  const csProfile = document.getElementById("profile-celebration-sound");
  if(csProfile) csProfile.checked = (ud.celebrationSound !== false);
  // Tabs
  const tabs=getChildTabs(activeChild);
  const selected=[];
  if(tabs.money)  selected.push("money");
  if(tabs.chores) selected.push("chores");
  if(tabs.loans)  selected.push("loans");
  if(!window._pickerSelections) window._pickerSelections={};
  window._pickerSelections.profileTabs=[...selected];
  updatePickerDisplay("profileTabs", selected, PICKER_CONFIG.profileTabs);
  // Clear any prior message
  document.getElementById("profile-msg").className="field-msg";
  document.getElementById("profile-msg").textContent="";
}

function saveChildProfile(){
  if(!activeChild) return;
  const msgEl=document.getElementById("profile-msg"); msgEl.className="field-msg";
  const email=document.getElementById("profile-email").value.trim();
  const calId=document.getElementById("profile-calendar-id").value.trim();
  if(!state.config.emails)    state.config.emails={};
  if(!state.config.calendars) state.config.calendars={};
  if(!state.config.notify)    state.config.notify={};
  if(!state.config.tabs)      state.config.tabs={};
  state.config.emails[activeChild]=email;
  if(calId) state.config.calendars[activeChild]=calId;
  else      delete state.config.calendars[activeChild];
  state.config.notify[activeChild]={
    email:        document.getElementById("profile-notify-email").checked,
    calendar:     document.getElementById("profile-notify-cal").checked,
    choreRewards: document.getElementById("profile-chore-rewards").checked
  };
  // v32: per-user celebration sound
  if(!state.usersData) state.usersData={};
  if(!state.usersData[activeChild]) state.usersData[activeChild]={};
  const csProfile = document.getElementById("profile-celebration-sound");
  if(csProfile) state.usersData[activeChild].celebrationSound = !!csProfile.checked;
  const sel=getPickerSelections("profileTabs");
  state.config.tabs[activeChild]={
    money:  sel.indexOf("money")!==-1,
    chores: sel.indexOf("chores")!==-1,
    loans:  sel.indexOf("loans")!==-1
  };
  syncToCloud("Child Profile Updated");
  msgEl.className="field-msg success";
  msgEl.textContent="Profile saved.";
  showToast(activeChild+"'s profile updated. 💾","success");
  // If assigned tabs changed, the child's tab bar will reflect on their next login
  renderParentTabBar();  // loan tab may appear/disappear for parent too
}

function openProfilePicker(){ openPicker("profileTabs"); }

function populateAllowanceMonthlyDays(){
  const sel=document.getElementById("allow-monthly-day");
  if(!sel||sel.options.length>0) return;
  for(let i=1;i<=28;i++) sel.appendChild(new Option(i+(i===1?"st":i===2?"nd":i===3?"rd":"th"), String(i)));
  ["last-2","last-1","last"].forEach(v=>{
    const lbl = v==="last"?"Last day":v==="last-1"?"2nd to last":"3rd to last";
    sel.appendChild(new Option(lbl, v));
  });
}

function onAllowanceScheduleChange(){
  const s=document.getElementById("allow-schedule").value;
  document.getElementById("allow-day-wrap").classList.toggle("hidden",s==="monthly");
  document.getElementById("allow-monthly-wrap").classList.toggle("hidden",s!=="monthly");
  const lbl=document.getElementById("allow-day-label");
  if(lbl) lbl.textContent = s==="biweekly" ? "Day of Week (every other week)" : "Day of Week";
}

function toggleAllowanceDay(btn){
  // Single-select for allowance day
  document.querySelectorAll("#allow-day-toggles .day-toggle").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");
}

function getAllowanceSelectedDay(){
  const sel=document.querySelector("#allow-day-toggles .day-toggle.selected");
  return sel ? parseInt(sel.dataset.day) : 1;
}

function setAllowanceDayToggles(days){
  document.querySelectorAll("#allow-day-toggles .day-toggle").forEach(b=>b.classList.remove("selected"));
  days.forEach(d=>{
    const el=document.querySelector(`#allow-day-toggles .day-toggle[data-day='${d}']`);
    if(el) el.classList.add("selected");
  });
}

// ════════════════════════════════════════════════════════════════════
// 11. CHORES — SCHEDULE UI, PER-DAY TIMES, CREATE/EDIT/APPROVE
// ════════════════════════════════════════════════════════════════════
function toggleDayBtn(btn){
  const s=document.getElementById("chore-schedule").value;
  if(s==="weekly"){
    // Single-select for weekly
    document.querySelectorAll("#chore-weekday-toggles .day-toggle").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
  } else {
    // Multi-select for biweekly
    btn.classList.toggle("selected");
  }
  document.getElementById("weekday-none-msg").classList.add("hidden");
  // Per-day-time editor visibility depends on selected days
  refreshPerDayTimeUI();
}

function getSelectedDays(){
  return Array.from(document.querySelectorAll("#chore-weekday-toggles .day-toggle.selected"))
    .map(b=>parseInt(b.dataset.day));
}

function setSelectedDays(days){
  document.querySelectorAll("#chore-weekday-toggles .day-toggle").forEach(b=>b.classList.remove("selected"));
  days.forEach(d=>{
    const el=document.querySelector(`#chore-weekday-toggles .day-toggle[data-day='${d}']`);
    if(el) el.classList.add("selected");
  });
}

function resetDayToggles(){
  document.querySelectorAll("#chore-weekday-toggles .day-toggle").forEach(b=>b.classList.remove("selected"));
}

function populateMonthlyDays(){
  const sel=document.getElementById("chore-monthly-day");
  if(!sel||sel.options.length>0) return;
  for(let i=1;i<=28;i++) sel.appendChild(new Option(i+(i===1?"st":i===2?"nd":i===3?"rd":"th"), String(i)));
  ["last-2","last-1","last"].forEach(v=>{
    const lbl = v==="last"?"Last day":v==="last-1"?"2nd to last":"3rd to last";
    sel.appendChild(new Option(lbl, v));
  });
}

function onScheduleChange(){
  const s=document.getElementById("chore-schedule").value;
  document.getElementById("chore-once-wrap").classList.toggle("hidden",s!=="once");
  document.getElementById("chore-weekday-wrap").classList.toggle("hidden",s!=="weekly" && s!=="biweekly");
  document.getElementById("chore-monthly-wrap").classList.toggle("hidden",s!=="monthly");

  // v30.1: skip-first-week checkbox is bi-weekly only
  document.getElementById("chore-skip-week-wrap").classList.toggle("hidden", s!=="biweekly");

  // Per-day-time editor: only meaningful for weekly/biweekly
  document.getElementById("chore-per-day-time-wrap").classList.toggle("hidden", s!=="weekly" && s!=="biweekly");
  refreshPerDayTimeUI();

  const wl=document.getElementById("chore-weekday-label");
  if(wl) wl.textContent = s==="biweekly"
    ? "Due Days (every other week — select one or more)"
    : "Due Day of Week";

  const streakWrap=document.getElementById("chore-streak-section");
  if(streakWrap) streakWrap.classList.toggle("hidden",s==="once");

  if(s==="once"){
    toggleOnceDateField();
  } else {
    const ec=document.getElementById("chore-enddate-col");
    if(ec) ec.classList.toggle("hidden",s==="daily");
    const endLabel=document.getElementById("end-date-label");
    if(endLabel) endLabel.textContent="End Date (optional)";
    document.getElementById("chore-once-hint").style.display="none";
    document.getElementById("chore-reminder-row")?.classList.remove("hidden");
  }
}

// ── PER-DAY TIME EDITOR ─────────────────────────────────────────────
// Logic: visible only when schedule is weekly/biweekly. Default "Same time
// for all days" is checked → use the single #chore-reminder-time. Uncheck →
// show one row per selected day with its own time.
function onSameTimeToggle(){ refreshPerDayTimeUI(); }

function refreshPerDayTimeUI(){
  const wrap=document.getElementById("chore-per-day-time-wrap");
  const grid=document.getElementById("chore-per-day-times");
  const sched=document.getElementById("chore-schedule").value;
  if(sched!=="weekly" && sched!=="biweekly"){
    wrap.classList.add("hidden");
    grid.classList.add("hidden");
    grid.innerHTML="";
    return;
  }
  const sameTime=document.getElementById("chore-same-time").checked;
  const selectedDays=getSelectedDays();

  // Hide single time picker when per-day mode is active and ≥1 day chosen
  const singleRow=document.getElementById("chore-reminder-row");
  if(!sameTime && selectedDays.length>0){
    singleRow.classList.add("hidden");
    grid.classList.remove("hidden");
    renderPerDayTimeRows(selectedDays);
  } else {
    singleRow.classList.remove("hidden");
    grid.classList.add("hidden");
    grid.innerHTML="";
  }
}

function renderPerDayTimeRows(days){
  const grid=document.getElementById("chore-per-day-times");
  const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  // Preserve any existing values when rebuilding
  const existing={};
  grid.querySelectorAll("select[data-day]").forEach(s=>{ existing[s.dataset.day]=s.value; });
  // Default time = current single-picker value
  const defaultHour=document.getElementById("chore-reminder-time").value || "8";
  grid.innerHTML=days.map(d=>{
    const val=existing[d] || defaultHour;
    return `<div class="per-day-time-row">
      <div class="day-label">${dayNames[d]}</div>
      <select data-day="${d}">
        ${TIME_OPTIONS.map(o=>`<option value="${o.v}"${o.v===val?" selected":""}>${o.l}</option>`).join("")}
      </select>
    </div>`;
  }).join("");
}

const TIME_OPTIONS = [
  {v:"6",  l:"6:00 AM"},{v:"7",  l:"7:00 AM"},{v:"8",  l:"8:00 AM"},
  {v:"9",  l:"9:00 AM"},{v:"10", l:"10:00 AM"},{v:"11", l:"11:00 AM"},
  {v:"12", l:"12:00 PM (Noon)"},{v:"13", l:"1:00 PM"},{v:"14", l:"2:00 PM"},
  {v:"15", l:"3:00 PM (After school)"},{v:"16", l:"4:00 PM"},{v:"17", l:"5:00 PM"},
  {v:"18", l:"6:00 PM (Evening)"},{v:"19", l:"7:00 PM"},{v:"20", l:"8:00 PM"}
];

// Read per-day times from the editor. Returns {} if "same time" is checked.
function readPerDayTimes(){
  const sameTime=document.getElementById("chore-same-time")?.checked;
  if(sameTime!==false) return {};  // checked or undefined → use single time
  const out={};
  document.querySelectorAll("#chore-per-day-times select[data-day]").forEach(s=>{
    out[s.dataset.day]=parseInt(s.value)||8;
  });
  return out;
}

// Pre-populate the per-day time editor when editing a chore
function setPerDayTimes(dayTimes){
  if(!dayTimes || !Object.keys(dayTimes).length){
    document.getElementById("chore-same-time").checked=true;
  } else {
    document.getElementById("chore-same-time").checked=false;
  }
  refreshPerDayTimeUI();
  if(dayTimes && Object.keys(dayTimes).length){
    Object.entries(dayTimes).forEach(([d,h])=>{
      const sel=document.querySelector(`#chore-per-day-times select[data-day="${d}"]`);
      if(sel) sel.value=String(h);
    });
  }
}

function updateSplitLabel(){
  const p=parseInt(document.getElementById("chore-split").value);
  document.getElementById("split-chk-label").textContent=p;
  document.getElementById("split-sav-label").textContent=100-p;
}

function toggleOnceDateField(){
  const typeEl=document.getElementById("chore-once-type");
  if(!typeEl) return;
  const type=typeEl.value;
  const endDateCol=document.getElementById("chore-enddate-col");
  const endLabel=document.getElementById("end-date-label");
  const hint=document.getElementById("chore-once-hint");
  const schedule=document.getElementById("chore-schedule").value;
  if(schedule!=="once"){
    if(endLabel) endLabel.textContent="End Date (optional)";
    if(hint) hint.style.display="none";
    return;
  }
  const reminderRow=document.getElementById("chore-reminder-row");
  if(type==="none"){
    if(endDateCol)   endDateCol.classList.add("hidden");
    if(reminderRow)  reminderRow.classList.add("hidden");
    if(hint)         hint.style.display="none";
    document.getElementById("chore-end-date").value="";
  } else if(type==="by"){
    if(endDateCol)  endDateCol.classList.remove("hidden");
    if(reminderRow) reminderRow.classList.remove("hidden");
    if(endLabel)    endLabel.textContent="Due By Date";
    if(hint){ hint.style.display="block"; hint.textContent="Available every day until this date. Expires after."; }
  } else {
    if(endDateCol)  endDateCol.classList.remove("hidden");
    if(reminderRow) reminderRow.classList.remove("hidden");
    if(endLabel)    endLabel.textContent="Due On Date";
    if(hint){ hint.style.display="block"; hint.textContent="Only appears on this specific day."; }
  }
}

// Human-readable schedule label for display in chore lists
function scheduleLabel(chore){
  const s=chore.schedule;
  const fullDays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  if(s==="once"){ return chore.onceDate ? "Due "+chore.onceDate : "One-time"; }
  if(s==="daily") return "Daily";
  if(s==="weekly"){
    const days=chore.weekdays || (chore.weekday!==undefined ? [chore.weekday] : []);
    return "Weekly"+(days.length ? " ("+days.map(d=>fullDays[d]).join(", ")+"s)" : "");
  }
  if(s==="biweekly"){
    const days=chore.weekdays || (chore.weekday!==undefined ? [chore.weekday] : []);
    return "Bi-weekly"+(days.length ? " ("+days.map(d=>fullDays[d]).join(", ")+"s)" : "");
  }
  if(s==="monthly"){
    const d=chore.monthlyDay;
    if(d==="last")   return "Monthly (last day)";
    if(d==="last-1") return "Monthly (2nd to last)";
    if(d==="last-2") return "Monthly (3rd to last)";
    const sfx={1:"st",2:"nd",3:"rd"};
    const n=parseInt(d);
    return "Monthly ("+n+(sfx[n]||"th")+")";
  }
  return s;
}

function resolveMonthlyDay(monthlyDay,year,month){
  const dim=new Date(year,month+1,0).getDate();
  if(monthlyDay==="last")   return dim;
  if(monthlyDay==="last-1") return dim-1;
  if(monthlyDay==="last-2") return dim-2;
  return parseInt(monthlyDay)||1;
}

function getStreakFormValues(){
  return {
    streakStart:     parseInt(document.getElementById("chore-streak-start").value)     || 0,
    streakMilestone: parseInt(document.getElementById("chore-streak-milestone").value) || 0,
    streakReward:    parseFloat(document.getElementById("chore-streak-reward").value)  || 0
  };
}
function populateStreakForm(chore){
  document.getElementById("chore-streak-start").value     = chore.streakStart     || 0;
  document.getElementById("chore-streak-milestone").value = chore.streakMilestone || "";
  document.getElementById("chore-streak-reward").value    = chore.streakReward    || "";
}
function clearStreakForm(){
  document.getElementById("chore-streak-start").value=0;
  document.getElementById("chore-streak-milestone").value="";
  document.getElementById("chore-streak-reward").value="";
}

function createChore(){
  const msgEl=document.getElementById("chore-form-msg"); msgEl.className="field-msg";
  const name=document.getElementById("chore-name").value.trim();
  const desc=document.getElementById("chore-desc").value.trim();
  const amount=parseFloat(document.getElementById("chore-amount").value);
  const schedule=document.getElementById("chore-schedule").value;
  const splitChk=parseInt(document.getElementById("chore-split").value);
  const childChooses=document.getElementById("chore-child-chooses").checked;
  const monthlyDay = schedule==="monthly" ? document.getElementById("chore-monthly-day").value : null;
  const weekdays = (schedule==="weekly"||schedule==="biweekly") ? getSelectedDays() : null;

  if((schedule==="weekly"||schedule==="biweekly") && (!weekdays||weekdays.length===0)){
    document.getElementById("weekday-none-msg").classList.remove("hidden");
    return;
  }
  const weekday = weekdays && weekdays.length>0 ? weekdays[0] : null; // legacy
  const onceDateType = schedule==="once" ? document.getElementById("chore-once-type").value : "none";
  const onceDate = (schedule==="once" && onceDateType!=="none")
    ? document.getElementById("chore-end-date").value || null
    : null;
  const onceDueOn = onceDateType==="on";
  const endDate = schedule!=="once" ? document.getElementById("chore-end-date").value || null : null;
  const reminderHour = parseInt(document.getElementById("chore-reminder-time").value) || 8;
  const dayTimes = readPerDayTimes();  // {} if "same time" is checked
  // v30.1: only meaningful for bi-weekly; stored as bool
  const skipFirstWeek = schedule==="biweekly" && document.getElementById("chore-skip-first-week").checked;

  if(!name){ msgEl.className="field-msg error"; msgEl.textContent="Chore name is required."; return; }
  if(amount===null||amount===undefined||isNaN(amount)||amount<0){
    msgEl.className="field-msg error"; msgEl.textContent="Enter a valid reward amount (0 or more)."; return;
  }

  const data=getChildData(activeChild);
  const streakVals=getStreakFormValues();
  const choreFields = {
    name,desc,amount,schedule,monthlyDay,weekday,weekdays,
    onceDate,onceDueOn,reminderHour,dayTimes,skipFirstWeek,
    splitChk,childChooses,paused:false,endDate,
    streakStart:streakVals.streakStart,
    streakMilestone:streakVals.streakMilestone,
    streakReward:streakVals.streakReward
  };

  if(editingChoreId){
    const ex=data.chores.find(c=>c.id===editingChoreId);
    if(ex) Object.assign(ex,choreFields);
    state._editedChoreId = ex ? ex.id : null;
    editingChoreId=null;
    setChoreFormMode("create");
    syncToCloud("Chore Edited");
    delete state._editedChoreId;
    showToast("Chore updated! ✏️","success");
  } else {
    data.chores.push({
      id:"chore_"+Date.now(),
      ...choreFields,
      status:"available", completedBy:null, completedAt:null, denialNote:null,
      createdAt:fmtDate(new Date()), streakCount:0
    });
    syncToCloud("Chore Created");
    showToast('"'+name+'" added! 📋',"success");
  }
  resetChoreForm();
  renderParentChores(); renderChildChores(); updateChoreBadges();
}

function resetChoreForm(){
  ["chore-name","chore-desc","chore-amount","chore-end-date"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("chore-reminder-time").value="8";
  document.getElementById("chore-schedule").value="once";
  document.getElementById("chore-split").value=50; // v32: 50/50 default (was 100)
  document.getElementById("chore-child-chooses").checked=true;
  document.getElementById("chore-same-time").checked=true;
  document.getElementById("chore-skip-first-week").checked=false;
  clearStreakForm();
  resetDayToggles();
  updateSplitLabel();
  setChoreFormMode("create");
  onScheduleChange();
}

function editChore(choreId){
  const data=getChildData(activeChild);
  const chore=data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  editingChoreId=choreId;
  document.getElementById("chore-name").value=chore.name||"";
  document.getElementById("chore-desc").value=chore.desc||"";
  document.getElementById("chore-amount").value=chore.amount||"";
  document.getElementById("chore-schedule").value=chore.schedule||"once";
  document.getElementById("chore-split").value=chore.splitChk!==undefined?chore.splitChk:50; // v32: 50/50 fallback
  document.getElementById("chore-child-chooses").checked=!!chore.childChooses;
  document.getElementById("chore-end-date").value=chore.endDate||"";
  const onceTypeEl=document.getElementById("chore-once-type");
  if(onceTypeEl){
    if(!chore.onceDate)    onceTypeEl.value="none";
    else if(chore.onceDueOn) onceTypeEl.value="on";
    else                     onceTypeEl.value="by";
    toggleOnceDateField();
    if(chore.onceDate) document.getElementById("chore-end-date").value=chore.onceDate;
  }
  document.getElementById("chore-reminder-time").value=String(chore.reminderHour||8);
  onScheduleChange();
  if(chore.schedule==="monthly" && chore.monthlyDay){
    document.getElementById("chore-monthly-day").value=chore.monthlyDay;
  }
  if(chore.schedule==="weekly" || chore.schedule==="biweekly"){
    const days = chore.weekdays || (chore.weekday!==undefined ? [chore.weekday] : []);
    setSelectedDays(days);
    setPerDayTimes(chore.dayTimes);  // restores per-day mode if set
  }
  // v30.1
  document.getElementById("chore-skip-first-week").checked = !!chore.skipFirstWeek;
  updateSplitLabel(); populateStreakForm(chore);
  setChoreFormMode("edit",chore.name);
  switchTab("parent","chores");
  document.getElementById("chore-form-title").scrollIntoView({behavior:"smooth",block:"start"});
  showToast('Editing "'+chore.name+'" — make changes and tap Save.',"info",4000);
}

function cancelChoreEdit(){
  editingChoreId=null;
  resetChoreForm();
}

function setChoreFormMode(mode,name){
  const t=document.getElementById("chore-form-title");
  const sb=document.getElementById("chore-submit-btn");
  const cb=document.getElementById("chore-cancel-edit-btn");
  if(mode==="edit"){
    if(t)  t.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> Editing: "+(name||"Chore");
    if(sb) sb.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-floppy-disk'/></svg> Save Changes";
    if(cb) cb.classList.remove("hidden");
  } else {
    if(t)  t.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-plus-circle'/></svg> Create New Chore";
    if(sb) sb.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-check-circle'/></svg> Add Chore";
    if(cb) cb.classList.add("hidden");
  }
}

function renderParentChores(){
  const data=getChildData(activeChild);
  const chores=data.chores||[];
  const approvalsEl=document.getElementById("parent-chore-approvals");
  const pending=chores.filter(c=>c.status==="pending");
  approvalsEl.innerHTML = pending.length ? `
    <div class="approval-banner">
      <h3><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-hourglass'/></svg> Awaiting Approval (${pending.length})</h3>
      ${pending.map(c=>`
        <div class="chore-card state-pending">
          <div class="chore-card-header">
            <span class="chore-card-name">${c.name}</span>
            <span class="chore-card-amount">${c.amount>0 ? fmt(c.amount) : '<span style="color:var(--muted);font-size:.78rem;">No reward</span>'}</span>
          </div>
          <div class="chore-card-meta">
            Completed by <span class="completed-by-chip">${renderAvatar(c.completedBy,"xs")}<strong>${c.completedBy}</strong></span> at ${c.completedAt}<br>
            Split: ${c.splitChk}% Chk / ${100-c.splitChk}% Sav${c.desc?"<br><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> "+c.desc:""}
          </div>
          <div class="row" style="gap:8px;">
            <button class="btn btn-secondary btn-sm col" onclick="approveChore('${c.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-check-circle'/></svg> Approve</button>
            <button class="btn btn-danger    btn-sm col" onclick="denyChore('${c.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-x-circle'/></svg> Deny</button>
          </div>
        </div>`).join("")}
    </div>` : "";

  const listEl=document.getElementById("parent-chore-list");
  if(!chores.length){
    listEl.innerHTML=emptyState("chores","No chores yet.");
    return;
  }
  listEl.innerHTML=chores.map(c=>{
    const badge = c.status==="pending"
      ? '<span class="status-badge badge-pending">Awaiting Approval</span>'
      : '<span class="status-badge badge-available">Active</span>';
    return `<div class="chore-card">
      <div class="chore-card-header">
        <span class="chore-card-name">${c.name}</span>
        <span class="chore-card-amount">${fmt(c.amount)}</span>
      </div>
      <div class="chore-card-meta">
        ${badge} <svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-calendar'/></svg> ${scheduleLabel(c)}<br>
        <svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-currency-dollar'/></svg> ${c.splitChk}% Chk / ${100-c.splitChk}% Sav${c.childChooses?" (child chooses)":""}${c.endDate?"<br><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-clock'/></svg> Ends: "+c.endDate:""}${c.desc?"<br><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> "+c.desc:""}
      </div>
      <div class="row" style="gap:8px;margin-top:4px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="editChore('${c.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> Edit</button>
        <button class="btn btn-danger  btn-sm" onclick="deleteChore('${c.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-trash'/></svg> Delete</button>
      </div>
    </div>`;
  }).join("");
}

function approveChore(choreId){
  const data=getChildData(activeChild);
  const chore=data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  const ck=chore.amount*(chore.splitChk/100), sv=chore.amount*((100-chore.splitChk)/100);
  openModal({
    icon:"✅", title:'Approve "'+chore.name+'"?',
    body:"Deposits the reward into "+chore.completedBy+"'s account now.",
    detail:{"Total":fmt(chore.amount),"→ Checking":fmt(ck),"→ Savings":fmt(sv),"By":chore.completedBy},
    confirmText:"Approve & Pay", confirmClass:"btn-secondary",
    onConfirm:()=>{
      data.balances.checking+=ck; data.balances.savings+=sv;
      if(ck>0) recordTransaction("Bank","Chore: "+chore.name+" (Chk)",ck);
      if(sv>0) recordTransaction("Bank","Chore: "+chore.name+" (Sav)",sv);
      if(chore.schedule==="once"){
        data.chores=data.chores.filter(c=>c.id!==choreId);
      } else {
        Object.assign(chore,{status:"available",completedBy:null,completedAt:null,denialNote:null,lastCompleted:todayStr()});
        // Streak milestone bonus
        if(chore.streakMilestone && chore.streakReward){
          chore.streakCount=(parseInt(chore.streakCount)||0)+1;
          const effective=chore.streakCount + (parseInt(chore.streakStart)||0);
          const milestone=parseInt(chore.streakMilestone)||0;
          if(milestone>0 && effective%milestone===0){
            const bonus=parseFloat(chore.streakReward)||0;
            if(bonus>0){
              data.balances.checking+=bonus;
              recordTransaction("Bank","🔥 Streak Bonus: "+chore.name+" ("+effective+" in a row!) (Chk)",bonus);
              showToast("🔥 Streak milestone! +"+fmt(bonus)+" bonus deposited!","success",4000);
            }
          }
        }
      }
      state._approvedChoreId=chore.id;
      state._approvedChoreTitle=buildCalEventTitle(chore);
      state._approvedChoreSchedule=chore.schedule;
      syncToCloud("Chore Approved");
      delete state._approvedChoreId; delete state._approvedChoreTitle; delete state._approvedChoreSchedule;
      showToast("Approved! "+fmt(chore.amount)+" deposited. 🎉","success");
      renderParentChores(); renderChildChores(); updateChoreBadges();
    }
  });
}

function denyChore(choreId){
  const data=getChildData(activeChild);
  const chore=data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  openInputModal({
    icon:"❌", title:'Deny "'+chore.name+'"?',
    body:"Optionally leave a reason for "+chore.completedBy+".",
    inputType:"text", inputAttrs:'placeholder="Reason (optional)"',
    confirmText:"Deny", confirmClass:"btn-danger",
    onConfirm:(reason)=>{
      const denialNote=reason||null;
      if(chore.schedule==="once"){
        data.chores=data.chores.filter(c=>c.id!==choreId);
      } else {
        Object.assign(chore,{status:"available",completedBy:null,completedAt:null,denialNote,lastCompleted:null});
      }
      syncToCloud("Chore Denied");
      showToast("Chore denied.","error");
      renderParentChores(); renderChildChores(); updateChoreBadges();
    }
  });
}

function deleteChore(choreId){
  const data=getChildData(activeChild);
  const chore=data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  openModal({
    icon:"🗑️", title:'Delete "'+chore.name+'"?',
    body:"This cannot be undone.",
    confirmText:"Delete", confirmClass:"btn-danger",
    onConfirm:()=>{
      state._deletedChoreId=chore.id;
      state._deletedChoreTitle=buildCalEventTitle(chore);
      data.chores=data.chores.filter(c=>c.id!==choreId);
      syncToCloud("Chore Deleted");
      delete state._deletedChoreId; delete state._deletedChoreTitle;
      showToast("Chore deleted.","info");
      renderParentChores(); renderChildChores(); updateChoreBadges();
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// 12. CHORE CHECKLIST (CHILD VIEW)
// ════════════════════════════════════════════════════════════════════
function setChoreFilter(f){
  choreFilter=f;
  ["today","week","all"].forEach(id=>{
    const el=document.getElementById("cf-"+id);
    if(!el) return;
    el.classList.toggle("active", f===id);
  });
  renderChoreTable();
}

function isDueToday(chore){
  const now=new Date();
  if(chore.schedule==="daily") return true;
  if(chore.schedule==="once"){
    if(!chore.onceDate) return true;
    const today=todayStr();
    if(chore.onceDate<today) return false;
    if(chore.onceDueOn) return chore.onceDate===today;
    return true;
  }
  if(chore.schedule==="weekly"){
    const days = chore.weekdays || (chore.weekday!==undefined ? [chore.weekday] : [now.getDay()]);
    return days.indexOf(now.getDay())!==-1;
  }
  if(chore.schedule==="biweekly"){
    const days = chore.weekdays || (chore.weekday!==undefined ? [chore.weekday] : [now.getDay()]);
    if(days.indexOf(now.getDay())===-1) return false;
    const created=new Date(chore.createdAt||Date.now());
    const weeksDiff=Math.floor((Date.now()-created.getTime())/(7*24*60*60*1000));
    // v30.1: if skipFirstWeek, flip the bi-weekly phase so "this week" is off-week
    const offset = chore.skipFirstWeek ? 1 : 0;
    return (weeksDiff + offset) % 2 === 0;
  }
  if(chore.schedule==="monthly"){
    const target=resolveMonthlyDay(chore.monthlyDay||"1",now.getFullYear(),now.getMonth());
    return now.getDate()===target;
  }
  return false;
}

function isDueThisWeek(chore){
  if(isDueToday(chore)) return true;
  if(chore.schedule==="daily") return true;
  if(chore.schedule==="once"){
    if(!chore.onceDate) return true;
    const today=todayStr();
    return chore.onceDate>=today;
  }
  if(chore.schedule==="weekly"){
    const days=chore.weekdays || (chore.weekday!==undefined ? [chore.weekday] : [new Date(chore.createdAt||Date.now()).getDay()]);
    const today=new Date().getDay();
    return days.some(t => ((t-today+7)%7)<=6);
  }
  if(chore.schedule==="biweekly"){
    const days=chore.weekdays || (chore.weekday!==undefined ? [chore.weekday] : [new Date(chore.createdAt||Date.now()).getDay()]);
    const today=new Date().getDay();
    const anyDay=days.some(t => ((t-today+7)%7)<=6);
    if(!anyDay) return false;
    const created=new Date(chore.createdAt||Date.now());
    const daysElapsed=Math.floor((Date.now()-created.getTime())/(24*60*60*1000));
    // v30.1: if skipFirstWeek, shift window by 7 days
    const offset = chore.skipFirstWeek ? 7 : 0;
    return (14-((daysElapsed+offset)%14))<=7;
  }
  if(chore.schedule==="monthly"){
    const now=new Date();
    const target=resolveMonthlyDay(chore.monthlyDay||"1",now.getFullYear(),now.getMonth());
    const today=now.getDate();
    const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    return ((target-today+dim)%dim)<=6;
  }
  return false;
}

function renderChildChores(){
  renderWeeklyStreakBanner();  // v31.2
  const listEl=document.getElementById("child-chore-list");
  const notifEl=document.getElementById("child-chore-notifications");
  // Streaks
  const streakEl=document.getElementById("chore-streaks-wrap");
  if(streakEl){
    const streaks=renderStreaks();
    streakEl.innerHTML = streaks.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">${streaks.map(s=>`<div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid var(--warning);border-radius:20px;padding:6px 12px;font-size:.75rem;font-weight:700;color:#92400e;"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-fire'/></svg> ${s.name}: ${s.streak} ${s.unit}</div>`).join("")}</div>`
      : "";
  }
  if(!listEl) return;
  const data=getChildData(activeChild||currentUser);
  const chores=data.chores||[];
  // Notification cards for approved/denied chores
  const decisions=chores.filter(c=>(c.status==="approved"||c.status==="denied")&&c.completedBy===currentUser);
  if(notifEl){
    notifEl.innerHTML=decisions.map(c=>`
      <div class="chore-card" style="${c.status==="approved"?"border-color:var(--secondary);background:#f0fdf4;":"border-color:var(--danger);background:#fef2f2;"}">
        <div class="chore-card-header">
          <span class="chore-card-name">${c.status==="approved"?"<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-check-circle'/></svg>":"<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-x-circle'/></svg>"} ${c.name}</span>
          <span class="chore-card-amount">${fmt(c.amount)}</span>
        </div>
        <div class="chore-card-meta">${c.status==="approved" ? "Great work! "+fmt(c.amount)+" added to your account! <svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-party-popper'/></svg>" : "Not approved this time."+(c.denialNote?" Reason: "+c.denialNote:"")+" Talk to your parent if you have questions."}</div>
        <button class="btn btn-ghost btn-sm" onclick="dismissChoreNotif('${c.id}')">Got it ✓</button>
      </div>`).join("") || "";
  }

  const available=chores.filter(c=>!c.paused && c.status==="available" && (!c.endDate||c.endDate>=todayStr()) && c.lastCompleted!==todayStr());
  if(!available.length){
    listEl.innerHTML=emptyState("chores", decisions.length?"Check the notifications above!":"No chores right now — check back later!");
    return;
  }

  const totalPossible=available.reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
  const showRew=choreRewardsEnabled(activeChild||currentUser);

  listEl.innerHTML=`
    <div class="chore-filter-bar">
      <button id="cf-today" class="chore-filter-btn" onclick="setChoreFilter('today')">Due Today</button>
      <button id="cf-week"  class="chore-filter-btn" onclick="setChoreFilter('week')">This Week</button>
      <button id="cf-all"   class="chore-filter-btn" onclick="setChoreFilter('all')">All Chores</button>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:8px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;font-size:.75rem;">
      <span style="color:var(--muted);font-weight:600;">${available.length} chore${available.length===1?"":"s"} available</span>
      ${showRew?`<span style="color:var(--secondary);font-weight:700;font-family:var(--mono);">Up to ${fmt(totalPossible)}</span>`:""}
    </div>
    <div id="chore-table-wrap"></div>
    <p style="font-size:.72rem;color:var(--muted);text-align:center;margin-top:8px;">Tap the checkbox when you've finished a chore ✓</p>`;
  setChoreFilter(choreFilter);
}

function renderChoreTable(){
  const wrap=document.getElementById("chore-table-wrap");
  if(!wrap) return;
  const data=getChildData(activeChild||currentUser);
  const chores=data.chores||[];
  const today=todayStr();
  const expired=chores.filter(c=>c.schedule==="once"&&c.onceDate&&c.onceDate<today&&c.status==="available");
  // v30.1: "available" now means non-paused, not-yet-completed-today, not-past-endDate.
  // Per-tab narrowing (today / this week / all) happens in the filter step below.
  const available=chores.filter(c=>
    !c.paused &&
    c.status==="available" &&
    (!c.endDate || c.endDate>=today) &&
    c.lastCompleted!==today &&
    // Exclude one-time chores whose date has passed (those are in `expired`)
    !(c.schedule==="once" && c.onceDate && c.onceDate<today)
  );
  const filtered=available.filter(c=>{
    if(choreFilter==="today") return isDueToday(c);
    if(choreFilter==="week")  return isDueThisWeek(c);
    return true;  // "all" — show every available chore regardless of schedule window
  });
  function dueBadge(c){
    if(isDueToday(c))    return `<span style="font-size:.6rem;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:10px;margin-left:5px;">Today</span>`;
    if(isDueThisWeek(c)) return `<span style="font-size:.6rem;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:10px;margin-left:5px;">This Week</span>`;
    return "";
  }
  if(!filtered.length){
    const msg = choreFilter==="today" ? "No chores due today — check 'This Week' or 'All Chores'!"
              : choreFilter==="week"  ? "No chores due this week — check 'All Chores'!"
              : "No chores available right now!";
    wrap.innerHTML=emptyState("chores", msg);
    return;
  }
  const showRewards=choreRewardsEnabled(activeChild||currentUser);
  const expiredRows=expired.map(c=>`
    <tr style="opacity:.42;">
      <td class="chore-check-cell"><div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:.85rem;"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-x-circle'/></svg></div></td>
      <td class="chore-name-cell">${c.name}<div class="chore-desc-small" style="color:var(--danger);">Expired ${c.onceDate}</div></td>
      <td class="chore-schedule-cell">One-time</td>
      ${showRewards?`<td class="chore-amount-cell">${c.amount>0?fmt(c.amount):"—"}</td>`:""}
    </tr>`).join("");

  wrap.innerHTML=`
    <table class="chore-table">
      <thead><tr><th style="width:36px;"></th><th>Chore</th><th>Schedule</th>${showRewards?`<th style="text-align:right;">Earn</th>`:""}</tr></thead>
      <tbody>
        ${filtered.map(c=>`
          <tr class="chore-row" id="chore-row-${c.id}">
            <td class="chore-check-cell">${isDueToday(c) ? `<div class="chore-checkbox-wrap" id="chk-${c.id}" onclick="toggleChoreCheck('${c.id}')"></div>` : `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:var(--muted);" title="Not due today"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-lock-simple'/></svg></div>`}</td>
            <td class="chore-name-cell">
              ${c.name}${dueBadge(c)}
              ${c.desc?`<div class="chore-desc-small">${c.desc}</div>`:""}
              ${showRewards?(c.childChooses?`<div class="chore-desc-small"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-currency-dollar'/></svg> You choose the split</div>`:`<div class="chore-desc-small"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-currency-dollar'/></svg> ${c.splitChk}% Checking / ${100-c.splitChk}% Savings</div>`):""}
            </td>
            <td class="chore-schedule-cell">${scheduleLabel(c)}</td>
            ${showRewards?`<td class="chore-amount-cell" id="chore-amt-${c.id}">${c.amount>0?fmt(c.amount):"—"}</td>`:""}
          </tr>`).join("")}
        ${expiredRows}
      </tbody>
    </table>`;
}

function toggleChoreCheck(choreId){
  const data=getChildData(activeChild||currentUser);
  const chore=data.chores.find(c=>c.id===choreId);
  if(!chore || chore.status==="pending") return;
  if(chore.childChooses){
    openModal({
      icon:"✅", title:'Mark "'+chore.name+'" Complete?',
      body:"Choose how to split your "+fmt(chore.amount)+" reward.",
      detail:{}, confirmText:"Submit ✋", confirmClass:"btn-secondary",
      onConfirm:()=>{
        const sl=document.getElementById("modal-split-slider");
        submitChoreCheck(choreId, sl?parseInt(sl.value):chore.splitChk);
      }
    });
    setTimeout(()=>{
      const de=document.getElementById("modal-detail");
      // v32: Always default split to 50/50 (drop v31.2 goal-aware conditional)
      const p = chore.splitChk ?? 50;
      de.innerHTML=`<div class="split-display"><span class="chk-pct">Checking: <span id="msc-chk">${p}</span>%</span><span class="sav-pct">Savings: <span id="msc-sav">${100-p}</span>%</span></div><input type="range" id="modal-split-slider" min="0" max="100" value="${p}" oninput="document.getElementById('msc-chk').textContent=this.value;document.getElementById('msc-sav').textContent=100-parseInt(this.value);"><p style="font-size:.73rem;color:var(--muted);margin:6px 0 0;text-align:center;">Drag to set your split</p>`;
      de.classList.remove("hidden");
    },60);
  } else {
    submitChoreCheck(choreId,chore.splitChk);
  }
}

function submitChoreCheck(choreId,chkPct){
  const data=getChildData(activeChild||currentUser);
  const chore=data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  // Animate
  const row=document.getElementById("chore-row-"+choreId);
  const chkEl=document.getElementById("chk-"+choreId);
  const amtEl=document.getElementById("chore-amt-"+choreId);
  if(row)   row.classList.add("done");
  if(chkEl){ chkEl.classList.add("pending"); chkEl.onclick=null; }
  if(amtEl) amtEl.classList.add("done-amt");
  // Mark pending
  Object.assign(chore,{
    status:"pending",
    completedBy:currentUser,
    completedAt:fmtDate(new Date()),
    splitChk:chkPct
  });
  syncToCloud("Chore Submitted");
  showEarnedPopup(chore.amount,chore.name);
  updateChoreBadges();
}

function dismissChoreNotif(choreId){
  const data=getChildData(activeChild||currentUser);
  const chore=data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  if(chore.status==="approved" || chore.status==="denied"){
    if(chore.schedule==="once"){
      data.chores=data.chores.filter(c=>c.id!==choreId);
    } else {
      Object.assign(chore,{status:"available",completedBy:null,completedAt:null,denialNote:null});
    }
    syncToCloud("Chore Notif Dismissed");
    renderChildChores(); updateChoreBadges();
  }
}

function showChoreWaitingBanner(){
  const data=getChildData(activeChild||currentUser);
  const dueToday=(data.chores||[]).filter(c=>c.status==="available" && (!c.endDate||c.endDate>=todayStr()) && isDueToday(c) && c.lastCompleted!==todayStr());
  const banner=document.getElementById("chore-waiting-banner");
  if(!banner) return;
  if(!dueToday.length){ banner.classList.add("hidden"); return; }
  const title=document.getElementById("chore-banner-title");
  if(title) title.textContent = dueToday.length===1
    ? "You have 1 chore due today!"
    : "You have "+dueToday.length+" chores due today!";
  banner.classList.remove("hidden");
}

// ════════════════════════════════════════════════════════════════════
// 13. SAVINGS GOALS
// ════════════════════════════════════════════════════════════════════
function addSavingsGoal(){
  const name=document.getElementById("new-goal-name").value.trim();
  const amt=parseFloat(document.getElementById("new-goal-amount").value);
  if(!name||!amt||amt<=0){ showToast("Enter a goal name and amount.","error"); return; }
  const data=getChildData(currentUser);
  if(!data.goals) data.goals=[];
  data.goals.push({id:"goal_"+Date.now(),name,target:amt,createdAt:todayStr()});
  document.getElementById("new-goal-name").value="";
  document.getElementById("new-goal-amount").value="";
  syncToCloud("Goal Added");
  renderSavingsGoals();
  showToast("Goal added! 🎯","success");
}

function renderSavingsGoals(){
  const data=getChildData(currentUser);
  const goals=data.goals||[];
  const el=document.getElementById("child-goals-list");
  if(!el) return;
  if(!goals.length){
    el.innerHTML=emptyState("goals","No goals yet. Set one below!");
    return;
  }
  const sav=data.balances.savings||0;
  el.innerHTML=goals.map(g=>{
    const pct=Math.min(100,Math.round((sav/g.target)*100));
    return `<div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:4px;">
        <span>${g.name}</span>
        <span style="font-family:var(--mono);">${fmt(sav)} / ${fmt(g.target)}</span>
      </div>
      <div style="background:var(--surface);height:8px;border-radius:4px;overflow:hidden;">
        <div style="background:var(--secondary);height:100%;width:${pct}%;transition:width .3s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:.7rem;color:var(--muted);">
        <span>${pct}% there!</span>
        <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;color:var(--danger);font-size:.7rem;cursor:pointer;font-family:var(--font);">Remove</button>
      </div>
    </div>`;
  }).join("");
}

function deleteGoal(goalId){
  const data=getChildData(activeChild||currentUser);
  data.goals=(data.goals||[]).filter(g=>g.id!==goalId);
  syncToCloud("Goal Removed");
  renderSavingsGoals(); renderParentGoals();
}

function addParentSavingsGoal(){
  const name=document.getElementById("parent-new-goal-name").value.trim();
  const amt=parseFloat(document.getElementById("parent-new-goal-amount").value);
  if(!name||!amt||amt<=0){ showToast("Enter a goal name and amount.","error"); return; }
  const data=getChildData(activeChild);
  if(!data.goals) data.goals=[];
  data.goals.push({id:"goal_"+Date.now(),name,target:amt,createdAt:todayStr()});
  document.getElementById("parent-new-goal-name").value="";
  document.getElementById("parent-new-goal-amount").value="";
  syncToCloud("Goal Added");
  renderParentGoals();
  showToast("Goal added! 🎯","success");
}

function renderParentGoals(){
  const data=getChildData(activeChild);
  const goals=data.goals||[];
  const el=document.getElementById("parent-goals-list");
  if(!el) return;
  if(!goals.length){
    el.innerHTML=emptyState("goals","No goals yet for this child.");
    return;
  }
  const sav=data.balances.savings||0;
  el.innerHTML=goals.map(g=>{
    const pct=Math.min(100,Math.round((sav/g.target)*100));
    return `<div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:4px;">
        <span>${g.name}</span>
        <span style="font-family:var(--mono);">${fmt(sav)} / ${fmt(g.target)}</span>
      </div>
      <div style="background:var(--surface);height:8px;border-radius:4px;overflow:hidden;">
        <div style="background:var(--secondary);height:100%;width:${pct}%;transition:width .3s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:.7rem;color:var(--muted);">
        <span>${pct}% there!</span>
        <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;color:var(--danger);font-size:.7rem;cursor:pointer;font-family:var(--font);">Remove</button>
      </div>
    </div>`;
  }).join("");
}

// ════════════════════════════════════════════════════════════════════
// 14. LOANS
// ════════════════════════════════════════════════════════════════════
function calcMonthlyPayment(principal,annualRate,termMonths){
  if(!principal||!termMonths) return 0;
  const r=(annualRate/100)/12;
  if(r===0) return principal/termMonths;
  return (principal*r)/(1-Math.pow(1+r,-termMonths));
}

function updateLoanPaymentPreview(){
  const p=parseFloat(document.getElementById("loan-principal").value)||0;
  const r=parseFloat(document.getElementById("loan-rate").value)||0;
  const t=parseInt(document.getElementById("loan-term").value)||0;
  document.getElementById("loan-payment-preview").textContent=fmt(calcMonthlyPayment(p,r,t))+"/mo";
}

function populateLoanDueDayPicker(){
  const sel=document.getElementById("loan-due-day");
  if(!sel||sel.options.length>0) return;
  for(let i=1;i<=28;i++) sel.appendChild(new Option(i+(i===1?"st":i===2?"nd":i===3?"rd":"th"), String(i)));
  ["last-2","last-1","last"].forEach(v=>{
    const lbl = v==="last"?"Last day":v==="last-1"?"2nd to last":"3rd to last";
    sel.appendChild(new Option(lbl, v));
  });
}

function createLoan(){
  const name=document.getElementById("loan-name").value.trim();
  const p=parseFloat(document.getElementById("loan-principal").value);
  const r=parseFloat(document.getElementById("loan-rate").value);
  const t=parseInt(document.getElementById("loan-term").value);
  const dueDay=document.getElementById("loan-due-day").value;
  const msgEl=document.getElementById("loan-form-msg"); msgEl.className="field-msg";
  if(!name){ msgEl.className="field-msg error"; msgEl.textContent="Loan name is required."; return; }
  if(isNaN(r)||r<0){ msgEl.className="field-msg error"; msgEl.textContent="Enter a valid interest rate."; return; }
  if(!t||t<=0){ msgEl.className="field-msg error"; msgEl.textContent="Term must be at least 1 month."; return; }

  const data=getChildData(activeChild);
  if(!data.loans) data.loans=[];

  if(editingLoanId){
    // v30.1: Edit terms only — name, rate, term, dueDay.
    // Principal is locked (edit form disables that input).
    // Payment is recalculated from CURRENT balance + new terms — keeps audit trail intact.
    const loan=data.loans.find(l=>l.id===editingLoanId);
    if(!loan){ msgEl.className="field-msg error"; msgEl.textContent="Loan not found."; return; }
    loan.name=name;
    loan.rate=r;
    loan.termMonths=t;
    loan.dueDay=dueDay;
    loan.payment=calcMonthlyPayment(loan.balance, r, t);
    editingLoanId=null;
    setLoanFormMode("create");
    syncToCloud("Loan Edited");
    showToast("Loan updated. ✏️","success");
  } else {
    if(!p||p<=0){ msgEl.className="field-msg error"; msgEl.textContent="Principal must be greater than 0."; return; }
    data.loans.push({
      id:"loan_"+Date.now(),
      name, principal:p, balance:p, rate:r, termMonths:t, dueDay,
      payment:calcMonthlyPayment(p,r,t),
      createdAt:todayStr()
    });
    syncToCloud("Loan Created");
    showToast("Loan created. 💳","success");
  }
  resetLoanForm();
  renderParentLoans();
}

function resetLoanForm(){
  ["loan-name","loan-principal","loan-rate","loan-term"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("loan-principal").disabled=false;
  document.getElementById("loan-payment-preview").textContent="$0.00/mo";
  setLoanFormMode("create");
}

function editLoan(loanId){
  const data=getChildData(activeChild);
  const loan=(data.loans||[]).find(l=>l.id===loanId);
  if(!loan) return;
  editingLoanId=loanId;
  document.getElementById("loan-name").value=loan.name||"";
  // Principal field shows balance (read-only visual cue) — users can see but not change
  document.getElementById("loan-principal").value=loan.balance;
  document.getElementById("loan-principal").disabled=true;
  document.getElementById("loan-rate").value=loan.rate;
  document.getElementById("loan-term").value=loan.termMonths;
  document.getElementById("loan-due-day").value=loan.dueDay||"1";
  // Show payment preview using current balance
  const newPayment=calcMonthlyPayment(loan.balance,loan.rate,loan.termMonths);
  document.getElementById("loan-payment-preview").textContent=fmt(newPayment)+"/mo";
  setLoanFormMode("edit",loan.name);
  document.getElementById("loan-form-title").scrollIntoView({behavior:"smooth",block:"start"});
  showToast('Editing "'+loan.name+'" — principal locked; adjust terms and save.',"info",4000);
}

function cancelLoanEdit(){
  editingLoanId=null;
  resetLoanForm();
}

function setLoanFormMode(mode,name){
  const t=document.getElementById("loan-form-title");
  const sb=document.getElementById("loan-submit-btn");
  const cb=document.getElementById("loan-cancel-edit-btn");
  const hint=document.getElementById("loan-edit-hint");
  if(mode==="edit"){
    if(t)    t.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> Editing: "+(name||"Loan");
    if(sb)   sb.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-floppy-disk'/></svg> Save Changes";
    if(cb)   cb.classList.remove("hidden");
    if(hint) hint.classList.remove("hidden");
  } else {
    if(t)    t.textContent="Create New Loan";
    if(sb)   sb.innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-plus-circle'/></svg> Create Loan";
    if(cb)   cb.classList.add("hidden");
    if(hint) hint.classList.add("hidden");
  }
}

function renderParentLoans(){
  const data=getChildData(activeChild);
  const loans=data.loans||[];
  const el=document.getElementById("parent-loans-list");
  if(!el) return;
  if(!loans.length){
    el.innerHTML=emptyState("loans","No loans yet.");
    return;
  }
  el.innerHTML=loans.map(l=>`
    <div class="chore-card">
      <div class="chore-card-header">
        <span class="chore-card-name">${l.name}</span>
        <span class="chore-card-amount">${fmt(l.balance)}</span>
      </div>
      <div class="chore-card-meta">
        Original: ${fmt(l.principal)} • ${l.rate}% APR • ${l.termMonths} mo<br>
        Payment: ${fmt(l.payment)}/mo • Due: ${fmtNextPayment(l)}
      </div>
      <div class="row" style="gap:8px;margin-top:4px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="editLoan('${l.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> Edit</button>
        <button class="btn btn-danger  btn-sm" onclick="deleteLoan('${l.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-trash'/></svg> Delete</button>
      </div>
    </div>`).join("");
}

function renderChildLoans(){
  const data=getChildData(activeChild||currentUser);
  const loans=data.loans||[];
  const el=document.getElementById("child-loans-list");
  if(!el) return;
  if(!loans.length){
    el.innerHTML=emptyState("loans","No loans right now.");
    return;
  }
  el.innerHTML=loans.map(l=>`
    <div class="chore-card">
      <div class="chore-card-header">
        <span class="chore-card-name">${l.name}</span>
        <span class="chore-card-amount">${fmt(l.balance)}</span>
      </div>
      <div class="chore-card-meta">
        Original: ${fmt(l.principal)} • ${l.rate}% APR<br>
        Payment: ${fmt(l.payment)}/mo • Next due: ${fmtNextPayment(l)}
      </div>
    </div>`).join("");
}

function applyLoanPayment(loanId){
  const amt=parseFloat(document.getElementById("child-amt").value);
  if(!amt||amt<=0){ showToast("Enter a payment amount.","error"); return; }
  const data=getChildData(currentUser);
  const loan=(data.loans||[]).find(l=>l.id===loanId);
  if(!loan){ showToast("Loan not found.","error"); return; }
  if(amt>data.balances.checking){ showToast("Not enough in checking.","error"); return; }
  data.balances.checking-=amt;
  loan.balance=Math.max(0,loan.balance-amt);
  recordTransaction(currentUser,"Loan payment to "+loan.name+" (principal)",-amt);
  syncToCloud("Loan Payment");
  showToast("Loan payment applied. 💳","success");
  document.getElementById("child-amt").value="";
  populateChildLoanSelect();
}

function deleteLoan(loanId){
  const data=getChildData(activeChild);
  const loan=(data.loans||[]).find(l=>l.id===loanId);
  if(!loan) return;
  openModal({
    icon:"🗑️", title:"Delete loan?",
    body:'Delete "'+loan.name+'"? This cannot be undone.',
    confirmText:"Delete", confirmClass:"btn-danger",
    onConfirm:()=>{
      data.loans=data.loans.filter(l=>l.id!==loanId);
      syncToCloud("Loan Deleted");
      renderParentLoans();
      showToast("Loan deleted.","info");
    }
  });
}

function calcNextPaymentDate(loan){
  const now=new Date();
  const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const day=resolveMonthlyDay(loan.dueDay||"1",now.getFullYear(),now.getMonth());
  let next=new Date(now.getFullYear(),now.getMonth(),Math.min(day,dim));
  if(next<now) next=new Date(now.getFullYear(),now.getMonth()+1,Math.min(day, new Date(now.getFullYear(),now.getMonth()+2,0).getDate()));
  return next;
}

function fmtNextPayment(loan){
  if(loan.balance<=0) return "Paid off ✓";
  const d=calcNextPaymentDate(loan);
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

function populateChildLoanSelect(){
  const sel=document.getElementById("child-loan-select");
  if(!sel) return;
  const data=getChildData(currentUser);
  const loans=(data.loans||[]).filter(l=>l.balance>0);
  sel.innerHTML='<option value="">— Select a loan —</option>'+loans.map(l=>`<option value="${l.id}">${l.name} — ${fmt(l.balance)}</option>`).join("");
  document.getElementById("child-loan-info").style.display="none";
}

function onChildLoanSelect(){
  const id=document.getElementById("child-loan-select").value;
  const info=document.getElementById("child-loan-info");
  if(!id){ info.style.display="none"; return; }
  const data=getChildData(currentUser);
  const loan=(data.loans||[]).find(l=>l.id===id);
  if(!loan) return;
  document.getElementById("child-loan-payment").textContent=fmt(loan.payment);
  document.getElementById("child-loan-balance").textContent=fmt(loan.balance);
  document.getElementById("child-loan-due").textContent=fmtNextPayment(loan);
  info.style.display="block";
}

// ════════════════════════════════════════════════════════════════════
// 15. HISTORY (LEDGER DRAWER)
// ════════════════════════════════════════════════════════════════════
function openHistory(){
  populateHistoryDateFilters();
  renderHistory();
  document.getElementById("history-drawer").classList.add("open");
}
function closeHistory(){ document.getElementById("history-drawer").classList.remove("open"); }

function populateHistoryDateFilters(){
  const sel=document.getElementById("f-date");
  if(!sel) return;
  const child=activeChild||currentUser;
  const rows=state.history[child]||[];
  sel.innerHTML='<option value="all">All Time</option>';
  const months=new Set(), years=new Set();
  rows.forEach(r=>{
    let d=null; try{ d=new Date(r.date); }catch(e){}
    if(d&&!isNaN(d)){
      months.add(d.getFullYear()+"-"+d.getMonth());
      years.add(d.getFullYear());
    }
  });
  Array.from(months).sort().reverse().forEach(m=>{
    const [yr,mo]=m.split("-").map(Number);
    const lbl=new Date(yr,mo,1).toLocaleDateString("en-US",{month:"short",year:"numeric"});
    sel.appendChild(new Option(lbl,"month-"+yr+"-"+mo));
  });
  Array.from(years).sort().reverse().forEach(y=>{
    sel.appendChild(new Option("All "+y,"year-"+y));
  });
}

function renderHistory(){
  const child=activeChild||currentUser;
  const rows=[...(state.history[child]||[])];
  const sort=document.getElementById("f-sort").value;
  const fAcct=document.getElementById("f-acct").value;
  const fType=document.getElementById("f-type").value;
  const fDate=document.getElementById("f-date")?.value || "all";
  const filtered=rows.filter(h=>{
    const n=(h.note||"").toLowerCase();
    const isSav=n.includes("(sav)")||n.includes("to savings")||n.includes("to sav")||n.includes("interest (sav)");
    if(fAcct==="chk" && isSav) return false;
    if(fAcct==="sav" && !isSav) return false;
    if(fType==="pos" && h.amt<0) return false;
    if(fType==="neg" && h.amt>=0) return false;
    if(fDate!=="all"){
      let d=null; try{ d=new Date(h.date); }catch(e){}
      if(d&&!isNaN(d)){
        if(fDate.startsWith("month-")){
          const parts=fDate.split("-");
          const yr=parseInt(parts[1]); const mo=parseInt(parts[2]);
          if(d.getFullYear()!==yr || d.getMonth()!==mo) return false;
        } else if(fDate.startsWith("year-")){
          const yr=parseInt(fDate.split("-")[1]);
          if(d.getFullYear()!==yr) return false;
        }
      }
    }
    return true;
  });
  if(sort==="new") filtered.reverse();
  const totalIn=filtered.filter(r=>r.amt>0).reduce((s,r)=>s+r.amt,0);
  const totalOut=filtered.filter(r=>r.amt<0).reduce((s,r)=>s+r.amt,0);
  const net=totalIn+totalOut;
  document.getElementById("hist-in").textContent="+"+fmt(totalIn);
  document.getElementById("hist-out").textContent=fmt(totalOut);
  document.getElementById("hist-net").textContent=(net>=0?"+":"")+fmt(net);
  document.getElementById("hist-net").className="chip-val "+(net>=0?"pos":"neg");
  const listEl=document.getElementById("ledger-list");
  if(!filtered.length){
    listEl.innerHTML=emptyState("history","No transactions match these filters.");
    return;
  }
  // v31.2: compute goal-hit signatures once per render
  const childForLedger = activeChild || currentUser;
  const goalSigs = computeGoalHitSignatures(childForLedger);
  listEl.innerHTML=filtered.map(h=>{
    const n=(h.note||"").toLowerCase();
    const isSav=n.includes("(sav)")||n.includes("to savings")||n.includes("to sav")||n.includes("interest (sav)");
    const isChore=n.includes("chore:");
    const pillCls = isChore ? "acct-pill chore" : isSav ? "acct-pill sav" : "acct-pill";
    const goalName = goalHitForRow(childForLedger, h, goalSigs);
    const goalBadge = goalName ? `<span class="goal-hit-badge" title="Goal reached: ${goalName}"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-target'/></svg> Goal: ${goalName}</span>` : "";
    return `<div class="ledger-row${goalName?' ledger-row-goal':''}">
      <div class="${pillCls}">${isChore?"CHORE":isSav?"SAV":"CHK"}</div>
      <div><span class="ledger-date">${h.date}</span><span class="ledger-who-wrap">${renderAvatar(h.user,"xs")}<span class="ledger-who">${h.user}</span></span><span class="ledger-note"> — ${h.note}</span>${goalBadge}</div>
      <div class="ledger-amt ${h.amt>=0?"pos":"neg"}">${h.amt>=0?"+":""}${fmt(h.amt)}</div>
    </div>`;
  }).join("");
}

// ════════════════════════════════════════════════════════════════════
// 16. NET WORTH CHART (Chart.js)
// ════════════════════════════════════════════════════════════════════
function setNwFilter(btn,months){
  document.querySelectorAll(".nw-filter-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  nwFilterMonths=months;
  drawNetWorthChart();
}

function openNetWorthChart(){
  document.getElementById("networth-drawer").classList.add("open");
  // Defer chart draw so the canvas has measured dimensions
  setTimeout(drawNetWorthChart,80);
}

function closeNetWorthChart(){
  document.getElementById("networth-drawer").classList.remove("open");
  if(nwChartInstance){ nwChartInstance.destroy(); nwChartInstance=null; }
}

function drawNetWorthChart(){
  const child=activeChild||currentUser;
  let history=(state.netWorthHistory && state.netWorthHistory[child]) || [];
  const monthNames=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Build 3 future months for projection
  const now=new Date();
  const futureMonths=[];
  for(let i=1;i<=3;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1);
    futureMonths.push({
      month:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"),
      total:null, future:true
    });
  }

  // Apply time-window filter
  if(nwFilterMonths>0 && history.length>0){
    const cutoff=new Date();
    cutoff.setMonth(cutoff.getMonth()-nwFilterMonths);
    const cutoffKey=cutoff.getFullYear()+"-"+String(cutoff.getMonth()+1).padStart(2,"0");
    history=history.filter(d=>d.month>=cutoffKey);
  }

  const canvas=document.getElementById("networth-canvas");
  if(!canvas) return;

  // Empty state
  if(!history.length){
    if(nwChartInstance){ nwChartInstance.destroy(); nwChartInstance=null; }
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    canvas.parentElement.innerHTML=emptyState("chart","No history yet — keep saving!","padding:60px 0;");
    document.getElementById("nw-start").textContent="$0.00";
    document.getElementById("nw-current").textContent="$0.00";
    document.getElementById("nw-growth").textContent="+$0.00";
    return;
  }

  // Combine actuals + projection — single dataset, with nulls for future
  const labels=[...history,...futureMonths].map(d=>{
    const [yr,mm]=d.month.split("-");
    return monthNames[parseInt(mm)] + (mm==="01" ? " '"+yr.slice(2) : "");
  });
  const actuals=[...history.map(d=>d.total), ...futureMonths.map(()=>null)];

  // v30.1: single-point data looks lonely; enlarge the dot and widen the default radius
  const singlePoint = history.length === 1;

  // Brand color
  const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#2563eb";

  // Destroy any existing instance
  if(nwChartInstance){ nwChartInstance.destroy(); nwChartInstance=null; }

  const ctx=canvas.getContext("2d");
  nwChartInstance = new Chart(ctx, {
    type:"line",
    data:{
      labels,
      datasets:[{
        label:"Net Worth",
        data:actuals,
        borderColor:primary,
        backgroundColor:hexToRgba(primary,0.12),
        borderWidth:2.5,
        fill:true,
        tension:0.35,
        spanGaps:false,
        pointRadius: actuals.map((v,i)=> i===history.length-1 ? 5 : 3),
        pointBackgroundColor:primary,
        pointBorderColor:"#fff",
        pointBorderWidth:2,
        pointHoverRadius:6
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{intersect:false, mode:"index"},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:"#1e293b",
          titleFont:{family:"DM Sans", size:12, weight:"700"},
          bodyFont:{family:"DM Mono", size:13},
          padding:10, cornerRadius:8, displayColors:false,
          callbacks:{
            label:(ctx)=> ctx.parsed.y===null ? "—" : fmt(ctx.parsed.y)
          }
        }
      },
      scales:{
        x:{
          grid:{display:false},
          ticks:{
            font:{family:"DM Sans", size:11},
            color:"#64748b",
            maxRotation:0
          }
        },
        y:{
          grid:{color:"#f1f5f9", drawBorder:false},
          ticks:{
            font:{family:"DM Mono", size:11},
            color:"#64748b",
            callback:(v)=> "$"+v.toLocaleString("en-US",{maximumFractionDigits:0})
          },
          beginAtZero:false
        }
      },
      animation:{duration:600, easing:"easeOutCubic"}
    }
  });

  // Summary chips
  const first=history[0].total;
  const last=history[history.length-1].total;
  const growth=last-first;
  document.getElementById("nw-start").textContent=fmt(first);
  document.getElementById("nw-current").textContent=fmt(last);
  document.getElementById("nw-growth").textContent=(growth>=0?"+":"")+fmt(growth);
  document.getElementById("nw-growth").className="chip-val "+(growth>=0?"pos":"neg");
}

function hexToRgba(hex,alpha){
  hex=hex.replace("#","");
  const r=parseInt(hex.slice(0,2),16);
  const g=parseInt(hex.slice(2,4),16);
  const b=parseInt(hex.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ════════════════════════════════════════════════════════════════════
// 17. STREAKS
// ════════════════════════════════════════════════════════════════════
function renderStreaks(){
  const data=getChildData(activeChild||currentUser);
  const chores=data.chores||[];
  return chores
    .filter(c=>c.streakMilestone && c.streakMilestone>0)
    .map(c=>{
      const effective=(parseInt(c.streakCount)||0) + (parseInt(c.streakStart)||0);
      const milestone=parseInt(c.streakMilestone);
      const remaining=milestone - (effective % milestone);
      return {
        name:c.name,
        streak:effective,
        unit: remaining===milestone ? "🎯" : `(${remaining} to bonus)`
      };
    });
}

// ════════════════════════════════════════════════════════════════════
// 18. ADMIN
// ════════════════════════════════════════════════════════════════════
function openAdmin(){
  // Reset to locked state every time
  document.getElementById("admin-login-section").classList.remove("hidden");
  document.getElementById("admin-settings-section").classList.add("hidden");
  document.getElementById("admin-pin-input").value="";
  document.getElementById("admin-pin-error").className="field-msg";
  document.getElementById("admin-drawer").classList.add("open");
}
function closeAdmin(){ document.getElementById("admin-drawer").classList.remove("open"); }

function attemptAdminLogin(){
  const pin=document.getElementById("admin-pin-input").value;
  const errEl=document.getElementById("admin-pin-error");
  if(pin !== (state.config.adminPin || DEFAULT_CONFIG.adminPin)){
    errEl.className="field-msg error";
    return;
  }
  errEl.className="field-msg";
  document.getElementById("admin-login-section").classList.add("hidden");
  document.getElementById("admin-settings-section").classList.remove("hidden");
  populateAdminForm();
  renderAdminUsers();
}

function populateAdminForm(){
  const cfg=state.config;
  document.getElementById("admin-bank-name").value      = cfg.bankName       || "";
  document.getElementById("admin-bank-tagline").value   = cfg.tagline        || "";
  document.getElementById("admin-color-primary").value  = cfg.colorPrimary   || CFG_COLOR_PRIMARY;
  document.getElementById("admin-color-secondary").value= cfg.colorSecondary || CFG_COLOR_SECONDARY;
  document.getElementById("admin-img-banner").value     = cfg.imgBanner      || "";
  document.getElementById("admin-img-logo").value       = cfg.imgLogo        || "";
  document.getElementById("admin-timezone").value       = cfg.timezone       || CFG_TIMEZONE;
  document.getElementById("admin-autologout").value     = String(cfg.autoLogout||0);
  // v32: admin-celebration-sound removed — celebration sound is now per-user
  // (see user edit form + child profile sheet)
}

function renderAdminUsers(){
  const el=document.getElementById("admin-user-list");
  if(!el) return;
  el.innerHTML=state.users.map(u=>{
    const role=state.roles[u]||"child";
    const stats=(state.config.loginStats && state.config.loginStats[u]) || null;
    const lastSeen = stats && stats.lastAt
      ? new Date(stats.lastAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " " + new Date(stats.lastAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})
      : "never";
    const count = stats ? (parseInt(stats.count)||0) : 0;
    return `<div class="user-row">
      <div style="flex:1;display:flex;align-items:center;gap:8px;">
        ${renderAvatar(u,"sm")}
        <div class="user-row-info">
          <div>
            <strong>${u}</strong>
            <span class="user-role-badge ${role==="parent"?"role-parent":"role-child"}" style="margin-left:4px;">${role.charAt(0).toUpperCase()+role.slice(1)}</span>
          </div>
          <div class="user-row-substats">Last seen: ${lastSeen} · ${count} login${count===1?"":"s"}</div>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openUserEdit('${u}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> Edit</button>
      ${state.users.length>1 ? `<button class="btn btn-danger btn-sm" onclick="adminRemoveUser('${u}')">Remove</button>` : ""}
    </div>`;
  }).join("");
}

function adminRemoveUser(u){
  openModal({
    icon:"⚠️", title:"Remove "+u+"?",
    body:"Removes this user login. History remains.",
    confirmText:"Remove", confirmClass:"btn-danger",
    onConfirm:()=>{
      state.users=state.users.filter(x=>x!==u);
      delete state.pins[u];
      delete state.roles[u];
      delete (state.config.emails||{})[u];
      renderAdminUsers();
      syncToCloud("User Removed");
      showToast(u+" removed.","info");
    }
  });
}

function addUser(){
  const name=document.getElementById("new-user-name").value.trim();
  const role=document.getElementById("new-user-role").value;
  const pin=document.getElementById("new-user-pin").value;
  const email=document.getElementById("new-user-email").value.trim();
  const msgEl=document.getElementById("new-user-msg"); msgEl.className="field-msg";
  if(!name){ msgEl.className="field-msg error"; msgEl.textContent="Name is required."; return; }
  if(state.users.includes(name)){ msgEl.className="field-msg error"; msgEl.textContent='"'+name+'" already exists.'; return; }
  if(!pin||pin.length!==4||!/^\d{4}$/.test(pin)){ msgEl.className="field-msg error"; msgEl.textContent="PIN must be exactly 4 digits."; return; }
  state.users.push(name);
  state.pins[name]=pin;
  state.roles[name]=role;
  if(!state.config.emails)    state.config.emails={};
  if(email) state.config.emails[name]=email;
  if(!state.config.notify)    state.config.notify={};
  state.config.notify[name]={email:true,calendar:false};
  if(!state.config.calendars) state.config.calendars={};
  if(role==="child") getChildData(name);
  renderAdminUsers();
  syncToCloud("User Added");
  showToast('"'+name+'" added!',"success");
  document.getElementById("new-user-name").value="";
  document.getElementById("new-user-pin").value="";
  document.getElementById("new-user-email").value="";
}

function saveAdminSettings(){
  state.config.bankName       = document.getElementById("admin-bank-name").value.trim()    || CFG_BANK_NAME;
  state.config.tagline        = document.getElementById("admin-bank-tagline").value.trim() || "";
  state.config.colorPrimary   = document.getElementById("admin-color-primary").value;
  state.config.colorSecondary = document.getElementById("admin-color-secondary").value;
  state.config.imgBanner      = document.getElementById("admin-img-banner").value.trim()   || CFG_IMG_BANNER;
  state.config.imgLogo        = document.getElementById("admin-img-logo").value.trim()     || CFG_IMG_LOGO;
  state.config.timezone       = document.getElementById("admin-timezone").value;
  state.config.autoLogout     = parseInt(document.getElementById("admin-autologout").value) || 0;
  // v32: celebrationSound removed from global config — now per-user in user edit form
  if(window._pickerSelections) window._pickerSelections={};
  applyBranding();
  syncToCloud("Admin Settings Updated");
  showToast("All settings saved! 💾","success");
}

function changeAdminPin(){
  openInputModal({
    icon:"🔑", title:"New Admin PIN",
    body:"Enter a new 4-digit admin PIN.",
    inputType:"password", inputAttrs:'maxlength="4" inputmode="numeric" placeholder="••••"',
    confirmText:"Save",
    onConfirm:v=>{
      if(!v||v.length!==4||!/^\d{4}$/.test(v)){ showToast("Admin PIN must be exactly 4 digits.","error"); return; }
      state.config.adminPin=v;
      syncToCloud("Admin PIN Changed");
      showToast("Admin PIN updated.","success");
    }
  });
}

// ── User edit form ─────────────────────────────────────────────────
let editingUserName = null;

function openUserEdit(username){
  editingUserName=username;
  const role=state.roles[username]||"child";
  const cfg=state.config;
  document.getElementById("admin-edit-title").innerHTML="<svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-pencil'/></svg> Edit "+username;
  document.getElementById("edit-user-name").value=username;
  document.getElementById("edit-user-role").value=role;
  document.getElementById("edit-user-pin").value="";
  document.getElementById("edit-user-email").value=(cfg.emails&&cfg.emails[username])||"";
  const notify=(cfg.notify&&cfg.notify[username])||{};
  document.getElementById("edit-notify-email").checked   = notify.email   !== false;
  document.getElementById("edit-notify-cal").checked     = !!notify.calendar;
  document.getElementById("edit-chore-rewards").checked  = notify.choreRewards !== false;
  // v32: per-user celebration sound (default true)
  const ud = (state.usersData && state.usersData[username]) || {};
  const csEdit = document.getElementById("edit-celebration-sound");
  if(csEdit) csEdit.checked = (ud.celebrationSound !== false);
  document.getElementById("edit-cal-id").value=(cfg.calendars&&cfg.calendars[username])||"";
  toggleEditCalField();
  // Show role-specific sections
  document.getElementById("edit-child-fields").style.display      = role==="child"  ? "" : "none";
  document.getElementById("edit-parent-assignment").style.display = role==="parent" ? "" : "none";
  document.getElementById("edit-tab-visibility").style.display    = role==="child"  ? "" : "none";
  // Populate picker displays
  if(role==="parent"){
    const assigned=(cfg.parentChildren && cfg.parentChildren[username]) || [];
    if(!window._pickerSelections) window._pickerSelections={};
    window._pickerSelections.children=[...assigned];
    updatePickerDisplay("children", assigned, PICKER_CONFIG.children);
  }
  if(role==="child"){
    const tabs=getChildTabs(username);
    const selected=[];
    if(tabs.money)  selected.push("money");
    if(tabs.chores) selected.push("chores");
    if(tabs.loans)  selected.push("loans");
    if(!window._pickerSelections) window._pickerSelections={};
    window._pickerSelections.tabs=[...selected];
    updatePickerDisplay("tabs", selected, PICKER_CONFIG.tabs);
  }
  document.getElementById("admin-user-edit-wrap").classList.remove("hidden");
  document.getElementById("admin-user-edit-wrap").scrollIntoView({behavior:"smooth",block:"start"});
  // v31: render avatar picker
  renderAvatarPicker(username);
}

// v31: avatar picker (emoji grid + photo upload)
let _editAvatarEmoji = null;  // staged selection, applied on saveUserEdit

function renderAvatarPicker(username){
  _editAvatarEmoji = getAvatarEmoji(username);
  const cur = document.getElementById("edit-avatar-current");
  const grid = document.getElementById("edit-avatar-grid");
  if(!cur || !grid) return;
  const hasPhoto = !!getAvatarPhoto(username);
  cur.innerHTML = renderAvatar(username,"lg") +
    `<div class="label-stack">
       <div class="who">${username}</div>
       <div class="src">${hasPhoto ? "Using device photo — emoji shown if photo removed" : "Using emoji"}</div>
     </div>`;
  grid.innerHTML = AVATAR_EMOJIS.map(e =>
    `<button type="button" class="${e===_editAvatarEmoji?"selected":""}" onclick="selectAvatarEmoji('${e}')">${e}</button>`
  ).join("");
}

function selectAvatarEmoji(emoji){
  _editAvatarEmoji = emoji;
  // Update grid selection state
  const grid = document.getElementById("edit-avatar-grid");
  if(grid){
    grid.querySelectorAll("button").forEach(b=>{
      b.classList.toggle("selected", b.textContent===emoji);
    });
  }
  // Stage the emoji in state.config so renderAvatar reflects it in the preview
  if(editingUserName){
    setAvatarEmoji(editingUserName, emoji);
    // Refresh preview chip
    const cur = document.getElementById("edit-avatar-current");
    if(cur){
      const hasPhoto = !!getAvatarPhoto(editingUserName);
      cur.innerHTML = renderAvatar(editingUserName,"lg") +
        `<div class="label-stack">
           <div class="who">${editingUserName}</div>
           <div class="src">${hasPhoto ? "Using device photo — emoji shown if photo removed" : "Using emoji"}</div>
         </div>`;
    }
  }
}

async function onAvatarPhotoChosen(event){
  if(!editingUserName) return;
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  try {
    const dataUrl = await resizeImageFileTo200(file);
    setAvatarPhoto(editingUserName, dataUrl);
    showToast("Photo saved on this device.","success");
    renderAvatarPicker(editingUserName);
    // Refresh any live avatars
    refreshVisibleAvatars();
  } catch(e){
    showToast("Could not process photo.","error");
  }
  event.target.value = "";
}

function removeAvatarPhoto(){
  if(!editingUserName) return;
  clearAvatarPhoto(editingUserName);
  showToast("Photo removed from this device.","info");
  renderAvatarPicker(editingUserName);
  refreshVisibleAvatars();
}

/* Re-renders whatever is visible so avatars update immediately. */
function refreshVisibleAvatars(){
  if(typeof renderBalances==="function") renderBalances();
  if(typeof renderHistory==="function" && document.getElementById("history-drawer")?.classList.contains("open")) renderHistory();
  if(typeof renderParentChores==="function" && activeChild) renderParentChores();
}

// v31.1: child can edit their own avatar from the Money tab (no admin PIN).
// Scope-locked: only currentUser (when role is child). Cannot edit siblings.
function renderChildAvatar(){
  if(currentRole!=="child" || !currentUser) return;
  const cur = document.getElementById("child-avatar-current");
  const grid = document.getElementById("child-avatar-grid");
  if(!cur || !grid) return;
  const hasPhoto = !!getAvatarPhoto(currentUser);
  const selected = getAvatarEmoji(currentUser);
  cur.innerHTML = renderAvatar(currentUser,"lg") +
    `<div class="label-stack">
       <div class="who">${currentUser}</div>
       <div class="src">${hasPhoto ? "Using device photo — emoji shown if photo removed" : "Using emoji"}</div>
     </div>`;
  grid.innerHTML = AVATAR_EMOJIS.map(e =>
    `<button type="button" class="${e===selected?"selected":""}" onclick="childSelectAvatarEmoji('${e}')">${e}</button>`
  ).join("");
}

function childSelectAvatarEmoji(emoji){
  if(currentRole!=="child" || !currentUser) return;  // scope guard
  setAvatarEmoji(currentUser, emoji);
  syncToCloud("Avatar Changed");
  renderChildAvatar();
  refreshVisibleAvatars();
  // Update welcome message live
  const wm = document.getElementById("welcome-msg");
  if(wm) wm.innerHTML = renderAvatar(currentUser,"sm") + ' <span>Hi, '+currentUser+'! 👋</span>';
  showToast("Avatar updated!","success");
}

async function onChildAvatarPhotoChosen(event){
  if(currentRole!=="child" || !currentUser){ event.target.value=""; return; }
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  try {
    const dataUrl = await resizeImageFileTo200(file);
    setAvatarPhoto(currentUser, dataUrl);
    showToast("Photo saved on this device.","success");
    renderChildAvatar();
    refreshVisibleAvatars();
    const wm = document.getElementById("welcome-msg");
    if(wm) wm.innerHTML = renderAvatar(currentUser,"sm") + ' <span>Hi, '+currentUser+'! 👋</span>';
  } catch(e){
    showToast("Could not process photo.","error");
  }
  event.target.value = "";
}

function removeChildAvatarPhoto(){
  if(currentRole!=="child" || !currentUser) return;
  clearAvatarPhoto(currentUser);
  showToast("Photo removed from this device.","info");
  renderChildAvatar();
  refreshVisibleAvatars();
  const wm = document.getElementById("welcome-msg");
  if(wm) wm.innerHTML = renderAvatar(currentUser,"sm") + ' <span>Hi, '+currentUser+'! 👋</span>';
}

function toggleEditCalField(){
  const checked=document.getElementById("edit-notify-cal").checked;
  document.getElementById("edit-cal-wrap").style.display = checked ? "" : "none";
}

function cancelUserEdit(){
  editingUserName=null;
  document.getElementById("admin-user-edit-wrap").classList.add("hidden");
}

function saveUserEdit(){
  if(!editingUserName) return;
  const u=editingUserName;
  const role=document.getElementById("edit-user-role").value;
  const pin=document.getElementById("edit-user-pin").value;
  const email=document.getElementById("edit-user-email").value.trim();
  if(pin){
    if(pin.length!==4||!/^\d{4}$/.test(pin)){ showToast("PIN must be exactly 4 digits.","error"); return; }
    state.pins[u]=pin;
  }
  state.roles[u]=role;
  if(!state.config.emails) state.config.emails={};
  state.config.emails[u]=email;
  if(!state.config.notify) state.config.notify={};
  state.config.notify[u]={
    email:        document.getElementById("edit-notify-email").checked,
    calendar:     document.getElementById("edit-notify-cal").checked,
    choreRewards: document.getElementById("edit-chore-rewards").checked
  };
  if(!state.config.calendars) state.config.calendars={};
  const calId=document.getElementById("edit-cal-id").value.trim();
  if(calId) state.config.calendars[u]=calId;
  else delete state.config.calendars[u];
  // v32: per-user celebration sound
  if(!state.usersData) state.usersData={};
  if(!state.usersData[u]) state.usersData[u]={};
  const csEdit = document.getElementById("edit-celebration-sound");
  if(csEdit) state.usersData[u].celebrationSound = !!csEdit.checked;
  // Parent: assigned children
  if(role==="parent"){
    if(!state.config.parentChildren) state.config.parentChildren={};
    state.config.parentChildren[u]=getPickerSelections("children");
  }
  // Child: visible tabs
  if(role==="child"){
    if(!state.config.tabs) state.config.tabs={};
    const sel=getPickerSelections("tabs");
    state.config.tabs[u]={
      money:  sel.indexOf("money")!==-1,
      chores: sel.indexOf("chores")!==-1,
      loans:  sel.indexOf("loans")!==-1
    };
  }
  syncToCloud("User Edited");
  showToast(u+" updated.","success");
  cancelUserEdit();
  renderAdminUsers();
}

// ════════════════════════════════════════════════════════════════════
// 19. MULTI-SELECT PICKER (children, tabs)
// ════════════════════════════════════════════════════════════════════
const PICKER_CONFIG = {
  children: {
    title:"Select Children",
    hint:"Tap to toggle. No selection = parent sees all children.",
    displayId:"edit-child-display",
    noItemsText:"No children added yet.",
    getItems: ()=> getChildNames().map(c=>({value:c, label:c}))
  },
  tabs: {
    title:"Select Visible Tabs",
    hint:"Tap to toggle. Money and Chores are on by default.",
    displayId:"edit-tab-display",
    noItemsText:"",
    getItems: ()=> [
      {value:"money",  label:`<svg class="icon" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-money"/></svg> Money`},
      {value:"chores", label:`<svg class="icon" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-check-circle"/></svg> Chores`},
      {value:"loans",  label:`<svg class="icon" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-bank"/></svg> Loans`}
    ]
  },
  // v30.1: separate picker mode for parent Settings tab — different displayId,
  // same items. Keeps state isolated from the admin edit flow.
  profileTabs: {
    title:"Select Visible Tabs",
    hint:"Controls which tabs this child sees on login.",
    displayId:"profile-tab-display",
    noItemsText:"",
    getItems: ()=> [
      {value:"money",  label:`<svg class="icon" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-money"/></svg> Money`},
      {value:"chores", label:`<svg class="icon" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-check-circle"/></svg> Chores`},
      {value:"loans",  label:`<svg class="icon" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-bank"/></svg> Loans`}
    ]
  }
};

function openPicker(mode){
  pickerMode=mode;
  const cfg=PICKER_CONFIG[mode];
  if(!cfg) return;
  pickerSelected=[...((window._pickerSelections && window._pickerSelections[mode]) || [])];
  document.getElementById("picker-title").textContent=cfg.title;
  document.getElementById("picker-hint").textContent=cfg.hint;
  const items=cfg.getItems();
  const listEl=document.getElementById("picker-items");
  if(!items.length){
    listEl.innerHTML=`<p style="color:var(--muted);font-size:.82rem;text-align:center;padding:20px 0;">${cfg.noItemsText}</p>`;
  } else {
    listEl.innerHTML=items.map(item=>`
      <div class="picker-item" onclick="togglePickerItem('${item.value}',this)">
        <div class="picker-item-check ${pickerSelected.indexOf(item.value)!==-1?'checked':''}" id="pck-${item.value}"></div>
        <span>${item.label}</span>
      </div>`).join("");
  }
  document.getElementById("picker-overlay").classList.add("open");
}

function togglePickerItem(value,row){
  const checkEl=document.getElementById("pck-"+value);
  const idx=pickerSelected.indexOf(value);
  if(idx===-1){ pickerSelected.push(value); if(checkEl) checkEl.classList.add("checked"); }
  else        { pickerSelected.splice(idx,1); if(checkEl) checkEl.classList.remove("checked"); }
}

function closePicker(){
  if(!pickerMode) return;
  const cfg=PICKER_CONFIG[pickerMode];
  if(!window._pickerSelections) window._pickerSelections={};
  window._pickerSelections[pickerMode]=[...pickerSelected];
  updatePickerDisplay(pickerMode, pickerSelected, cfg);
  document.getElementById("picker-overlay").classList.remove("open");
  pickerMode=null;
}

function pickerOverlayClick(e){
  if(e.target===document.getElementById("picker-overlay")) closePicker();
}

function updatePickerDisplay(mode,selected,cfg){
  const displayEl=document.getElementById(cfg.displayId);
  if(!displayEl) return;
  if(!selected.length){
    displayEl.innerHTML=`<span style="font-size:.75rem;color:var(--muted);font-style:italic;">None selected</span>`;
    return;
  }
  const items=cfg.getItems();
  displayEl.innerHTML=selected.map(v=>{
    const item=items.find(i=>i.value===v);
    return item ? `<span style="background:var(--primary);color:white;border-radius:20px;padding:4px 12px;font-size:.75rem;font-weight:700;">${item.label}</span>` : "";
  }).join("");
}

function getPickerSelections(mode){
  return (window._pickerSelections && window._pickerSelections[mode]) || [];
}

// ════════════════════════════════════════════════════════════════════
// 20. PWA INSTALL + SERVICE WORKER AUTO-UPDATE
// ════════════════════════════════════════════════════════════════════
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  showInstallBanner();
});
function showInstallBanner(){
  if(sessionStorage.getItem("installDismissed")) return;
  document.getElementById("install-banner")?.classList.remove("hidden");
}
function triggerInstall(){
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(()=>{
    document.getElementById("install-banner").classList.add("hidden");
    deferredInstallPrompt=null;
  });
}
function dismissInstallBanner(){
  sessionStorage.setItem("installDismissed","1");
  document.getElementById("install-banner").classList.add("hidden");
}
const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone=window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
if(isIos && !isStandalone && !sessionStorage.getItem("installDismissed")){
  setTimeout(()=>{
    const b=document.getElementById("install-banner");
    if(b){
      document.getElementById("install-banner-text").textContent='Tap Share then "Add to Home Screen" to install.';
      document.getElementById("install-btn").classList.add("hidden");
      b.classList.remove("hidden");
    }
  },2000);
}

// Register SW + listen for update messages
let pendingUpdate = false;
let lastActivityAt = Date.now();
const IDLE_THRESHOLD_MS = 30*1000;  // 30 seconds of no taps before auto-applying update

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("service-worker.js").catch(()=>{});
    navigator.serviceWorker.addEventListener("message", e=>{
      if(e.data && e.data.type==="NEW_VERSION_AVAILABLE"){
        pendingUpdate=true;
        const banner=document.getElementById("update-banner");
        const txt=document.getElementById("update-banner-text");
        if(txt) txt.textContent="Version "+e.data.newVersion+" is ready.";
        if(banner) banner.classList.add("show");
        scheduleIdleUpdate();
      }
    });
  });
}

function bumpActivity(){ lastActivityAt = Date.now(); }
["click","touchstart","keydown","scroll"].forEach(ev=>document.addEventListener(ev,bumpActivity,{passive:true}));

function scheduleIdleUpdate(){
  if(!pendingUpdate) return;
  setTimeout(()=>{
    if(!pendingUpdate) return;
    if(Date.now()-lastActivityAt >= IDLE_THRESHOLD_MS){
      applyUpdateNow();
    } else {
      scheduleIdleUpdate();  // not idle yet — check again
    }
  }, 5000);
}

function applyUpdateNow(){
  pendingUpdate=false;
  if(navigator.serviceWorker && navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({type:"CLEAR_CACHE_AND_RELOAD"});
  } else {
    location.reload();
  }
}

// ════════════════════════════════════════════════════════════════════
// 21. AUTO-LOGOUT TIMER
// ════════════════════════════════════════════════════════════════════
function resetInactivityTimer(){
  const mins=parseInt((state.config && state.config.autoLogout)||0);
  if(!mins) return;
  clearTimeout(inactivityTimer);
  inactivityTimer=setTimeout(()=>{
    showToast("Logged out due to inactivity.","info",3000);
    setTimeout(()=>location.reload(),1500);
  },mins*60*1000);
}
function initInactivityTimer(){
  const mins=parseInt((state.config && state.config.autoLogout)||0);
  if(!mins) return;
  ["click","touchstart","keydown","scroll"].forEach(ev=>
    document.addEventListener(ev,resetInactivityTimer,{passive:true})
  );
  resetInactivityTimer();
}

// ════════════════════════════════════════════════════════════════════
// 21b. v31.2 — USABILITY FEATURES
//   • Goal-aware split default (helper)
//   • Weekly stats + child streak banner + parent "this week at a glance"
//   • Goal-hit badges in ledger
//   • In-app help drawer
//   • Long-press quick-approve from chore badge
//   • Monthly statement PDF (jsPDF — vendor/jspdf.umd.min.js must exist)
// ════════════════════════════════════════════════════════════════════

// ── Goal awareness ──────────────────────────────────────────────────
function hasUnmetGoal(childName){
  if(!childName) return false;
  const goals = (getChildData(childName).goals) || [];
  const sav   = (getChildData(childName).balances?.savings) || 0;
  return goals.some(g => (parseFloat(g.target)||0) > sav);
}

// ── Week stats (derived from existing history; no schema change) ────
/* Returns {choresDone, earned, pending, weekStart, weekEnd} for the
   child's last 7 days (rolling, not ISO week). */
function computeWeekStats(childName){
  if(!childName) return {choresDone:0, earned:0, pending:0};
  const data = getChildData(childName);
  const hist = (state.history && state.history[childName]) || [];
  const now  = new Date();
  const start = new Date(now); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
  const inWindow = d => {
    // history dates are stored via fmtDate — try to parse, fall back to false
    const dt = new Date(d);
    return !isNaN(dt) && dt >= start && dt <= now;
  };
  const choreRows = hist.filter(h => inWindow(h.date) && /chore:/i.test(h.note||""));
  // Dedup chore credits: a chore can hit ledger twice (chk+sav), count the name+date pair once
  const seen = new Set();
  let choresDone = 0, earned = 0;
  for(const h of choreRows){
    const key = (h.date||"") + "|" + (h.note||"").replace(/\(chk\)|\(sav\)/ig,"").trim();
    if(!seen.has(key)) { seen.add(key); choresDone++; }
    earned += (parseFloat(h.amt)||0);
  }
  const pending = ((data.chores)||[]).filter(c=>c.status==="pending").length;
  return {choresDone, earned, pending, weekStart:start, weekEnd:now};
}

// ── Child: weekly streak banner (chore tab top) ─────────────────────
function renderWeeklyStreakBanner(){
  const el = document.getElementById("child-weekly-summary");
  if(!el) return;
  const child = activeChild || currentUser;
  if(!child || currentRole!=="child"){ el.innerHTML=""; return; }
  const s = computeWeekStats(child);
  if(s.choresDone<=0){ el.innerHTML=""; return; }
  const showEarn = choreRewardsEnabled(child);
  el.innerHTML = `<div class="weekly-streak-banner">
    <svg class="icon icon-lg" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-fire"/></svg>
    <div class="wsb-text">
      <div class="wsb-title">${s.choresDone} chore${s.choresDone===1?"":"s"} done this week!</div>
      ${showEarn?`<div class="wsb-sub">Earned ${fmt(s.earned)} — keep it up!</div>`:`<div class="wsb-sub">Great job — keep it up!</div>`}
    </div>
  </div>`;
}

// ── Parent: "this week at a glance" card ────────────────────────────
function renderWeekAtGlance(){
  const el = document.getElementById("parent-week-glance");
  if(!el) return;
  if(currentRole!=="parent" || !activeChild){ el.innerHTML=""; return; }
  const s = computeWeekStats(activeChild);
  // Only show if there's something to show OR there are no deposits pending
  const depEl = document.getElementById("parent-deposit-approvals");
  const hasDep = depEl && depEl.innerHTML.trim().length > 0;
  if(hasDep && s.choresDone===0 && s.pending===0){ el.innerHTML=""; return; }
  el.innerHTML = `<div class="week-glance-card">
    <div class="wgc-header">
      <svg class="icon" aria-hidden="true"><use href="vendor/phosphor-sprite.svg#ph-chart-bar"/></svg>
      <span>This week for ${activeChild}</span>
    </div>
    <div class="wgc-stats">
      <div class="wgc-stat"><div class="wgc-num">${s.choresDone}</div><div class="wgc-lbl">chores done</div></div>
      <div class="wgc-stat"><div class="wgc-num">${fmt(s.earned)}</div><div class="wgc-lbl">earned</div></div>
      <div class="wgc-stat ${s.pending?'wgc-alert':''}"><div class="wgc-num">${s.pending}</div><div class="wgc-lbl">pending</div></div>
    </div>
  </div>`;
}

// ── Goal-hit badges in ledger ────────────────────────────────────────
/* Returns a Set of ledger-row signatures ("date|note") that represent
   the first time the child's running savings balance met/exceeded
   a goal target. Run against the full history each render. */
function computeGoalHitSignatures(childName){
  const sigs = new Set();
  if(!childName) return sigs;
  const goals = (getChildData(childName).goals) || [];
  if(!goals.length) return sigs;
  const hist = (state.history && state.history[childName]) || [];
  // Sort chronologically
  const sorted = [...hist].filter(h => h.date).sort((a,b) => new Date(a.date) - new Date(b.date));
  // Running savings: start at zero (history covers the whole lifetime in this app)
  let runSav = 0;
  const hitTargets = new Set(); // each goal target hit only once, at first crossing
  for(const h of sorted){
    const n = (h.note||"").toLowerCase();
    const isSav = n.includes("(sav)") || n.includes("to savings") || n.includes("to sav") || n.includes("interest (sav)");
    if(isSav) runSav += (parseFloat(h.amt)||0);
    // Check each goal target
    for(const g of goals){
      const target = parseFloat(g.target)||0;
      if(target<=0) continue;
      if(hitTargets.has(target)) continue;
      if(runSav >= target){
        sigs.add((h.date||"")+"|"+(h.note||"")+"|"+target);
        hitTargets.add(target);
      }
    }
  }
  return sigs;
}

/* Looks up whether a given ledger row is a goal-hit row. Returns the goal
   name that was met on that row, or null. */
function goalHitForRow(childName, h, goalSigs){
  const goals = (getChildData(childName).goals) || [];
  for(const g of goals){
    const target = parseFloat(g.target)||0;
    if(target<=0) continue;
    const sig = (h.date||"")+"|"+(h.note||"")+"|"+target;
    if(goalSigs.has(sig)) return g.name || ("$"+target.toFixed(0));
  }
  return null;
}

// ── Help drawer ──────────────────────────────────────────────────────
const HELP_CONTENT = {
  login: {
    title: "Logging In",
    body: `<p>Enter your name and 4-digit PIN, then tap <strong>Log In</strong>.</p>
      <p><strong>Remember my username</strong> saves your name on this device so you don't re-type it.</p>
      <p><strong>Auto-login</strong> skips the PIN entirely. Only turn this on for your own personal device — anyone who picks it up will be logged in as you.</p>
      <p>Forgot your PIN? Ask a parent to reset it from Admin.</p>`
  },
  picker: {
    title: "Choosing an Account",
    body: `<p>You're a parent with more than one child. Pick whose account you want to manage.</p>
      <p>Tap a child's name to go to their account. You can switch later using the <strong>Switch</strong> button at the top.</p>`
  },
  main: {
    title: "Using Family Bank",
    body: `<p><strong>Checking &amp; Savings cards</strong> show your balances and monthly interest.</p>
      <p><strong>Transaction History</strong> lists every deposit, withdrawal, and chore payment. Goals you've met show a 🎯 badge.</p>
      <p><strong>Net Worth Chart</strong> plots your total balance over time with a 3-month projection.</p>
      <hr>
      <p><strong>For kids:</strong> the Money tab is where you withdraw, transfer between accounts, or deposit cash. The Chores tab shows what's due and lets you mark completed chores.</p>
      <p><strong>For parents:</strong> Adjust lets you add or remove money directly. Chores is where you approve submissions. Settings handles allowance, rates, and PDF statements.</p>
      <hr>
      <p><strong>Tip:</strong> long-press the red badge on the Chores tab to quick-approve without navigating.</p>`
  },
  admin: {
    title: "Admin Panel",
    body: `<p>The Admin PIN gates this panel. Change it from <strong>Admin PIN</strong> below.</p>
      <p><strong>User Management</strong> — add kids, edit avatars, reset PINs, change emails/notifications, choose which tabs each child sees.</p>
      <p><strong>Bank Branding</strong> — customize the name, tagline, and colors.</p>
      <p><strong>Auto-Logout</strong> — returns to the login screen after inactivity. Set to 5 minutes on shared devices.</p>
      <p><strong>Celebration Sound</strong> — plays a short chime when kids submit chores. Off by default.</p>`
  }
};

function openHelp(screen){
  const data = HELP_CONTENT[screen] || HELP_CONTENT.main;
  document.getElementById("help-drawer-title").textContent = data.title;
  document.getElementById("help-drawer-body").innerHTML = data.body;
  document.getElementById("help-drawer").classList.add("open");
}
function closeHelp(){ document.getElementById("help-drawer").classList.remove("open"); }

// ── Long-press quick-approve ─────────────────────────────────────────
let _lpTimer = null, _lpTarget = null;
function bindLongPressApprove(){
  const badge = document.getElementById("parent-chore-badge");
  if(!badge || badge._lpBound) return;
  badge._lpBound = true;
  const start = (ev)=>{
    if(badge.classList.contains("hidden")) return;
    _lpTarget = badge;
    badge.classList.add("lp-active");
    _lpTimer = setTimeout(()=>{
      badge.classList.remove("lp-active");
      if(navigator.vibrate) try{ navigator.vibrate(30); }catch(e){}
      openQuickApprove();
    }, 500);
  };
  const cancel = ()=>{
    clearTimeout(_lpTimer); _lpTimer=null;
    if(_lpTarget){ _lpTarget.classList.remove("lp-active"); _lpTarget=null; }
  };
  badge.addEventListener("touchstart", start, {passive:true});
  badge.addEventListener("mousedown",  start);
  ["touchend","touchcancel","mouseup","mouseleave"].forEach(ev=>badge.addEventListener(ev,cancel));
}

function openQuickApprove(){
  if(currentRole!=="parent" || !activeChild) return;
  const data = getChildData(activeChild);
  const pending = (data.chores||[]).filter(c=>c.status==="pending");
  if(!pending.length){ showToast("No pending chores.","info"); return; }
  const sheet = document.getElementById("quick-approve-sheet");
  const list  = document.getElementById("quick-approve-list");
  list.innerHTML = pending.map(c=>`
    <div class="qa-row">
      <div class="qa-info">
        <div class="qa-name">${c.name}</div>
        <div class="qa-meta">${renderAvatar(c.completedBy,"xs")} ${c.completedBy} · ${fmt(c.amount)}</div>
      </div>
      <div class="qa-btns">
        <button class="btn btn-secondary btn-sm" onclick="quickApproveOne('${c.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-check-circle'/></svg></button>
        <button class="btn btn-danger btn-sm" onclick="quickDenyOne('${c.id}')"><svg class='icon' aria-hidden='true'><use href='vendor/phosphor-sprite.svg#ph-x-circle'/></svg></button>
      </div>
    </div>`).join("");
  sheet.classList.add("open");
}
function closeQuickApprove(){ document.getElementById("quick-approve-sheet").classList.remove("open"); }

function quickApproveOne(choreId){
  // Reuse existing approveChore flow but skip its confirmation modal
  const data = getChildData(activeChild);
  const chore = data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  const ck = chore.amount * (chore.splitChk/100);
  const sv = chore.amount * ((100-chore.splitChk)/100);
  data.balances.checking += ck;
  data.balances.savings  += sv;
  if(ck>0) recordTransaction("Bank","Chore: "+chore.name+" (Chk)",ck);
  if(sv>0) recordTransaction("Bank","Chore: "+chore.name+" (Sav)",sv);
  if(chore.schedule==="once"){
    data.chores = data.chores.filter(c=>c.id!==choreId);
  } else {
    Object.assign(chore,{status:"available",completedBy:null,completedAt:null,denialNote:null,lastCompleted:todayStr()});
    if(chore.streakMilestone && chore.streakReward){
      chore.streakCount = (parseInt(chore.streakCount)||0) + 1;
      const effective = chore.streakCount + (parseInt(chore.streakStart)||0);
      const milestone = parseInt(chore.streakMilestone)||0;
      if(milestone>0 && effective%milestone===0){
        const bonus = parseFloat(chore.streakReward)||0;
        if(bonus>0){
          data.balances.checking += bonus;
          recordTransaction("Bank","🔥 Streak Bonus: "+chore.name+" ("+effective+" in a row!) (Chk)",bonus);
          showToast("🔥 Streak milestone! +"+fmt(bonus)+" bonus deposited!","success",4000);
        }
      }
    }
  }
  state._approvedChoreId = chore.id;
  state._approvedChoreTitle = buildCalEventTitle(chore);
  state._approvedChoreSchedule = chore.schedule;
  syncToCloud("Chore Approved (Quick)");
  delete state._approvedChoreId; delete state._approvedChoreTitle; delete state._approvedChoreSchedule;
  showToast("Approved! "+fmt(chore.amount)+" deposited.","success");
  renderParentChores(); renderChildChores(); updateChoreBadges(); renderWeekAtGlance();
  // Refresh the quick-approve sheet
  const remaining = (data.chores||[]).filter(c=>c.status==="pending");
  if(remaining.length) openQuickApprove();
  else closeQuickApprove();
}

function quickDenyOne(choreId){
  // Quick deny — no reason prompt; use normal deny for reasons
  const data = getChildData(activeChild);
  const chore = data.chores.find(c=>c.id===choreId);
  if(!chore) return;
  if(chore.schedule==="once"){
    data.chores = data.chores.filter(c=>c.id!==choreId);
  } else {
    Object.assign(chore,{status:"available",completedBy:null,completedAt:null,denialNote:null,lastCompleted:null});
  }
  syncToCloud("Chore Denied (Quick)");
  showToast("Chore denied.","error");
  renderParentChores(); renderChildChores(); updateChoreBadges(); renderWeekAtGlance();
  const remaining = (data.chores||[]).filter(c=>c.status==="pending");
  if(remaining.length) openQuickApprove();
  else closeQuickApprove();
}

// ── PDF monthly statement ────────────────────────────────────────────
function generateMonthlyStatementPDF(){
  if(currentRole!=="parent" || !activeChild){ showToast("Pick a child first.","error"); return; }
  if(typeof window.jspdf === "undefined" || !window.jspdf.jsPDF){
    showToast("PDF library missing — download vendor/jspdf.umd.min.js (see vendor/README.txt)","error",5000);
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"pt", format:"letter"});
  const child = activeChild;
  const data  = getChildData(child);
  const hist  = (state.history && state.history[child]) || [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
  const monthLabel = monthStart.toLocaleString("default",{month:"long",year:"numeric"});
  const inMonth = d => {
    const dt = new Date(d);
    return !isNaN(dt) && dt>=monthStart && dt<=monthEnd;
  };

  // Helpers -----------------------------------------------------
  const fmtShortDate = d => {
    const dt = new Date(d);
    if(isNaN(dt)) return "";
    return dt.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  };
  // Signed currency: "+$5.00" or "-$0.25" (not "$-0.25")
  const fmtSignedAmt = n => {
    const v = parseFloat(n) || 0;
    const abs = Math.abs(v);
    return (v>=0 ? "+" : "-") + fmt(abs);
  };
  // Strip (Chk)/(Sav) suffix for grouping
  const baseNote = s => (s||"").replace(/\s*\((chk|sav)\)\s*$/i,"").trim();

  // Consolidate chk+sav split rows into single logical entries ----
  // Key: date + baseNote + user. Multiple physical rows → one display row
  // with a split subline showing "-> $x chk + $y sav" (if both present).
  const rawRows = hist.filter(h => inMonth(h.date));
  const groups = new Map();  // key → {date, user, note, amtChk, amtSav, amtOther, rawCount}
  for(const h of rawRows){
    const key = (h.date||"") + "|" + baseNote(h.note) + "|" + (h.user||"");
    let g = groups.get(key);
    if(!g){
      g = {date:h.date, user:h.user||"", note:baseNote(h.note), amtChk:0, amtSav:0, amtOther:0, rawCount:0};
      groups.set(key, g);
    }
    g.rawCount++;
    const tail = /(chk|sav)\)\s*$/i.exec(h.note||"");
    const amt  = parseFloat(h.amt)||0;
    if(tail && tail[1].toLowerCase()==="chk")      g.amtChk   += amt;
    else if(tail && tail[1].toLowerCase()==="sav") g.amtSav   += amt;
    else                                           g.amtOther += amt;
  }
  const consolidated = [...groups.values()].map(g => ({
    date: g.date,
    user: g.user,
    note: g.note,
    total: g.amtChk + g.amtSav + g.amtOther,
    amtChk: g.amtChk,
    amtSav: g.amtSav,
    isSplit: (g.amtChk !== 0 && g.amtSav !== 0),
    isChore: /^chore:/i.test(g.note)
  }));
  consolidated.sort((a,b) => new Date(b.date) - new Date(a.date));

  // Totals ------------------------------------------------------
  const totalIn  = rawRows.filter(r=>r.amt>0).reduce((s,r)=>s+r.amt,0);
  const totalOut = rawRows.filter(r=>r.amt<0).reduce((s,r)=>s+r.amt,0);
  const net = totalIn + totalOut;

  // Layout constants --------------------------------------------
  const PAGE_W = 612, MARGIN = 40, RIGHT = PAGE_W - MARGIN;  // 572
  const COL_DATE   = MARGIN;        // 40
  const COL_USER   = MARGIN + 70;   // 110
  const COL_NOTE   = MARGIN + 140;  // 180
  const COL_AMT_R  = RIGHT;         // 572 (right-aligned)

  // ── HEADER ───────────────────────────────────────────────────
  doc.setFont("helvetica","bold"); doc.setFontSize(20);
  doc.text(state.config.bankName || "Family Bank", MARGIN, 60);
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(state.config.tagline || "Monthly Statement", MARGIN, 76);
  doc.setTextColor(0);

  doc.setFont("helvetica","bold"); doc.setFontSize(14);
  doc.text(`Statement for ${child}`, MARGIN, 110);
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${monthLabel} · Generated ${fmtShortDate(now)}`, MARGIN, 126);
  doc.setTextColor(0);

  // ── CURRENT BALANCES ─────────────────────────────────────────
  const balY = 148;
  doc.setDrawColor(220); doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, balY, RIGHT-MARGIN, 64, 6, 6);
  doc.setFont("helvetica","bold"); doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text("CURRENT BALANCES", MARGIN+14, balY+17);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text("Checking", MARGIN+14, balY+38);
  doc.text("Savings",  MARGIN+14, balY+54);
  doc.setFont("helvetica","normal");
  doc.text(fmt(data.balances.checking||0), MARGIN+110, balY+38);
  doc.text(fmt(data.balances.savings||0),  MARGIN+110, balY+54);
  doc.setFontSize(9); doc.setTextColor(110);
  doc.text(`APY ${data.rates?.checking||0}%`, MARGIN+210, balY+38);
  doc.text(`APY ${data.rates?.savings ||0}%`, MARGIN+210, balY+54);
  doc.setTextColor(0);

  // ── THIS MONTH (boxed 3-stat row) ────────────────────────────
  const smY = 230;
  const smH = 56;
  const statW = (RIGHT-MARGIN)/3;
  doc.setDrawColor(220); doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, smY, RIGHT-MARGIN, smH, 6, 6);
  // vertical dividers
  doc.line(MARGIN+statW,   smY+10, MARGIN+statW,   smY+smH-10);
  doc.line(MARGIN+statW*2, smY+10, MARGIN+statW*2, smY+smH-10);
  const stats = [
    {label:"DEPOSITS",    val:fmtSignedAmt(totalIn),  color:[22,130,80]},
    {label:"WITHDRAWALS", val:fmtSignedAmt(totalOut), color:[180,50,50]},
    {label:"NET CHANGE",  val:fmtSignedAmt(net),      color: net>=0 ? [22,130,80] : [180,50,50]}
  ];
  stats.forEach((s,i) => {
    const cx = MARGIN + statW*i + statW/2;
    doc.setFont("helvetica","bold"); doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(s.label, cx, smY+18, {align:"center"});
    doc.setFontSize(15);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.text(s.val, cx, smY+42, {align:"center"});
  });
  doc.setTextColor(0);

  // ── TRANSACTIONS TABLE ───────────────────────────────────────
  let y = 316;
  doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("TRANSACTIONS", MARGIN, y);
  doc.setDrawColor(180); doc.setLineWidth(0.8);
  doc.line(MARGIN, y+4, RIGHT, y+4);
  y += 20;

  if(!consolidated.length){
    doc.setFont("helvetica","italic"); doc.setFontSize(10); doc.setTextColor(130);
    doc.text("No transactions this month.", MARGIN, y);
    doc.setTextColor(0);
  } else {
    // Column headers
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text("DATE",   COL_DATE,  y);
    doc.text("BY",     COL_USER,  y);
    doc.text("NOTE",   COL_NOTE,  y);
    doc.text("AMOUNT", COL_AMT_R, y, {align:"right"});
    doc.setTextColor(0);
    y += 4;
    doc.setDrawColor(220); doc.setLineWidth(0.3);
    doc.line(MARGIN, y, RIGHT, y);
    y += 12;

    doc.setFont("helvetica","normal"); doc.setFontSize(9);
    for(const r of consolidated){
      // How tall is this row? split row = 2 lines (22pt), regular = 1 line (14pt)
      const rowH = r.isSplit ? 22 : 14;
      // Page break
      if(y + rowH > 740){
        doc.addPage(); y = 60;
      }

      const dateTxt = fmtShortDate(r.date);
      const userTxt = (r.user||"").slice(0,14);
      // Note max width: from COL_NOTE to (COL_AMT_R - 70) ≈ 322pt wide
      const noteMaxChars = 55;
      const noteTxt = (r.note||"").length > noteMaxChars
        ? (r.note||"").slice(0,noteMaxChars-1) + "…"
        : (r.note||"");

      doc.text(dateTxt, COL_DATE, y);
      doc.text(userTxt, COL_USER, y);
      doc.text(noteTxt, COL_NOTE, y);

      // Amount: color-coded, right-aligned, sign-before-dollar
      const amtTxt = fmtSignedAmt(r.total);
      if(r.total >= 0) doc.setTextColor(22,130,80);
      else             doc.setTextColor(180,50,50);
      doc.setFont("helvetica","bold");
      doc.text(amtTxt, COL_AMT_R, y, {align:"right"});
      doc.setFont("helvetica","normal"); doc.setTextColor(0);

      // Split subline for consolidated chore rows
      if(r.isSplit){
        y += 11;
        doc.setFontSize(7.5); doc.setTextColor(130);
        const subTxt = `→ ${fmt(r.amtChk)} checking + ${fmt(r.amtSav)} savings`;
        doc.text(subTxt, COL_NOTE, y);
        doc.setFontSize(9); doc.setTextColor(0);
      }
      y += 11;
      // Thin divider
      doc.setDrawColor(238); doc.setLineWidth(0.3);
      doc.line(MARGIN, y-5, RIGHT, y-5);
    }
  }

  // ── CHORES COMPLETED ─────────────────────────────────────────
  const choreGroups = consolidated.filter(r => r.isChore);
  if(choreGroups.length){
    if(y > 680){ doc.addPage(); y = 60; }
    y += 18;
    doc.setFont("helvetica","bold"); doc.setFontSize(10);
    doc.text("CHORES COMPLETED", MARGIN, y);
    doc.setDrawColor(180); doc.setLineWidth(0.8);
    doc.line(MARGIN, y+4, RIGHT, y+4);
    y += 20;
    const totalChorePay = choreGroups.reduce((s,r)=>s+r.total,0);
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    doc.text(`${choreGroups.length} chore${choreGroups.length===1?"":"s"} completed — totaling ${fmtSignedAmt(totalChorePay)}`, MARGIN, y);
  }

  // ── FOOTER ───────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    doc.setPage(i);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`${state.config.bankName || "Family Bank"} · ${child} · ${monthLabel}`, MARGIN, 770);
    doc.text(`Page ${i} of ${pageCount} · v${APP_VERSION}`, RIGHT, 770, {align:"right"});
    doc.setTextColor(0);
  }

  const fname = `${child}_statement_${monthStart.getFullYear()}-${String(monthStart.getMonth()+1).padStart(2,"0")}.pdf`;
  doc.save(fname);
  showToast("Statement downloaded.","success");
}


// v31.3: stamp version on splash + login (runs before loadFromCloud)
(function stampVersion(){
  const tag = "v" + APP_VERSION;
  const sv = document.getElementById("splash-version");
  const lv = document.getElementById("login-version");
  if(sv) sv.textContent = tag;
  if(lv) lv.textContent = tag;
})();

populateMonthlyDays();
populateAllowanceMonthlyDays();
populateLoanDueDayPicker();
onScheduleChange();          // show/hide fields for default "One-time"
onAllowanceScheduleChange();
document.querySelector("#allow-day-toggles .day-toggle[data-day='1']")?.classList.add("selected");
updateSplitLabel();
updateDepositSplitLabel();
onChildActionChange();
document.getElementById("username-input").addEventListener("keydown", e=>{ if(e.key==="Enter") document.getElementById("pin-input").focus(); });
document.getElementById("pin-input").addEventListener("keydown",      e=>{ if(e.key==="Enter") attemptLogin(); });
document.getElementById("admin-pin-input").addEventListener("keydown",e=>{ if(e.key==="Enter") attemptAdminLogin(); });
loadFromCloud();

// ════════════════════════════════════════════════════════════════════
// 20. v32 — BOTTOM SHEETS, COLLAPSIBLES, LAUNCHER HELPERS
// ════════════════════════════════════════════════════════════════════
/**
 * Open a bottom sheet by DOM id. Shared dim backdrop slides in.
 * Multiple sheets can stack — backdrop stays until all are closed.
 */
function openSheet(id){
  const sheet = document.getElementById(id);
  if(!sheet) return;
  sheet.classList.add("open");
  document.getElementById("sheet-backdrop")?.classList.add("open");
}
function closeSheet(id){
  const sheet = document.getElementById(id);
  if(!sheet) return;
  sheet.classList.remove("open");
  // If no sheets are still open, retract the backdrop.
  if(!document.querySelector(".bottom-sheet.open")){
    document.getElementById("sheet-backdrop")?.classList.remove("open");
  }
}
function closeAllSheets(){
  document.querySelectorAll(".bottom-sheet.open").forEach(s=>s.classList.remove("open"));
  document.getElementById("sheet-backdrop")?.classList.remove("open");
}

/**
 * Toggle a collapsible card's expanded state (used for admin User Management
 * and Bank Branding sections). Chevron rotation handled via CSS.
 */
function toggleCollapsible(id){
  const card = document.getElementById(id);
  if(!card) return;
  card.classList.toggle("expanded");
}

/**
 * Launcher helpers — open the right sheet and also reset/populate the form
 * inside so the user gets a clean experience each time.
 */
function openChoreCreator(){
  // If not mid-edit, start a fresh form
  if(typeof editingChoreId !== "undefined" && !editingChoreId){
    try { resetChoreForm(); } catch(e){}
  }
  openSheet("sheet-chore-creator");
}
function openLoanCreator(){
  if(typeof editingLoanId !== "undefined" && !editingLoanId){
    try { resetLoanForm && resetLoanForm(); } catch(e){}
  }
  openSheet("sheet-loan-creator");
}
function openChildProfileSheet(){
  // Populate from current activeChild before showing
  try { renderChildProfileSection(); } catch(e){}
  openSheet("sheet-child-profile");
}

// v32: Auto-close chore/loan sheets when the Cancel/Save handlers finish their work.
// We don't need to modify those handlers — instead, hook into the hidden-attribute
// changes on the edit wrappers, which is what their existing cancel/reset code touches.
// (Handled implicitly by form-submit flows calling resetChoreForm / cancelChoreEdit.)
// If you want the sheet to auto-close on successful chore creation, extend createChore()
// accordingly. For now, the user taps ✕ Close or the backdrop.

// v32: When parent changes active child, close any open sheets that show stale data
(function(){
  const origSelectChild = typeof selectChild === "function" ? selectChild : null;
  if(!origSelectChild) return;
  window.selectChild = function(name){
    closeAllSheets();
    return origSelectChild(name);
  };
})();
