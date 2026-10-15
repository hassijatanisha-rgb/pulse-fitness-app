const icons = {
  pulse: `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M5 25h8l4-12 7 24 6-18 4 6h9" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bell: `🔔`, user: `●`, arrow: `↗`, check: `✓`, close: `×`
};

const emailEndpoint = String(window.PULSE_CONFIG?.bookingEmailEndpoint || "").trim();
const backendEndpoint = emailEndpoint;
let adminRefreshTimer = null;

function backendPost(fields, timeoutMs=20000) {
  if (!backendEndpoint) return Promise.reject(new Error("Pulse cloud service is not configured."));
  return new Promise((resolve,reject)=>{
    const requestId=`pulse-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const frame=document.createElement("iframe"), form=document.createElement("form");
    const cleanup=()=>{ window.removeEventListener("message",onMessage); clearTimeout(timer); form.remove(); setTimeout(()=>frame.remove(),0); };
    const onMessage=event=>{
      const data=event.data;
      if(!data || data.source!=="pulse-backend" || data.requestId!==requestId) return;
      cleanup(); resolve(data);
    };
    const timer=setTimeout(()=>{ cleanup(); reject(new Error("Pulse cloud service did not respond. Try again.")); },timeoutMs);
    frame.name=`pulse-backend-${requestId}`;
    // Apps Script renders a sandboxed child frame. Keep the transport frame
    // mounted (but visually inert) so browsers execute that response bridge.
    Object.assign(frame.style,{position:"fixed",width:"1px",height:"1px",opacity:"0",pointerEvents:"none",border:"0",left:"-9999px",top:"0"});
    frame.setAttribute("aria-hidden","true"); frame.tabIndex=-1;
    form.method="POST"; form.action=backendEndpoint; form.target=frame.name; form.hidden=true;
    Object.entries({...fields,requestId}).forEach(([name,value])=>{ const input=document.createElement("input"); input.type="hidden"; input.name=name; input.value=String(value ?? ""); form.append(input); });
    window.addEventListener("message",onMessage); document.body.append(frame,form); form.submit();
  });
}

function loadPublicState() {
  if(!backendEndpoint) return Promise.resolve(null);
  return new Promise(resolve=>{
    const callback=`pulsePublicState_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement("script");
    const finish=value=>{ delete window[callback]; script.remove(); resolve(value || null); };
    const timer=setTimeout(()=>finish(null),12000);
    window[callback]=payload=>{
      clearTimeout(timer);
      if(payload?.ok) {
        state.businessSettings={...state.businessSettings,...payload.settings};
        if(Array.isArray(payload.gymSchedule) && payload.gymSchedule.length) state.gymSchedule=payload.gymSchedule;
        state.remoteBusyPadel=Array.isArray(payload.busyPadel)?payload.busyPadel:[];
        saveState(); render();
      }
      finish(payload);
    };
    script.onerror=()=>{ clearTimeout(timer); finish(null); };
    script.src=`${backendEndpoint}?action=public-state&callback=${encodeURIComponent(callback)}&v=${Date.now()}`;
    document.head.append(script);
  });
}

const defaultBusinessSettings = Object.freeze({
  padelCourtPrice:Number(window.PULSE_CONFIG?.businessDefaults?.padelCourtPrice || 40000),
  padelDurationMinutes:Number(window.PULSE_CONFIG?.businessDefaults?.padelDurationMinutes || 90),
  padelCourtCount:Number(window.PULSE_CONFIG?.businessDefaults?.padelCourtCount || 3),
  weekdayOpeningTime:String(window.PULSE_CONFIG?.businessDefaults?.weekdayOpeningTime || "05:00"),
  weekdayClosingTime:String(window.PULSE_CONFIG?.businessDefaults?.weekdayClosingTime || "21:00"),
  weekendOpeningTime:String(window.PULSE_CONFIG?.businessDefaults?.weekendOpeningTime || "07:00"),
  weekendClosingTime:String(window.PULSE_CONFIG?.businessDefaults?.weekendClosingTime || "19:00")
});
const gymClassTemplates = {
  1:[["17:00","18:00","Boxing","Slim"],["17:45","18:30","Spinning","Nadhege"],["18:00","18:45","Core Work","Mussa"],["19:00","19:45","Aerial Yoga","Liz"]],
  2:[["06:30","07:30","Spinning","Karim"],["18:00","19:00","Mat Pilates","Eli"],["18:30","19:30","Climb to the Beat","Mchina"]],
  3:[["06:30","07:30","Spinning","Mchina"],["08:15","09:15","Power Yoga","Sisti"],["18:00","19:00","Aerobics","Leah"],["18:30","19:15","Zumba","Arafat"]],
  4:[["18:00","19:00","Spin. HIIT. Repeat.","Mandi"],["18:00","19:00","Dance","Selam"],["18:30","19:30","Boxing Bootcamp","Slim"]],
  5:[["06:30","07:30","Fusion – TRX","Karim"],["18:00","19:00","Circuit","Mussa"],["18:00","19:00","Aerobics","Leah"],["18:30","19:30","Aerial Hoop","Selam"]],
  6:[["09:00","10:00","Spinning","Nadhege"]],
  0:[]
};

function createGymSchedule() {
  return Array.from({length:7},(_,day)=>{
    const date=new Date("2026-10-16T12:00:00"); date.setDate(date.getDate()+day);
    const iso=date.toISOString().slice(0,10);
    return gymClassTemplates[date.getDay()].map((slot,index)=>({
      id:`GC-${day+1}${index+1}`, date:iso, time:slot[0], endTime:slot[1], name:slot[2], trainer:slot[3], capacity:14, price:25000, active:true
    }));
  }).flat();
}

const seed = {
  bookings: [
    { id:"PLS-2408", service:"Strength Circuit", category:"Gym", date:"2026-10-16", time:"07:00", name:"Amina Yusuf", email:"amina@example.com", phone:"+255 712 441 820", payment:"Paid in app", amount:25000, status:"Confirmed", paymentStatus:"Paid" },
    { id:"PLS-2411", service:"Court 1", category:"Padel", date:"2026-10-16", time:"18:00", durationMinutes:90, name:"David Mushi", email:"david@example.com", phone:"+255 754 220 118", payment:"Pay on arrival", amount:40000, status:"Confirmed", paymentStatus:"Due" },
    { id:"PLS-2415", service:"Reformer Sculpt", category:"Stretch", date:"2026-10-17", time:"10:00", name:"Neema Issa", email:"neema@example.com", phone:"+255 685 110 927", payment:"Paid in app", amount:30000, status:"Confirmed", paymentStatus:"Paid" },
    { id:"PLS-2398", service:"Court 2", category:"Padel", date:"2026-10-14", time:"20:00", durationMinutes:90, name:"Kelvin John", email:"kelvin@example.com", phone:"+255 713 951 120", payment:"Pay on arrival", amount:40000, status:"No-show", paymentStatus:"No-show fee due" }
  ],
  trainerRequests: [
    { id:"TR-102", name:"Mariam Said", email:"mariam@example.com", phone:"+255 786 300 122", goal:"Build strength and create a sustainable diet plan", trainer:"Baraka M.", date:"2026-10-18", time:"12:00", status:"Pending" }
  ],
  buddyRequests: [
    { id:"BD-101", name:"Asha", phone:"+255 710 221 904", date:"2026-10-18", time:"18:00", level:"Intermediate" },
    { id:"BD-102", name:"Jonas", phone:"+255 754 119 328", date:"2026-10-19", time:"10:00", level:"Beginner" }
  ],
  padelRankings: [
    { id:"PR-1", name:"Asha M.", level:"Advanced", points:1280, played:18, won:13 },
    { id:"PR-2", name:"Jonas K.", level:"Intermediate", points:1170, played:20, won:12 },
    { id:"PR-3", name:"Neema I.", level:"Intermediate", points:1095, played:15, won:8 },
    { id:"PR-4", name:"Tanisha Hassija", level:"Intermediate", points:1040, played:12, won:7 },
    { id:"PR-5", name:"David M.", level:"Beginner", points:920, played:10, won:4 }
  ],
  padelMatches: [
    { id:"MT-101", date:"2026-10-12", player:"Tanisha Hassija", opponent:"Neema I.", score:"6–4, 6–3", result:"Won", points:24 },
    { id:"MT-102", date:"2026-10-08", player:"Tanisha Hassija", opponent:"Asha M.", score:"4–6, 5–7", result:"Lost", points:-8 }
  ],
  padelEvents: [
    { id:"EV-101", title:"Pulse Friday Americano", date:"2026-10-23", time:"18:00", format:"Americano", capacity:16, registered:["Asha M.","Jonas K.","Neema I."], bracket:["Quarter-finals · 18:00","Semi-finals · 20:00","Final · 21:00"] },
    { id:"EV-102", title:"Masaki Social League", date:"2026-11-02", time:"19:00", format:"Four-week league", capacity:24, registered:["David M.","Asha M."], bracket:["Round 1 · 2 Nov","Round 2 · 9 Nov","Finals · 23 Nov"] }
  ],
  padelPromotions: [
    { id:"PROMO-OFFPEAK", title:"20% off off-peak courts", detail:"Members save on Padel courts before 16:00.", code:"PULSE20" },
    { id:"PROMO-GEAR", title:"10% off Padel gear", detail:"Show the claimed offer at reception.", code:"GEAR10" },
    { id:"PROMO-EVENT", title:"Tournament entry bundle", detail:"Book two events and receive a free recovery drink.", code:"PLAY2" }
  ],
  activities: [
    { text:"Amina booked Strength Circuit", time:"4 min ago" },
    { text:"Payment received for PLS-2408", time:"4 min ago" },
    { text:"Kelvin marked as a no-show", time:"Yesterday" }
  ],
  gymSchedule: createGymSchedule()
};

const defaultState = {
  session: null,
  route: "home",
  adminRoute: "overview",
  bookings: seed.bookings,
  trainerRequests: seed.trainerRequests,
  buddyRequests: seed.buddyRequests,
  padelRankings: seed.padelRankings,
  padelMatches: seed.padelMatches,
  padelEvents: seed.padelEvents,
  padelPromotions: seed.padelPromotions,
  claimedPromotions: [],
  padelFriends: [],
  activities: seed.activities,
  gymSchedule: seed.gymSchedule,
  businessSettings: { ...defaultBusinessSettings },
  remoteBusyPadel: [],
  adminToken: "",
  modal: null,
  bookingDraft: null,
  filters: "All",
  adminReturn: "guest"
};

let state = loadState();

const PulseConfigController = Object.freeze({
  get() { return Object.freeze({ ...state.businessSettings }); },
  update(patch) {
    if(state.session?.type!=="admin") throw new Error("Admin access required");
    const next={...state.businessSettings,...patch};
    if(!Number.isFinite(next.padelCourtPrice) || next.padelCourtPrice<0) throw new Error("Invalid court price");
    if(!Number.isInteger(next.padelDurationMinutes) || next.padelDurationMinutes<30 || next.padelDurationMinutes>480) throw new Error("Booking length must be 30–480 minutes");
    state.businessSettings=next;
    saveState();
    return this.get();
  }
});
window.PulseConfigController=PulseConfigController;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("pulse-demo-state"));
    const loaded = { ...defaultState, ...(saved || {}), modal:null, bookingDraft:null };
    loaded.businessSettings = { ...defaultBusinessSettings, ...(saved?.businessSettings || {}) };
    loaded.remoteBusyPadel = Array.isArray(saved?.remoteBusyPadel) ? saved.remoteBusyPadel : [];
    loaded.adminToken = "";
    loaded.gymSchedule = Array.isArray(saved?.gymSchedule) && saved.gymSchedule.length ? saved.gymSchedule : structuredClone(seed.gymSchedule);
    const preview = new URLSearchParams(location.search).get("view");
    if (preview === "admin") loaded.session = null;
    if (preview === "member") loaded.session = { type:"member" };
    if (preview === "guest") loaded.session = { type:"guest" };
    if (preview === "entry") loaded.session = null;
    return loaded;
  } catch { return structuredClone(defaultState); }
}

function saveState() {
  const safe = { ...state, modal:null, bookingDraft:null, adminToken:"", session:state.session?.type==="admin"?null:state.session };
  localStorage.setItem("pulse-demo-state", JSON.stringify(safe));
}

function money(value) { return new Intl.NumberFormat("en-TZ", { style:"currency", currency:"TZS", maximumFractionDigits:0 }).format(value); }
function prettyDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-TZ", { weekday:"short", day:"numeric", month:"short" }); }
function uid(prefix="PLS") {
  const records = prefix === "TR" ? state.trainerRequests : prefix === "BD" ? state.buddyRequests : state.bookings;
  const floor = prefix === "PLS" ? 2400 : 100;
  const highest = records.reduce((max,item)=>Math.max(max,Number(String(item.id || "").split("-").pop()) || 0),floor);
  if(prefix==="PLS") {
    const stamp=String(Date.now()).slice(-10), random=String(crypto.getRandomValues(new Uint16Array(1))[0]).padStart(5,"0");
    return `PLS-${stamp}${random}`;
  }
  return `${prefix}-${highest + 1}`;
}
function escapeHTML(value="") { return String(value).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
async function sha256(value="") {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));
  return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
function activeBooking(b) { return !["Cancelled","No-show","Fee cleared"].includes(b.status); }
function staffCanCancel(b) { return ["Gym","Stretch"].includes(b.category); }
function courtNumber(service="") { return String(service).match(/court\s*(\d+)/i)?.[1] || ""; }
function timeToMinutes(time="00:00") { const [h,m]=String(time).split(":").map(Number); return h*60+m; }
function durationLabel(minutes=90) { const hours=minutes/60; return Number.isInteger(hours) ? `${hours} ${hours===1?"hour":"hours"}` : `${Math.floor(hours)} hr ${minutes%60} min`; }
function minutesToTime(minutes) { const h=Math.floor(minutes/60)%24,m=minutes%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
function padelSlotsForDate(date) {
  const weekend=[0,6].includes(new Date(`${date}T12:00:00`).getDay());
  const opening=timeToMinutes(weekend?state.businessSettings.weekendOpeningTime:state.businessSettings.weekdayOpeningTime);
  const closing=timeToMinutes(weekend?state.businessSettings.weekendClosingTime:state.businessSettings.weekdayClosingTime);
  const duration=Number(state.businessSettings.padelDurationMinutes);
  const slots=[];
  for(let start=opening;start+duration<=closing;start+=duration) {
    for(let court=1;court<=Number(state.businessSettings.padelCourtCount);court++) slots.push([minutesToTime(start),`Court ${court}`]);
  }
  return slots;
}
function courtIsBooked(service,date,time,ignoreId="",duration=state.businessSettings.padelDurationMinutes) {
  const court=courtNumber(service);
  const start=timeToMinutes(time), end=start+Number(duration || 90);
  const records=[...state.bookings,...(state.remoteBusyPadel || [])];
  return Boolean(court && records.some(b=>{
    if(b.id===ignoreId || b.category!=="Padel" || !activeBooking(b) || courtNumber(b.service)!==court || b.date!==date) return false;
    const bookedStart=timeToMinutes(b.time), bookedEnd=bookedStart+Number(b.durationMinutes || 90);
    return start < bookedEnd && bookedStart < end;
  }));
}

function setState(patch, persist=true) {
  state = { ...state, ...patch };
  if (persist) saveState();
  render();
}

function toast(title, detail="") {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<strong>${escapeHTML(title)}</strong><span>${escapeHTML(detail)}</span>`;
  root.append(el);
  setTimeout(() => el.remove(), 3300);
}

function logo(showSub=true) {
  return `<div class="brand"><img class="pulse-logo" src="assets/pulse-logo.png" alt="Pulse">${showSub ? `<small>GYMNASIUM</small>` : ""}</div>`;
}

function entryView() {
  return `<main class="entry">
    <section class="entry-visual">
      <div class="entry-logo"><img class="pulse-logo" src="assets/pulse-logo.png" alt="Pulse"><span>GYMNASIUM</span></div>
      <div class="entry-copy">
        <div class="eyebrow">Dar es Salaam’s elite gym</div>
        <h1>Train like<br>a champion.</h1>
        <p>Progressive training. Elite equipment. Expert trainers. One place to book every Pulse experience.</p>
      </div>
      <div class="entry-tags"><span class="entry-tag">Gym</span><span class="entry-tag">Stretch</span><span class="entry-tag">Padel</span></div>
    </section>
    <section class="entry-panel">
      <div class="auth-card">
        <div class="eyebrow">Welcome to Pulse</div>
        <h2>How would you like to continue?</h2>
        <p>Members can manage memberships and trainers. Guests can still book classes, stretch sessions, and padel courts.</p>
        <div class="auth-choice">
          <button class="choice-btn" data-action="open-signin"><span class="choice-icon">P</span><span><strong>Sign in as a member</strong><span>Membership, classes, trainers and more</span></span></button>
          <button class="choice-btn" data-action="continue-guest"><span class="choice-icon">↗</span><span><strong>Continue as a guest</strong><span>No account needed to make a booking</span></span></button>
          <button class="choice-btn admin-choice" data-action="open-admin"><span class="choice-icon">A</span><span><strong>Admin portal</strong><span>Staff sign-in for bookings and customers</span></span></button>
        </div>
        <p class="fine-print">By continuing, you agree to Pulse booking and cancellation policies.</p>
      </div>
    </section>
  </main>`;
}

function customerHeader() {
  const items = [["home","Home"],["gym","Gym"],["stretch","Stretch"],["padel","Padel"]];
  return `<header class="topbar">
    ${logo()}
    <nav class="desktop-nav" aria-label="Primary">${items.map(([r,l])=>`<button class="nav-item ${state.route===r?"active":""}" data-route="${r}">${l}</button>`).join("")}</nav>
    <div class="nav-actions">
      <button class="icon-btn" data-action="notifications" aria-label="Notifications">${icons.bell}</button>
      <button class="btn btn-ghost" data-action="profile"><span class="user-name">${state.session?.type === "member" ? "Tanisha" : "Guest"}</span> ${icons.user}</button>
    </div>
  </header>`;
}

function bottomNav() {
  return `<nav class="bottom-nav">${[["home","Home"],["gym","Gym"],["stretch","Stretch"],["padel","Padel"]].map(([r,l])=>`<button class="${state.route===r?"active":""}" data-route="${r}">${l}</button>`).join("")}</nav>`;
}

function customerView() {
  let content = state.route === "home" ? homeView() : state.route === "gym" ? gymView() : state.route === "stretch" ? stretchView() : padelView();
  return `<div class="shell">${customerHeader()}${content}${bottomNav()}</div>${modalView()}`;
}

function homeView() {
  const next = state.bookings.filter(b => !["Cancelled","No-show"].includes(b.status)).slice(-3).reverse();
  return `<main class="page">
    <section class="welcome-strip">
      <div><div class="eyebrow">${state.session?.type === "member" ? "Member home" : "Guest access"}</div><h1>${state.session?.type === "member" ? "Good morning, Tanisha." : "Your next move starts here."}</h1><p>Choose a service or pick up where you left off.</p></div>
      <span class="pill"><span class="dot"></span> Pulse Masaki · Open until 22:00</span>
    </section>
    <section class="service-grid" aria-label="Pulse services">
      ${serviceCard("gym","Gym at Pulse","Classes, day passes and personal training.")}
      ${serviceCard("stretch","Stretch Out Pulse","Pilates Reformer and premium mat classes.")}
      ${serviceCard("padel","Padel Up Pulse","Reserve courts, join open matches, and play.")}
    </section>
    <section class="quick-grid">
      <div class="panel"><div class="panel-head"><div><h3>Upcoming bookings</h3><span class="panel-sub">Confirmation emails are ready at check-in.</span></div><button class="btn btn-ghost btn-sm" data-action="view-bookings">View all</button></div>
        <div>${next.length ? next.map(bookingMini).join("") : `<div class="empty">No upcoming bookings yet.</div>`}</div>
      </div>
      <div class="panel"><div class="panel-head"><div><h3>${state.session?.type === "member" ? "Membership" : "Quick booking"}</h3><span class="panel-sub">${state.session?.type === "member" ? "Everything looks good." : "An account is optional."}</span></div></div>
        ${state.session?.type === "member" ? `<div class="summary-box"><div class="summary-row"><span>Pulse Unlimited</span><strong>Active</strong></div><div class="summary-row"><span>Renews</span><strong>28 Oct 2026</strong></div><div class="summary-row"><span>OkayFit sync</span><strong>Ready</strong></div></div><button class="btn btn-primary" data-action="renew">Renew membership</button>` : `<p class="panel-sub">Book with an email and phone number, then show your unique booking code when you arrive.</p><button class="btn btn-primary" data-action="quick-book">Book now</button>`}
      </div>
    </section>
  </main>`;
}

function serviceCard(route, title, desc) {
  return `<button class="service-card ${route}" data-route="${route}">
    ${route === "padel" ? `<img class="padel-lockup" src="assets/padel-logo.png" alt="Padel at Pulse">` : `<span class="pill" style="width:max-content;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:white">Explore</span>`}
    <div><h2>${title}</h2><p>${desc}</p></div><span class="arrow">${icons.arrow}</span>
  </button>`;
}

function bookingMini(b) {
  const d = new Date(`${b.date}T12:00:00`);
  return `<div class="booking-mini"><span class="date-chip">${d.getDate()}<small>${d.toLocaleDateString("en-TZ",{month:"short"})}</small></span><div><strong>${escapeHTML(b.service)}</strong><span>${b.time} · ${b.id}</span></div><span class="status ${b.status.toLowerCase().replace("-","")}">${b.status}</span></div>`;
}

function categoryHero(kind, kicker, title, body) {
  return `<section class="category-hero ${kind}"><div>${kind === "padel" ? `<img class="padel-lockup hero-lockup" src="assets/padel-logo.png" alt="Padel at Pulse">` : ""}<div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${body}</p></div></section>`;
}

const stretchSlots = [["08:00","Reformer Foundations","8 spots"],["10:00","Reformer Sculpt","5 spots"],["17:00","Premium Mat Pilates","8 spots"],["18:30","Reformer Flow","7 spots"]];

function schedule(slots, category) {
  return `<section class="schedule"><div class="schedule-head"><div><div class="eyebrow">Friday, 16 October</div><h2>Available today</h2></div><button class="btn btn-ghost btn-sm" data-action="calendar" data-category="${category}">Full calendar</button></div>
  <div class="slot-grid">${slots.map(s=>{ const booked=category==="Padel" && courtIsBooked(s[1],"2026-10-16",s[0]); const detail=category==="Padel"&&!booked?`${durationLabel(state.businessSettings.padelDurationMinutes)} · ${money(state.businessSettings.padelCourtPrice)}`:(booked?"Booked":s[2]); return `<button class="slot ${booked?"unavailable":""}" data-action="book" data-category="${category}" data-service="${s[1]}" data-time="${s[0]}" data-date="2026-10-16" data-amount="${category==="Padel"?state.businessSettings.padelCourtPrice:""}" data-duration="${category==="Padel"?state.businessSettings.padelDurationMinutes:""}" ${booked?"disabled":""}><div class="slot-time">${s[0]}</div><div class="slot-meta">${s[1]}</div><span class="spots">${detail}</span></button>`; }).join("")}</div></section>`;
}

function gymScheduleSection() {
  const classes=state.gymSchedule.filter(item=>item.date==="2026-10-16"&&item.active).sort((a,b)=>a.time.localeCompare(b.time));
  return `<section class="schedule"><div class="schedule-head"><div><div class="eyebrow">Friday, 16 October</div><h2>Pulse classes today</h2></div><button class="btn btn-ghost btn-sm" data-action="calendar" data-category="Gym">Weekly schedule</button></div><div class="slot-grid">${classes.length?classes.map(item=>gymClassButton(item)).join(""):`<div class="empty">No Pulse classes are scheduled today.</div>`}</div></section>`;
}

function gymClassButton(item) {
  const booked=state.bookings.filter(b=>b.category==="Gym"&&b.classId===item.id&&activeBooking(b)).length;
  const remaining=Math.max(0,Number(item.capacity)-booked);
  return `<button class="slot ${!remaining?"unavailable":""}" data-action="book" data-category="Gym" data-service="${escapeHTML(item.name)}" data-class-id="${item.id}" data-time="${item.time}" data-date="${item.date}" data-amount="${item.price}" ${!remaining?"disabled":""}><div class="slot-time">${item.time}–${item.endTime || ""}</div><div class="slot-meta">${escapeHTML(item.name)}</div><span class="spots">${escapeHTML(item.trainer)} · ${remaining} spots</span></button>`;
}

function gymView() {
  return `<main class="page">${categoryHero("gym","Build your strength","Gym at Pulse","Book a class, work with a trainer, or renew your membership—all in one place.")}
    <section class="action-grid">
      ${actionCard("◫","Book a class","Reserve your place in the official Pulse weekly schedule.","calendar","Gym")}
      ${actionCard("◎","Find a trainer","Tell us your goals or choose a trainer directly.","trainers")}
      ${actionCard("↻","Membership","Renew your plan through Selcom.","renew")}
      ${actionCard("◇","Buy a day pass","One full day of Pulse access.","book","Gym","Gym day pass")}
      ${state.session?.type === "member" ? actionCard("◍","Preorder from the Juice Bar","Choose a drink and pickup time so it is ready after your workout.","juice") : ""}
      ${actionCard("＋","What we offer","Equipment, facilities and services.","offerings")}
    </section>${gymScheduleSection()}
  </main>`;
}

function stretchView() {
  return `<main class="page">${categoryHero("stretch","Precision movement & recovery","Stretch Out Pulse","Reserve premium Pilates Reformer sessions or refined mat classes in a dedicated studio experience.")}
    <section class="action-grid">
      ${actionCard("◒","Pilates Reformer","Book a place on a Reformer class schedule.","calendar","Stretch")}
      ${actionCard("◉","Premium mat classes","Reserve a premium guided mat Pilates class.","book","Stretch","Premium Mat Pilates")}
      ${actionCard("i","Cancellation policy","Notify us at least 24 hours before your session.","policy")}
    </section>${schedule(stretchSlots,"Stretch")}
  </main>`;
}

function padelView() {
  const todaySlots=padelSlotsForDate("2026-10-16").slice(0,6).map(s=>[s[0],s[1],"Available"]);
  return `<main class="page">${categoryHero("padel","No membership needed","Padel Up Pulse","Choose a court, enter the open-match lobby, or find a player at your level.")}
    <section class="padel-feature-head"><div><div class="eyebrow">Play · connect · compete</div><h2>Your Padel club</h2></div><span class="pill">Live club tools</span></section><section class="action-grid padel-actions">
      ${actionCard("▦","Book a court","Choose an available court and time slot.","book","Padel","Padel Court")}
      ${actionCard("⌁","How check-in works","Show your emailed booking code at reception.","checkin-info")}
      ${actionCard("♟","Players & community","Find partners at your level, post an open match, and add friends.","buddy")}
      ${actionCard("↗","Rankings & match history","Track results, points, wins, and competitive progress.","padel-rankings")}
      ${actionCard("🏆","Tournaments & leagues","Register for club events and follow brackets and schedules.","padel-events")}
      ${actionCard("%","Promotions & discounts","Claim member offers for courts, events, and gear.","padel-promotions")}
      ${actionCard("!","No-show policy","Unpaid no-shows must clear their fee before playing again.","policy")}
    </section>${schedule(todaySlots,"Padel")}
  </main>`;
}

function actionCard(icon, title, desc, action, category="", service="") {
  return `<button class="action-card" data-action="${action}" data-category="${category}" data-service="${service}"><span class="action-icon">${icon}</span><div><h3>${title}</h3><p>${desc}</p></div><span>${icons.arrow}</span></button>`;
}

function signInModal() {
  return modalShell("Member sign in", `<div class="steps"><span class="step on"></span><span class="step"></span></div><form id="signin-form"><div class="form-grid"><div class="field full"><label for="email">Email or member ID</label><input id="email" name="email" type="email" value="member@pulse.co.tz" required></div><div class="field full"><label for="password">Password</label><input id="password" name="password" type="password" value="pulsefitness" required></div></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Sign in</button></div><p class="fine-print">Demo access is pre-filled. OkayFit authentication will connect here.</p></form>`);
}

function adminSignInModal() {
  return modalShell("Admin portal", `<form id="admin-signin-form"><div class="form-grid"><div class="field full"><label for="admin-email">Admin email</label><input id="admin-email" name="email" type="email" autocomplete="username" required placeholder="admin@admin.com"></div><div class="field full"><label for="admin-password">Password</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required placeholder="Password"></div></div><p id="admin-login-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Sign in to admin</button></div><p class="fine-print">Credentials are verified by the private Pulse Google service. Passwords are never stored in this website.</p></form>`);
}

function bookingModal(draft = {}) {
  const firstGymClass=state.gymSchedule.find(item=>item.active);
  const baseCategory=draft.category || "Gym";
  const defaultService=baseCategory==="Padel"?"Court 1":baseCategory==="Stretch"?"Reformer Foundations":firstGymClass?.name || "Pulse class";
  const defaultAmount=baseCategory==="Padel"?state.businessSettings.padelCourtPrice:baseCategory==="Stretch"?35000:firstGymClass?.price || 25000;
  const d = { category:baseCategory, service:defaultService, classId:baseCategory==="Gym"?firstGymClass?.id:"", time:firstGymClass?.time || "07:00", date:firstGymClass?.date || "2026-10-16", amount:defaultAmount, durationMinutes:baseCategory==="Padel"?state.businessSettings.padelDurationMinutes:null, ...draft };
  d.date=d.date || firstGymClass?.date || "2026-10-16";
  d.time=d.time || firstGymClass?.time || "07:00";
  d.amount=Number.isFinite(Number(d.amount))?Number(d.amount):defaultAmount;
  if(d.category==="Padel") d.durationMinutes=Number(d.durationMinutes || state.businessSettings.padelDurationMinutes);
  state.bookingDraft = d;
  const services = d.category === "Padel"
    ? [courtNumber(d.service)?d.service:"Court 1",...Array.from({length:Number(state.businessSettings.padelCourtCount)},(_,index)=>`Court ${index+1}`)]
    : d.category === "Stretch"
      ? [d.service]
      : [d.service];
  const bookingTimes=d.category==="Padel"
    ? [...new Set(padelSlotsForDate(d.date).filter(slot=>!courtIsBooked(courtNumber(d.service)?d.service:"Court 1",d.date,slot[0],"",d.durationMinutes)).map(slot=>slot[0]))]
    : [d.time,"08:00","10:00","12:30","17:00","18:00","19:00"].filter((v,i,a)=>a.indexOf(v)===i);
  const padelSummary=d.category==="Padel"?`<div class="summary-row"><span>Court time</span><strong>${durationLabel(d.durationMinutes)}</strong></div><div class="summary-row"><span>Four-player split (25%)</span><strong>${money(d.amount/4)} each</strong></div>`:"";
  return modalShell("Make a booking", `<div class="steps"><span class="step on"></span><span class="step on"></span><span class="step"></span></div>
    <form id="booking-form"><div class="form-grid">
      <div class="field"><label>Service</label><select name="service">${services.filter((v,i,a)=>a.indexOf(v)===i).map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("")}</select></div>
      <div class="field"><label>Date</label><input name="date" type="date" value="${d.date}" min="2026-10-15" required></div>
      <div class="field"><label>Time</label><select name="time">${bookingTimes.map(v=>`<option ${v===d.time?"selected":""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Full name</label><input name="name" value="${state.session?.type === "member" ? "Tanisha Hassija" : ""}" required placeholder="Your name"></div>
      <div class="field"><label>Email</label><input name="email" type="email" value="${state.session?.type === "member" ? "member@pulse.co.tz" : ""}" required placeholder="you@example.com"></div>
      <div class="field"><label>Phone number</label><input name="phone" type="tel" required placeholder="+255 7XX XXX XXX"></div>
      <div class="field full"><label>Payment</label><input type="hidden" name="payment" value="Paid in app"><div class="segmented"><button type="button" class="segment selected" data-payment="Paid in app"><strong>Pay in the app</strong><span>Secure Selcom checkout</span></button><button type="button" class="segment" data-payment="Pay on arrival"><strong>Pay on arrival</strong><span>Settle at reception</span></button></div></div>
    </div><p class="form-error" role="alert">${escapeHTML(d.error || "")}</p><div class="summary-box"><div class="summary-row"><span>Booking estimate</span><strong>${money(d.amount)}</strong></div>${padelSummary}<div class="summary-row"><span>Cancellation</span><strong>24 hours’ notice</strong></div></div>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Continue</button></div></form>`);
}

function paymentModal(d) {
  const split=d.category==="Padel"?`<div class="summary-row"><span>Four-player split (25%)</span><strong>${money(Number(d.amount)/4)} each</strong></div>`:"";
  return modalShell("Selcom secure checkout", `<div class="steps"><span class="step on"></span><span class="step on"></span><span class="step on"></span></div>
    <div class="summary-box"><div class="summary-row"><span>${escapeHTML(d.service)}</span><strong>${money(d.amount)}</strong></div>${split}<div class="summary-row"><span>${prettyDate(d.date)} at ${d.time}</span><strong>${escapeHTML(d.name)}</strong></div></div>
    <form id="payment-form"><input type="hidden" name="method" value="Mobile money"><div class="eyebrow" style="margin-bottom:10px">Select payment method</div><div class="payment-methods"><button type="button" class="payment-card selected" data-method="Mobile money"><span class="payment-logo">MOMO</span><span><strong>Mobile money</strong><small>M-Pesa, Airtel Money, Mixx by Yas</small></span></button><button type="button" class="payment-card" data-method="Card"><span class="payment-logo">CARD</span><span><strong>Debit or credit card</strong><small>Visa and Mastercard via Selcom</small></span></button></div>
    <div class="form-grid" style="margin-top:16px"><div class="field full"><label>Payment phone number</label><input name="paymentPhone" type="tel" value="${escapeHTML(d.phone)}" required placeholder="+255 7XX XXX XXX"></div></div>
    <p class="fine-print">Prototype checkout. The production button will create a Selcom order and verify its webhook before confirming.</p>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="back-booking">Back</button><button class="btn btn-blue">Pay ${money(d.amount)}</button></div></form>`);
}

function calendarModal(category) {
  const dates = Array.from({length:7},(_,i)=>{ const d=new Date("2026-10-16T12:00:00"); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); });
  if(category==="Gym") return modalShell("Pulse weekly class schedule", `<p class="panel-sub">Official class schedule from Pulse. Choose a class to reserve your place.</p><div class="calendar-list">${dates.map(date=>{const classes=state.gymSchedule.filter(item=>item.date===date&&item.active).sort((a,b)=>a.time.localeCompare(b.time));return `<section class="calendar-day"><strong>${prettyDate(date)}</strong>${classes.length?`<div class="slot-grid">${classes.map(gymClassButton).join("")}</div>`:`<div class="empty">No classes scheduled.</div>`}</section>`}).join("")}</div>`, true);
  return modalShell(category==="Padel"?"Padel Up court calendar":"Stretch Out schedule", `<p class="panel-sub">Choose a date and available time.${category==="Padel"?` Grid blocks are generated at ${durationLabel(state.businessSettings.padelDurationMinutes)} each.`:""}</p><div class="calendar-list">${dates.map(date=>{const slots=category==="Padel"?padelSlotsForDate(date):stretchSlots;return `<section class="calendar-day"><strong>${prettyDate(date)}</strong><div class="slot-grid">${slots.map(s=>{ const booked=category==="Padel" && courtIsBooked(s[1],date,s[0]); const amount=category==="Padel"?state.businessSettings.padelCourtPrice:30000; return `<button class="slot ${booked?"unavailable":""}" data-action="book" data-category="${category}" data-service="${escapeHTML(s[1])}" data-time="${s[0]}" data-date="${date}" data-amount="${amount}" data-duration="${category==="Padel"?state.businessSettings.padelDurationMinutes:""}" ${booked?"disabled":""}><span class="slot-time">${s[0]}${category==="Padel"?`–${minutesToTime(timeToMinutes(s[0])+Number(state.businessSettings.padelDurationMinutes))}`:""}</span><span class="slot-meta">${escapeHTML(s[1])}</span><span class="spots">${booked?"Booked":category==="Padel"?money(amount):"Available"}</span></button>`; }).join("")}</div></section>`}).join("")}</div>`, true);
}

function bookingsModal() {
  const rows = state.bookings.slice().reverse();
  return modalShell("Your bookings", rows.length ? `<div class="customer-bookings">${rows.map(b=>`<article class="customer-booking"><div><strong>${escapeHTML(b.service)}</strong><span>${prettyDate(b.date)} at ${escapeHTML(b.time)} · ${b.id}</span><span>${escapeHTML(b.paymentStatus)}</span></div><span class="status ${b.status.toLowerCase().replace(/[^a-z]/g,"")}">${escapeHTML(b.status)}</span>${b.status === "Confirmed" ? `<button class="btn btn-danger btn-sm" data-customer-action="cancel" data-id="${b.id}">Cancel booking</button>` : ""}</article>`).join("")}</div>` : `<div class="empty">No bookings yet.</div>`, true);
}

function manageBookingModal(booking) {
  if (!booking) return infoModal("Booking not found", "This booking is no longer available.");
  const statuses=["Confirmed","Checked in",...(staffCanCancel(booking)?["Cancelled"]:[]),"No-show","Fee cleared"];
  const paymentStatuses=["Paid","Due","Paid at reception","Refunded","Nothing due","No-show fee due"];
  return modalShell(`Manage ${booking.id}`, `<form id="manage-booking-form"><input type="hidden" name="id" value="${escapeHTML(booking.id)}"><div class="summary-box"><div class="summary-row"><span>Customer</span><strong>${escapeHTML(booking.name)}</strong></div><div class="summary-row"><span>Contact</span><strong>${escapeHTML(booking.phone)}</strong></div></div><div class="form-grid"><div class="field full"><label>Service</label><input name="service" value="${escapeHTML(booking.service)}" required></div><div class="field"><label>Date</label><input name="date" type="date" value="${booking.date}" required></div><div class="field"><label>Time</label><input name="time" type="time" value="${booking.time}" required></div><div class="field"><label>Status</label><select name="status">${statuses.map(v=>`<option ${v===booking.status?"selected":""}>${v}</option>`).join("")}</select></div><div class="field"><label>Payment status</label><select name="paymentStatus">${paymentStatuses.map(v=>`<option ${v===booking.paymentStatus?"selected":""}>${v}</option>`).join("")}</select></div></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Save changes</button></div></form>`);
}

function buddyModal() {
  return modalShell("Padel players & community", `<p class="panel-sub">Post an open match, find someone at your level, text them, or add them to your Pulse friends.</p><div class="summary-box"><div class="summary-row"><span>Current court session</span><strong>${money(state.businessSettings.padelCourtPrice)} · ${durationLabel(state.businessSettings.padelDurationMinutes)}</strong></div><div class="summary-row"><span>Four-player split (25%)</span><strong>${money(state.businessSettings.padelCourtPrice/4)} each</strong></div></div><form id="buddy-form"><div class="form-grid"><div class="field"><label>Name</label><input name="name" value="${state.session?.type==="member"?"Tanisha Hassija":""}" required placeholder="Your name"></div><div class="field"><label>Phone</label><input name="phone" type="tel" required placeholder="+255 7XX XXX XXX"></div><div class="field"><label>Date</label><input name="date" type="date" min="2026-10-15" value="2026-10-18" required></div><div class="field"><label>Time</label><select name="time"><option>08:00</option><option>10:00</option><option>16:00</option><option>18:00</option><option>20:00</option></select></div><div class="field full"><label>Playing level</label><select name="level"><option>Beginner</option><option selected>Intermediate</option><option>Advanced</option><option>Any level</option></select></div></div><div class="form-actions"><button class="btn btn-primary">Post open match</button></div></form><div class="buddy-list"><div class="panel-head"><div><h3>Players looking for a buddy</h3><span class="panel-sub">Open matches in the local Pulse community</span></div></div>${state.buddyRequests.map(r=>`<article class="buddy-row"><div><strong>${escapeHTML(r.name)}</strong><span>${escapeHTML(r.level)} · ${prettyDate(r.date)} at ${r.time}</span></div><div class="row-actions"><button class="btn btn-ghost btn-sm" data-buddy-friend="${r.id}">${state.padelFriends.includes(r.id)?"✓ Friend":"Add friend"}</button><button class="btn btn-primary btn-sm" data-buddy-text="${r.id}">Text ${escapeHTML(r.name)}</button></div></article>`).join("")}</div>`, true);
}

function padelRankingsModal() {
  const rankings=[...state.padelRankings].sort((a,b)=>b.points-a.points);
  return modalShell("Padel rankings & match history", `<div class="ranking-grid"><section><div class="panel-head"><div><h3>Pulse ladder</h3><span class="panel-sub">Points update when match results are recorded.</span></div></div><div class="leaderboard">${rankings.map((r,i)=>`<div class="rank-row ${r.name==="Tanisha Hassija"?"me":""}"><span class="rank-number">${i+1}</span><div><strong>${escapeHTML(r.name)}</strong><span>${escapeHTML(r.level)} · ${r.won} wins / ${r.played} played</span></div><b>${r.points}</b></div>`).join("")}</div></section><section><div class="panel-head"><div><h3>My match history</h3><span class="panel-sub">Most recent results</span></div></div><div class="match-history">${state.padelMatches.map(m=>`<div class="match-row"><span class="status ${m.result==="Won"?"confirmed":"cancelled"}">${m.result}</span><div><strong>vs ${escapeHTML(m.opponent)}</strong><span>${prettyDate(m.date)} · ${escapeHTML(m.score)}</span></div><b>${m.points>0?"+":""}${m.points}</b></div>`).join("")}</div>${state.session?.type==="member"?`<form id="match-result-form"><h3>Record a result</h3><div class="form-grid"><div class="field"><label>Opponent</label><select name="opponent">${rankings.filter(r=>r.name!=="Tanisha Hassija").map(r=>`<option>${escapeHTML(r.name)}</option>`).join("")}</select></div><div class="field"><label>Date</label><input name="date" type="date" value="2026-10-15" required></div><div class="field"><label>Result</label><select name="result"><option>Won</option><option>Lost</option></select></div><div class="field"><label>Score</label><input name="score" required placeholder="6–4, 6–3"></div></div><div class="form-actions"><button class="btn btn-primary">Save match</button></div></form>`:`<p class="fine-print">Sign in as a member to record match results.</p>`}</section></div>`, true);
}

function padelPromotionsModal() {
  return modalShell("Padel promotions & discounts", `<p class="panel-sub">Member offers can be claimed here and applied automatically where eligible.</p><div class="promo-grid">${state.padelPromotions.map(p=>{const claimed=state.claimedPromotions.includes(p.id);return `<article class="promo-card"><span class="promo-code">${escapeHTML(p.code)}</span><h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.detail)}</p><button class="btn ${claimed?"btn-ghost":"btn-primary"}" data-promo="${p.id}" ${claimed?"disabled":""}>${claimed?"✓ Claimed":"Claim offer"}</button></article>`}).join("")}</div>${state.session?.type!=="member"?`<p class="fine-print">Offers are visible to everyone, but claiming them requires a Pulse member sign-in.</p>`:""}`, true);
}

function padelEventsModal() {
  return modalShell("Padel championships & events", `<p class="panel-sub">Register for Pulse competitions and follow the live event agenda.</p><div class="event-list">${state.padelEvents.map(e=>{const joined=e.registered.includes("Tanisha Hassija");return `<article class="event-card"><div class="event-date"><strong>${new Date(`${e.date}T12:00:00`).getDate()}</strong><span>${new Date(`${e.date}T12:00:00`).toLocaleDateString("en-TZ",{month:"short"})}</span></div><div class="event-main"><div class="eyebrow">${escapeHTML(e.format)}</div><h3>${escapeHTML(e.title)}</h3><p>${prettyDate(e.date)} at ${e.time} · ${e.registered.length}/${e.capacity} registered</p><div class="event-bracket">${e.bracket.map((round,i)=>`<span><b>${i+1}</b>${escapeHTML(round)}</span>`).join("")}</div></div><button class="btn ${joined?"btn-ghost":"btn-primary"}" data-event-register="${e.id}" ${joined?"disabled":""}>${joined?"✓ Registered":"Register"}</button></article>`}).join("")}</div>`, true);
}

function eventRegisterModal(event) {
  return modalShell(`Register · ${event.title}`, `<form id="event-register-form"><input type="hidden" name="eventId" value="${event.id}"><div class="summary-box"><div class="summary-row"><span>${escapeHTML(event.format)}</span><strong>${prettyDate(event.date)}</strong></div><div class="summary-row"><span>Start time</span><strong>${event.time}</strong></div></div><div class="form-grid"><div class="field"><label>Player name</label><input name="name" value="${state.session?.type==="member"?"Tanisha Hassija":""}" required></div><div class="field"><label>Email</label><input name="email" type="email" value="${state.session?.type==="member"?"member@pulse.co.tz":""}" required placeholder="you@example.com"></div><div class="field full"><label>Playing level</label><select name="level"><option>Beginner</option><option selected>Intermediate</option><option>Advanced</option></select></div></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="padel-events">Back</button><button class="btn btn-primary">Confirm registration</button></div></form>`);
}

function juiceModal() {
  return modalShell("Preorder from the Juice Bar", `<p class="panel-sub">Members only. Pay through the Selcom demo and collect your drink after your workout.</p><form id="juice-form"><div class="form-grid"><div class="field full"><label>Drink</label><select name="drink"><option value="Green Machine|12000">Green Machine — ${money(12000)}</option><option value="Berry Recovery|14000">Berry Recovery — ${money(14000)}</option><option value="Protein Power|16000">Protein Power — ${money(16000)}</option><option value="Cold-Pressed Orange|10000">Cold-Pressed Orange — ${money(10000)}</option></select></div><div class="field"><label>Pickup date</label><input name="date" type="date" min="2026-10-15" value="2026-10-16" required></div><div class="field"><label>Ready by</label><select name="time"><option>08:00</option><option>10:00</option><option>12:00</option><option>17:00</option><option>19:00</option><option>21:00</option></select></div><div class="field full"><label>Notes</label><textarea name="notes" placeholder="For example: no ice, extra ginger"></textarea></div><div class="field full"><label>Payment phone number</label><input name="phone" type="tel" required placeholder="+255 7XX XXX XXX"></div></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Continue to Selcom</button></div></form>`, true);
}

function successModal(b) {
  const delivery = b.emailDelivery === "sent"
    ? `Confirmation email requested for <strong>${escapeHTML(b.email)}</strong>.`
    : b.emailDelivery === "failed"
      ? `Your booking is saved, but the confirmation email could not be requested. Please keep this booking number.`
      : `Your booking is saved. Email delivery will activate when the Pulse mail service is connected.`;
  return modalShell("Booking confirmed", `<div class="success-view"><span class="success-icon">✓</span><h2>You’re booked.</h2><p>${delivery} Show this booking number at reception.</p><span class="booking-code">${b.id}</span><p>${escapeHTML(b.service)} · ${prettyDate(b.date)} at ${b.time}</p><div class="form-actions" style="justify-content:center"><button class="btn btn-ghost" data-action="preview-email" data-id="${b.id}">Preview email</button><button class="btn btn-primary" data-action="finish-booking">Back to Pulse</button></div></div>`);
}

function emailPreviewModal(b) {
  if (!b) return infoModal("Email preview", "The booking could not be found.");
  return modalShell("Confirmation email preview", `<article class="email-preview"><img src="assets/pulse-logo.png" alt="Pulse"><div class="email-preview-kicker">BOOKING CONFIRMED</div><h3>You’re all set, ${escapeHTML(String(b.name).split(" ")[0])}.</h3><p>Your Pulse reservation is confirmed. Keep the check-in number below and show it at reception when you arrive.</p><div class="email-booking-code">${escapeHTML(b.id)}</div><dl><div><dt>Experience</dt><dd>${escapeHTML(b.service)}</dd></div><div><dt>Date</dt><dd>${prettyDate(b.date)}</dd></div><div><dt>Time</dt><dd>${escapeHTML(b.time)}${b.durationMinutes?` · ${durationLabel(b.durationMinutes)}`:""}</dd></div><div><dt>Payment</dt><dd>${escapeHTML(b.paymentStatus)}</dd></div></dl><p class="email-policy">Stretch and Padel cancellations require at least 24 hours’ notice.</p></article><div class="form-actions"><button class="btn btn-primary" data-action="close-modal">Done</button></div>`);
}

function trainersModal() {
  const trainers = [
    ["Baraka M.","Strength & conditioning","Muscle gain","Performance","Rehab"],
    ["Joy K.","Mobility & sustainable fitness","Mobility","Beginners","Nutrition"],
    ["Moses N.","Fat loss & athletic training","Fat loss","Boxing","Endurance"]
  ];
  return modalShell("Meet our trainers", `<p class="panel-sub">Choose a trainer or complete the matching form and we’ll find the right fit.</p><div class="trainers">${trainers.map((t,i)=>`<article class="trainer-card"><div class="trainer-art trainer-${i+1}"></div><div class="trainer-info"><h3>${t[0]}</h3><p>${t[1]}</p><div class="tag-row">${t.slice(2).map(x=>`<span class="tag">${x}</span>`).join("")}</div><button class="btn btn-primary btn-sm" data-action="trainer-form" data-trainer="${t[0]}">Request meeting</button></div></article>`).join("")}</div><div class="form-actions"><button class="btn btn-accent" data-action="trainer-form" data-trainer="Match me">Match me with a trainer</button></div>`, true);
}

function trainerFormModal(trainer) {
  return modalShell(trainer === "Match me" ? "Find my trainer" : `Meet ${trainer}`, `<form id="trainer-form"><input type="hidden" name="trainer" value="${escapeHTML(trainer)}"><div class="form-grid"><div class="field"><label>Full name</label><input name="name" value="${state.session?.type === "member" ? "Tanisha Hassija" : ""}" required></div><div class="field"><label>Email</label><input name="email" type="email" value="${state.session?.type === "member" ? "member@pulse.co.tz" : ""}" required placeholder="you@example.com"></div><div class="field"><label>Phone number</label><input name="phone" type="tel" required placeholder="+255 7XX XXX XXX"></div><div class="field full"><label>What would you like help with?</label><select name="support"><option>Training plan</option><option>Diet plan</option><option>Training and diet plan</option><option>General fitness consultation</option></select></div><div class="field full"><label>Tell us about your fitness goals</label><textarea name="goal" required placeholder="For example: I want to build strength, improve my energy, and create a realistic meal plan."></textarea></div><div class="field"><label>Preferred date</label><input name="date" type="date" value="2026-10-17" min="2026-10-15" required></div><div class="field"><label>Preferred time</label><select name="time"><option>09:00</option><option>12:00</option><option>16:00</option><option>18:00</option></select></div></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="trainers">Back</button><button class="btn btn-primary">Send request</button></div></form>`);
}

function profileModal() {
  const isMember = state.session?.type === "member";
  return modalShell(isMember ? "Member profile" : "Guest session", `<div class="summary-box"><div class="summary-row"><span>Access</span><strong>${isMember ? "Pulse member" : "Guest"}</strong></div>${isMember ? `<div class="summary-row"><span>Membership</span><strong>Active</strong></div><div class="summary-row"><span>OkayFit</span><strong>Integration ready</strong></div>` : ""}<div class="summary-row"><span>Bookings on this device</span><strong>${state.bookings.length}</strong></div></div><div class="form-actions"><button class="btn btn-danger" data-action="signout">Sign out</button>${!isMember ? `<button class="btn btn-primary" data-action="switch-member">Member sign in</button>` : ""}<button class="btn btn-ghost" data-action="open-admin">Open staff portal</button></div>`);
}

function infoModal(title, body) { return modalShell(title, `<p style="line-height:1.7;color:var(--muted)">${body}</p><div class="form-actions"><button class="btn btn-primary" data-action="close-modal">Got it</button></div>`); }
function modalShell(title, body, wide=false) { return `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><section class="modal ${wide?"wide":""}"><header class="modal-head"><h2>${title}</h2><button class="close-btn" data-action="close-modal" aria-label="Close">×</button></header><div class="modal-body">${body}</div></section></div>`; }

function modalView() {
  if (!state.modal) return "";
  const { type, data } = state.modal;
  if (type === "signin") return signInModal();
  if (type === "admin-signin") return adminSignInModal();
  if (type === "booking") return bookingModal(data);
  if (type === "payment") return paymentModal(data);
  if (type === "success") return successModal(data);
  if (type === "email-preview") return emailPreviewModal(state.bookings.find(b=>b.id===data.id));
  if (type === "calendar") return calendarModal(data.category);
  if (type === "bookings") return bookingsModal();
  if (type === "manage-booking") return manageBookingModal(state.bookings.find(b=>b.id===data.id));
  if (type === "gym-class") return gymClassModal(state.gymSchedule.find(item=>item.id===data?.id));
  if (type === "delete-gym-class") return deleteGymClassModal(state.gymSchedule.find(item=>item.id===data?.id));
  if (type === "buddy") return buddyModal();
  if (type === "padel-rankings") return padelRankingsModal();
  if (type === "padel-promotions") return padelPromotionsModal();
  if (type === "padel-events") return padelEventsModal();
  if (type === "event-register") return eventRegisterModal(state.padelEvents.find(e=>e.id===data.id));
  if (type === "juice") return juiceModal();
  if (type === "trainers") return trainersModal();
  if (type === "trainer-form") return trainerFormModal(data.trainer);
  if (type === "profile") return profileModal();
  if (type === "info") return infoModal(data.title, data.body);
  return "";
}

function adminView() {
  return `<div class="admin-shell"><aside class="admin-side">${logo()}<nav class="admin-menu">${[["overview","▦","Overview"],["bookings","◫","Bookings"],["trainers","◎","Trainers"],["operations","⚙","Schedule & courts"],["members","●","Members"],["payments","◇","Payments"],["integrations","⌁","Integrations"]].map(([r,i,l])=>`<button class="admin-link ${state.adminRoute===r?"active":""}" data-admin-route="${r}"><span>${i}</span>${l}</button>`).join("")}</nav><button class="admin-link signout" data-action="exit-admin">← Customer app</button></aside><main class="admin-main">${adminContent()}</main></div>${modalView()}`;
}

function adminContent() {
  if (state.adminRoute === "bookings") return bookingAdmin();
  if (state.adminRoute === "trainers") return trainerAdmin();
  if (state.adminRoute === "operations") return operationsAdmin();
  if (["members","payments","integrations"].includes(state.adminRoute)) return settingsAdmin(state.adminRoute);
  const paid = state.bookings.filter(b=>b.paymentStatus === "Paid").reduce((s,b)=>s+b.amount,0);
  const due = state.bookings.filter(b=>b.paymentStatus.includes("Due") || b.paymentStatus.includes("due")).reduce((s,b)=>s+b.amount,0);
  return `<header class="admin-top"><div><h1>Good morning.</h1><p>Here’s what’s happening at Pulse today.</p></div><button class="btn btn-primary" data-action="admin-new-booking">＋ New booking</button></header>
    <section class="metric-grid">${metric("Today’s bookings",state.bookings.filter(b=>b.date==="2026-10-16").length,"Across all services")}${metric("Collected",money(paid),"Selcom + front desk")}${metric("Outstanding",money(due),"Includes no-show fees")}${metric("Trainer requests",state.trainerRequests.filter(r=>r.status==="Pending").length,"Needs attention")}</section>
    <section class="admin-grid"><div class="admin-panel"><div class="panel-head"><div><h2>Today’s bookings</h2><span class="panel-sub">Verify, check in, or update status.</span></div><button class="btn btn-ghost btn-sm" data-admin-route="bookings">View all</button></div>${bookingTable(state.bookings.filter(b=>b.date==="2026-10-16"))}</div>
    <div class="admin-panel"><div class="panel-head"><div><h2>Live activity</h2><span class="panel-sub">Most recent changes</span></div></div>${state.activities.slice(0,5).map(a=>`<div class="activity"><span class="activity-mark"></span><div><p>${escapeHTML(a.text)}</p><time>${a.time}</time></div></div>`).join("")}</div></section>`;
}

function metric(label,value,note) { return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`; }

function bookingAdmin() {
  const filters = ["All","Gym","Stretch","Padel","Juice Bar","No-show"];
  let rows = state.filters === "All" ? state.bookings : state.filters === "No-show" ? state.bookings.filter(b=>b.status==="No-show") : state.bookings.filter(b=>b.category===state.filters);
  return `<header class="admin-top"><div><h1>Bookings</h1><p>Every class, session, pass, and court reservation.</p></div><button class="btn btn-primary" data-action="admin-new-booking">＋ New booking</button></header><section class="admin-panel"><div class="filter-row">${filters.map(f=>`<button class="filter ${state.filters===f?"active":""}" data-filter="${f}">${f}</button>`).join("")}</div>${bookingTable(rows)}</section>`;
}

function bookingTable(rows) {
  if (!rows.length) return `<div class="empty">No bookings match this filter.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Booking</th><th>Customer</th><th>Date & time</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(b=>`<tr><td><div class="cell-main">${escapeHTML(b.service)}</div><div class="cell-sub">${b.id} · ${b.category}</div></td><td><div class="cell-main">${escapeHTML(b.name)}</div><div class="cell-sub">${escapeHTML(b.phone)}</div><div class="contact-actions"><button class="text-link" data-contact="email" data-id="${b.id}">Email</button><button class="text-link" data-contact="sms" data-id="${b.id}">Text</button></div></td><td><div class="cell-main">${prettyDate(b.date)}</div><div class="cell-sub">${b.time}${b.durationMinutes?` · ${durationLabel(b.durationMinutes)}`:""}</div></td><td><div class="cell-main">${escapeHTML(b.paymentStatus)}</div><div class="cell-sub">${money(b.amount)}</div></td><td><span class="status ${b.status.toLowerCase().replace("-","")}">${b.status}</span></td><td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-booking-action="manage" data-id="${b.id}">Manage</button>${b.status==="Confirmed"?`<button class="btn btn-ghost btn-sm" data-booking-action="checkin" data-id="${b.id}">Check in</button>${staffCanCancel(b)?`<button class="btn btn-danger btn-sm" data-booking-action="cancel" data-id="${b.id}">Cancel</button>`:""}`:""}${b.status==="Checked in"?`<button class="btn btn-ghost btn-sm" disabled>Admitted</button>`:""}${b.status==="No-show"?`<button class="btn btn-primary btn-sm" data-booking-action="collect" data-id="${b.id}">Collect fee</button>`:""}</div></td></tr>`).join("")}</tbody></table></div>`;
}

function trainerAdmin() {
  return `<header class="admin-top"><div><h1>Trainer requests</h1><p>Review goals and match members with the right coach.</p></div></header><section class="admin-panel"><div class="table-wrap"><table><thead><tr><th>Member</th><th>Goal</th><th>Preferred meeting</th><th>Trainer</th><th>Status</th><th>Actions</th></tr></thead><tbody>${state.trainerRequests.map(r=>`<tr><td><div class="cell-main">${escapeHTML(r.name)}</div><div class="cell-sub">${escapeHTML(r.email || "")}</div><div class="cell-sub">${escapeHTML(r.phone)}</div></td><td>${escapeHTML(r.goal)}</td><td><div class="cell-main">${r.date ? prettyDate(r.date) : "Flexible"}</div><div class="cell-sub">${escapeHTML(r.time || "Any time")}</div></td><td>${escapeHTML(r.trainer)}</td><td><span class="status ${r.status==="Pending"?"pending":""}">${r.status}</span></td><td><div class="row-actions">${r.status==="Pending"?`<button class="btn btn-primary btn-sm" data-trainer-action="accept" data-id="${r.id}">Accept</button><button class="btn btn-danger btn-sm" data-trainer-action="decline" data-id="${r.id}">Decline</button>`:"—"}</div></td></tr>`).join("")}</tbody></table></div></section>`;
}

function operationsAdmin() {
  const classes=[...state.gymSchedule].sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return `<header class="admin-top"><div><h1>Schedule & courts</h1><p>Control Padel booking rules and the Gym class calendar shown to clients.</p></div><button class="btn btn-primary" data-action="new-gym-class">＋ Add class</button></header>
    <section class="admin-grid operations-grid"><div class="admin-panel"><div class="panel-head"><div><h2>Padel court settings</h2><span class="panel-sub">Changes regenerate future booking blocks immediately.</span></div></div><form id="business-settings-form"><div class="form-grid"><div class="field"><label>Price per court session (TZS)</label><input name="padelCourtPrice" type="number" min="0" step="1000" value="${state.businessSettings.padelCourtPrice}" required></div><div class="field"><label>Booking length (minutes)</label><input name="padelDurationMinutes" type="number" min="30" max="480" step="15" value="${state.businessSettings.padelDurationMinutes}" required><small>Any 15-minute interval from 30 minutes to 8 hours.</small></div></div><div class="summary-box"><div class="summary-row"><span>Current session rate</span><strong>${money(state.businessSettings.padelCourtPrice)}</strong></div><div class="summary-row"><span>Each playing slot</span><strong>${durationLabel(state.businessSettings.padelDurationMinutes)}</strong></div><div class="summary-row"><span>Four-player split (25%)</span><strong>${money(state.businessSettings.padelCourtPrice/4)} each</strong></div></div><div class="form-actions"><button class="btn btn-primary">Save & rebuild calendar</button></div></form></div>
    <div class="admin-panel"><h2>Booking integrity</h2><p class="panel-sub">New blocks are rebuilt from opening time using the active duration. They remain disabled wherever they overlap a confirmed booking.</p><div class="activity"><span class="activity-mark"></span><div><p>Overlap protection is active</p><time>Same court + overlapping time is blocked</time></div></div><div class="activity"><span class="activity-mark" style="background:var(--stretch)"></span><div><p>Existing bookings are locked</p><time>Original price and duration never recalculate</time></div></div></div></section>
    <section class="admin-panel schedule-admin"><div class="panel-head"><div><h2>Pulse Gym weekly schedule</h2><span class="panel-sub">Official Pulse classes only. Hidden classes disappear from customer booking.</span></div><button class="btn btn-ghost btn-sm" data-action="new-gym-class">Add class</button></div><div class="table-wrap"><table><thead><tr><th>Day</th><th>Class</th><th>Instructor</th><th>Time</th><th>Capacity</th><th>Visibility</th><th></th></tr></thead><tbody>${classes.map(item=>`<tr><td><div class="cell-main">${prettyDate(item.date)}</div></td><td class="cell-main">${escapeHTML(item.name)}</td><td>${escapeHTML(item.trainer)}</td><td>${item.time}–${item.endTime || ""}</td><td>${item.capacity}</td><td><span class="status ${item.active?"confirmed":"cancelled"}">${item.active?"Live":"Hidden"}</span></td><td><button class="btn btn-ghost btn-sm" data-action="edit-gym-class" data-id="${item.id}">Manage</button></td></tr>`).join("")}</tbody></table></div></section>`;
}

function gymClassModal(item) {
  const d=item || {id:"",date:"2026-10-16",time:"18:00",endTime:"19:00",name:"",trainer:"",capacity:14,price:25000,active:true};
  return modalShell(item?"Manage Gym class":"Add Gym class", `<form id="gym-class-form"><input type="hidden" name="id" value="${escapeHTML(d.id)}"><div class="form-grid"><div class="field full"><label>Class name</label><input name="name" value="${escapeHTML(d.name)}" required placeholder="For example: Spinning"></div><div class="field"><label>Date</label><input name="date" type="date" value="${d.date}" required></div><div class="field"><label>Instructor</label><input name="trainer" value="${escapeHTML(d.trainer)}" required></div><div class="field"><label>Start time</label><input name="time" type="time" value="${d.time}" required></div><div class="field"><label>End time</label><input name="endTime" type="time" value="${d.endTime || ""}" required></div><div class="field"><label>Capacity</label><input name="capacity" type="number" min="1" value="${d.capacity}" required></div><div class="field"><label>Price (TZS)</label><input name="price" type="number" min="0" step="1000" value="${d.price}" required></div><div class="field full"><label class="toggle-field"><input name="active" type="checkbox" ${d.active?"checked":""}> Show this class to clients</label></div></div><div class="form-actions">${item?`<button type="button" class="btn btn-danger" data-action="delete-gym-class" data-id="${item.id}">Delete class</button>`:""}<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Save class</button></div></form>`);
}

function deleteGymClassModal(item) {
  if(!item) return infoModal("Class not found","This class is no longer in the schedule.");
  return modalShell("Delete class", `<p class="panel-sub">Remove <strong>${escapeHTML(item.name)}</strong> on ${prettyDate(item.date)} from the weekly Gym schedule? Existing customer bookings remain in the booking records.</p><div class="form-actions"><button class="btn btn-ghost" data-action="edit-gym-class" data-id="${item.id}">Keep class</button><button class="btn btn-danger" data-action="confirm-delete-gym-class" data-id="${item.id}">Delete class</button></div>`);
}

function settingsAdmin(route) {
  if (route === "integrations") return `<header class="admin-top"><div><h1>Integrations</h1><p>Live service status for this deployment.</p></div></header><section class="admin-grid"><div class="admin-panel"><div class="panel-head"><h2>Services</h2></div>${integration("SELCOM","Selcom payments","Checkout, webhooks and automated refunds","Credentials required")}${integration("OK","OkayFit","Memberships, classes and member authentication","Credentials required")}${integration("MAIL","Email & shared data","Google Sheet reservations and confirmation emails","Connected")}${integration("PUSH","Push notifications","Booking and trainer updates","Not connected")}</div><div class="admin-panel"><h2>Integration checklist</h2><div class="activity"><span class="activity-mark"></span><div><p>Google booking service connected</p><time>Atomic reservations, shared admin data, and email are active</time></div></div><div class="activity"><span class="activity-mark" style="background:var(--stretch)"></span><div><p>Selcom adapter prepared</p><time>Needs merchant keys and webhook approval</time></div></div><div class="activity"><span class="activity-mark" style="background:var(--pulse-dark)"></span><div><p>OkayFit mapping prepared</p><time>Needs partner documentation and API credentials</time></div></div></div></section>`;
  if (route === "payments") {
    const revenue = state.bookings.filter(b=>b.paymentStatus==="Paid").reduce((s,b)=>s+b.amount,0);
    return `<header class="admin-top"><div><h1>Payments</h1><p>Selcom payments, refunds, and amounts due.</p></div></header><section class="metric-grid">${metric("Collected",money(revenue),"Confirmed payments")}${metric("Refunded",money(state.bookings.filter(b=>b.paymentStatus==="Refunded").reduce((s,b)=>s+b.amount,0)),"Pulse cancellations")}${metric("Pay at reception",state.bookings.filter(b=>b.paymentStatus==="Due").length,"Open balances")}${metric("No-show fees",state.bookings.filter(b=>b.paymentStatus==="No-show fee due").length,"Booking blocked")}</section><section class="admin-panel" style="margin-top:16px">${bookingTable(state.bookings)}</section>`;
  }
  const unique = [...new Map(state.bookings.map(b=>[b.email,b])).values()];
  return `<header class="admin-top"><div><h1>Members & guests</h1><p>Customer contacts and booking eligibility.</p></div></header><section class="admin-panel"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Type</th><th>Eligibility</th></tr></thead><tbody>${unique.map(b=>`<tr><td class="cell-main">${escapeHTML(b.name)}</td><td><div>${escapeHTML(b.email)}</div><div class="cell-sub">${escapeHTML(b.phone)}</div></td><td>${b.email.includes("member")?"Member":"Guest"}</td><td><span class="status ${b.paymentStatus==="No-show fee due"?"cancelled":""}">${b.paymentStatus==="No-show fee due"?"Blocked · fee due":"Can book"}</span></td></tr>`).join("")}</tbody></table></div></section>`;
}

function integration(mark,title,desc,status) { return `<div class="integration"><span class="integration-logo">${mark}</span><div><strong>${title}</strong><span>${desc}</span></div><span class="status ${status.includes("Awaiting")?"pending":""}">${status}</span></div>`; }

function render() {
  const app = document.getElementById("app");
  app.innerHTML = state.session?.type === "admin" ? adminView() : state.session ? customerView() : `${entryView()}${modalView()}`;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach(el => el.onclick = () => { setState({ route:el.dataset.route, modal:null }); requestAnimationFrame(() => window.scrollTo({top:0,left:0})); });
  document.querySelectorAll("[data-admin-route]").forEach(el => el.onclick = () => setState({ adminRoute:el.dataset.adminRoute, modal:null }));
  document.querySelectorAll("[data-filter]").forEach(el => el.onclick = () => setState({ filters:el.dataset.filter }));
  document.querySelectorAll("[data-action]").forEach(el => el.onclick = (e) => handleAction(el.dataset.action, el, e));
  document.querySelectorAll("[data-payment]").forEach(el => el.onclick = () => {
    document.querySelectorAll("[data-payment]").forEach(x=>x.classList.remove("selected")); el.classList.add("selected"); document.querySelector('[name="payment"]').value=el.dataset.payment;
  });
  document.querySelectorAll("[data-method]").forEach(el => el.onclick = () => { document.querySelectorAll("[data-method]").forEach(x=>x.classList.remove("selected")); el.classList.add("selected"); const input=document.querySelector('[name="method"]'); if(input) input.value=el.dataset.method; });
  document.querySelectorAll("[data-booking-action]").forEach(el => el.onclick = () => bookingAction(el.dataset.bookingAction,el.dataset.id));
  document.querySelectorAll("[data-contact]").forEach(el => el.onclick = () => contactCustomer(el.dataset.contact,el.dataset.id));
  document.querySelectorAll("[data-buddy-text]").forEach(el => el.onclick = () => textBuddy(el.dataset.buddyText));
  document.querySelectorAll("[data-buddy-friend]").forEach(el => el.onclick = () => togglePadelFriend(el.dataset.buddyFriend));
  document.querySelectorAll("[data-promo]").forEach(el => el.onclick = () => claimPromotion(el.dataset.promo));
  document.querySelectorAll("[data-event-register]").forEach(el => el.onclick = () => setState({modal:{type:"event-register",data:{id:el.dataset.eventRegister}}},false));
  document.querySelectorAll("[data-customer-action]").forEach(el => el.onclick = () => customerBookingAction(el.dataset.customerAction,el.dataset.id));
  document.querySelectorAll("[data-trainer-action]").forEach(el => el.onclick = () => trainerAction(el.dataset.trainerAction,el.dataset.id));
  document.getElementById("signin-form")?.addEventListener("submit", e => { e.preventDefault(); setState({session:{type:"member"},route:"home",modal:null}); toast("Welcome back", "Your Pulse membership is active."); });
  document.getElementById("admin-signin-form")?.addEventListener("submit", adminSignInSubmit);
  document.getElementById("booking-form")?.addEventListener("submit", bookingSubmit);
  const bookingForm=document.getElementById("booking-form");
  if(bookingForm && state.bookingDraft?.category==="Padel") {
    const refreshPadelTimes=()=>{
      const date=bookingForm.elements.date.value, service=bookingForm.elements.service.value;
      const times=[...new Set(padelSlotsForDate(date).filter(slot=>slot[1]===service&&!courtIsBooked(service,date,slot[0],"",state.bookingDraft.durationMinutes)).map(slot=>slot[0]))];
      bookingForm.elements.time.innerHTML=times.map(time=>`<option>${time}</option>`).join("");
    };
    bookingForm.elements.date.addEventListener("change",refreshPadelTimes);
    bookingForm.elements.service.addEventListener("change",refreshPadelTimes);
  }
  document.getElementById("payment-form")?.addEventListener("submit", paymentSubmit);
  document.getElementById("trainer-form")?.addEventListener("submit", trainerSubmit);
  document.getElementById("manage-booking-form")?.addEventListener("submit", manageBookingSubmit);
  document.getElementById("buddy-form")?.addEventListener("submit", buddySubmit);
  document.getElementById("juice-form")?.addEventListener("submit", juiceSubmit);
  document.getElementById("match-result-form")?.addEventListener("submit", matchResultSubmit);
  document.getElementById("event-register-form")?.addEventListener("submit", eventRegisterSubmit);
  document.getElementById("business-settings-form")?.addEventListener("submit", businessSettingsSubmit);
  document.getElementById("gym-class-form")?.addEventListener("submit", gymClassSubmit);
  document.querySelector(".modal-backdrop")?.addEventListener("click", e => { if(e.target.classList.contains("modal-backdrop")) setState({modal:null},false); });
}

async function handleAction(action, el, e) {
  if (e) e.preventDefault();
  const data = el?.dataset || {};
  const info = {
    policy:{title:"Cancellation & no-show policy",body:"Customer cancellations for Stretch and Padel require at least 24 hours’ notice. Pulse staff may cancel Gym classes and Stretch classes; paid bookings are refunded automatically through Selcom, while unpaid bookings simply close with nothing due. Pulse does not cancel Padel courts. An unpaid Padel no-show creates a fee that must be cleared before another court booking."},
    "checkin-info":{title:"Simple check-in",body:"Your confirmation email contains a unique booking number. Show it at reception, where the team verifies it against the system. If you selected pay on arrival, settle the amount and the team will check you in."},
    offerings:{title:"Everything you need",body:"Pulse combines a fully equipped gym, weekly coached classes, personal training, membership support, recovery-focused Stretch sessions, and bookable Padel courts."},
    notifications:{title:"Notifications",body:"Booking confirmations, trainer decisions, cancellations, and refund updates appear here. Email is the active prototype channel; push notifications are prepared for the production app."}
  };
  if (action === "continue-guest") { setState({session:{type:"guest"},route:"home"}); return requestAnimationFrame(() => window.scrollTo({top:0,left:0})); }
  if (action === "open-signin" || action === "switch-member") return setState({modal:{type:"signin"}},false);
  if (action === "close-modal") return setState({modal:null},false);
  if (action === "profile") return setState({modal:{type:"profile"}},false);
  if (action === "signout") return setState({...defaultState,bookings:state.bookings,trainerRequests:state.trainerRequests,buddyRequests:state.buddyRequests,padelRankings:state.padelRankings,padelMatches:state.padelMatches,padelEvents:state.padelEvents,padelPromotions:state.padelPromotions,claimedPromotions:state.claimedPromotions,padelFriends:state.padelFriends,activities:state.activities,gymSchedule:state.gymSchedule,businessSettings:state.businessSettings});
  if (action === "open-admin") return setState({adminReturn:state.session?.type || "guest",modal:{type:"admin-signin"}},false);
  if (action === "exit-admin") { if(adminRefreshTimer) clearInterval(adminRefreshTimer); state.adminToken=""; return setState({session:{type:state.adminReturn || "guest"},route:"home",modal:null}); }
  if (action === "book") return setState({modal:{type:"booking",data:{category:data.category,service:data.service,time:data.time,date:data.date,classId:data.classId || "",amount:Number(data.amount)||undefined,durationMinutes:Number(data.duration)||undefined}}},false);
  if (action === "quick-book" || action === "admin-new-booking") return setState({modal:{type:"booking",data:{}}},false);
  if (action === "renew") return setState({modal:{type:"booking",data:{category:"Gym",service:"Pulse Unlimited membership renewal",amount:180000}}},false);
  if (action === "trainers") return setState({modal:{type:"trainers"}},false);
  if (action === "buddy") return setState({modal:{type:"buddy"}},false);
  if (action === "padel-rankings") return setState({modal:{type:"padel-rankings"}},false);
  if (action === "padel-promotions") return setState({modal:{type:"padel-promotions"}},false);
  if (action === "padel-events") return setState({modal:{type:"padel-events"}},false);
  if (action === "juice") return state.session?.type === "member" ? setState({modal:{type:"juice"}},false) : toast("Members only","Sign in as a Pulse member to preorder from the Juice Bar.");
  if (action === "trainer-form") return setState({modal:{type:"trainer-form",data:{trainer:data.trainer}}},false);
  if (action === "back-booking") return setState({modal:{type:"booking",data:state.bookingDraft}},false);
  if (action === "finish-booking") { setState({modal:null,route:"home"}); return requestAnimationFrame(() => window.scrollTo({top:0,left:0})); }
  if (action === "preview-email") return setState({modal:{type:"email-preview",data:{id:data.id}}},false);
  if (action === "view-bookings") return setState({modal:{type:"bookings"}},false);
  if (action === "calendar") return setState({modal:{type:"calendar",data:{category:data.category || "Gym"}}},false);
  if (action === "new-gym-class") return setState({modal:{type:"gym-class",data:{}}},false);
  if (action === "edit-gym-class") return setState({modal:{type:"gym-class",data:{id:data.id}}},false);
  if (action === "delete-gym-class") return setState({modal:{type:"delete-gym-class",data:{id:data.id}}},false);
  if (action === "confirm-delete-gym-class") {
    const item=state.gymSchedule.find(entry=>entry.id===data.id);
    try {
      const result=await backendPost({action:"admin-delete-class",token:state.adminToken,id:data.id});
      if(!result.ok) throw new Error(result.error || "Class was not deleted.");
    } catch(error) { return toast("Class not deleted",String(error.message || error)); }
    state.gymSchedule=state.gymSchedule.filter(entry=>entry.id!==data.id);
    state.activities=[{text:`Gym class removed: ${item?.name || data.id}`,time:"Just now"},...state.activities];
    state.modal=null; saveState(); render(); return toast("Class deleted","It has been removed from customer booking.");
  }
  if (info[action]) return setState({modal:{type:"info",data:info[action]}},false);
}

function bookingSubmit(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const draft = { ...state.bookingDraft, ...Object.fromEntries(form.entries()) };
  const serviceDetails = {
    "Reformer Foundations":["Stretch",30000], "Reformer Sculpt":["Stretch",30000], "Premium Mat Pilates":["Stretch",30000], "Reformer Flow":["Stretch",30000],
    "Gym day pass":["Gym",30000], "Pulse Unlimited membership renewal":["Gym",180000]
  };
  const mapped = serviceDetails[draft.service];
  if (mapped) { draft.category = mapped[0]; draft.amount = mapped[1]; }
  if(courtNumber(draft.service)) { draft.category="Padel"; draft.amount=state.businessSettings.padelCourtPrice; }
  const gymClass=state.gymSchedule.find(item=>item.id===draft.classId&&item.active);
  if(draft.category==="Gym" && draft.classId) {
    if(!gymClass || gymClass.name!==draft.service) return setState({modal:{type:"booking",data:{...draft,error:"That Pulse class is no longer available. Please choose another class from the Gym schedule."}}},false);
    Object.assign(draft,{date:gymClass.date,time:gymClass.time,amount:Number(gymClass.price)});
  } else draft.amount = Number(state.bookingDraft.amount || (draft.category === "Padel" ? state.businessSettings.padelCourtPrice : draft.category === "Stretch" ? 35000 : 25000));
  if(draft.category==="Padel") draft.durationMinutes=Number(state.bookingDraft.durationMinutes || state.businessSettings.padelDurationMinutes);
  if (draft.category === "Padel" && state.session?.type === "member" && state.claimedPromotions.includes("PROMO-OFFPEAK") && Number(draft.time.split(":")[0]) < 16) {
    draft.amount = Math.round(draft.amount * .8); draft.promotion="PULSE20";
  }
  if (draft.category === "Padel" && courtIsBooked(draft.service,draft.date,draft.time,"",draft.durationMinutes)) {
    return setState({modal:{type:"booking",data:{...draft,error:"That court has just been booked. Please choose another court or time."}}},false);
  }
  state.bookingDraft = draft;
  if (draft.payment === "Pay on arrival") finalizeBooking(false);
  else setState({modal:{type:"payment",data:draft}},false);
}

async function businessSettingsSubmit(e) {
  e.preventDefault();
  const fields=Object.fromEntries(new FormData(e.target).entries());
  try {
    const next={padelCourtPrice:Number(fields.padelCourtPrice),padelDurationMinutes:Number(fields.padelDurationMinutes)};
    PulseConfigController.update(next);
    const result=await backendPost({action:"admin-update-settings",token:state.adminToken,...next});
    if(!result.ok) throw new Error(result.error || "Settings were not saved.");
    state.businessSettings={...state.businessSettings,...result.settings};
  } catch(error) {
    return toast("Settings not saved",String(error.message || error));
  }
  state.activities=[{text:`Padel slots updated to ${durationLabel(state.businessSettings.padelDurationMinutes)} at ${money(state.businessSettings.padelCourtPrice)}`,time:"Just now"},...state.activities];
  saveState(); render(); toast("Court settings saved","The calendar was rebuilt. Existing reservations kept their original terms.");
}

async function gymClassSubmit(e) {
  e.preventDefault();
  const form=new FormData(e.target), fields=Object.fromEntries(form.entries());
  const record={id:fields.id || `GC-${Date.now().toString().slice(-6)}`,name:String(fields.name).trim(),date:fields.date,time:fields.time,endTime:fields.endTime,trainer:String(fields.trainer).trim(),capacity:Number(fields.capacity),price:Number(fields.price),active:form.has("active")};
  try {
    const result=await backendPost({action:"admin-save-class",token:state.adminToken,...record});
    if(!result.ok) throw new Error(result.error || "Class was not saved.");
  } catch(error) { return toast("Class not saved",String(error.message || error)); }
  const index=state.gymSchedule.findIndex(item=>item.id===record.id);
  if(index>=0) state.gymSchedule[index]=record; else state.gymSchedule=[...state.gymSchedule,record];
  state.activities=[{text:`Gym schedule updated: ${record.name} on ${prettyDate(record.date)}`,time:"Just now"},...state.activities];
  state.modal=null; saveState(); render(); toast("Class schedule saved",record.active?"The class is live in Gym booking.":"The class is hidden from clients.");
}

async function adminSignInSubmit(e) {
  e.preventDefault();
  const fields=Object.fromEntries(new FormData(e.target).entries());
  const passwordHash=await sha256(fields.password);
  let result;
  try { result=await backendPost({action:"admin-login",email:String(fields.email).trim(),passwordHash}); }
  catch(error) { result={ok:false,error:String(error.message || error)}; }
  if (!result.ok) {
    const error=document.getElementById("admin-login-error");
    if(error) error.textContent=result.error || "Incorrect email or password.";
    return;
  }
  state.adminToken=result.token;
  setState({session:{type:"admin"},modal:null,adminRoute:"overview"},false);
  await syncAdminData(true);
  if(adminRefreshTimer) clearInterval(adminRefreshTimer);
  adminRefreshTimer=setInterval(()=>{ if(state.session?.type==="admin") syncAdminData(false); },15000);
  toast("Admin portal opened",`Signed in as ${result.email}. Shared bookings are connected.`);
}

async function syncAdminData(showError=false) {
  if(!state.adminToken) return;
  try {
    const result=await backendPost({action:"admin-list",token:state.adminToken});
    if(!result.ok) throw new Error(result.error || "Could not refresh admin data.");
    const merged=new Map(state.bookings.map(item=>[item.id,item]));
    (result.bookings || []).forEach(item=>merged.set(item.id,item));
    state.bookings=[...merged.values()];
    state.businessSettings={...state.businessSettings,...result.settings};
    if(Array.isArray(result.gymSchedule) && result.gymSchedule.length) state.gymSchedule=result.gymSchedule;
    render();
  } catch(error) { if(showError) toast("Shared data unavailable",String(error.message || error)); }
}

function paymentSubmit(e) {
  e.preventDefault();
  const fields = Object.fromEntries(new FormData(e.target).entries());
  state.bookingDraft = { ...state.bookingDraft, paymentMethod:fields.method, paymentPhone:fields.paymentPhone };
  finalizeBooking(true);
}

async function finalizeBooking(paid) {
  const d = state.bookingDraft;
  if (d.category === "Padel" && courtIsBooked(d.service,d.date,d.time,"",d.durationMinutes)) {
    return setState({modal:{type:"booking",data:{...d,error:"That court is no longer available. No payment was taken."}}},false);
  }
  const booking = { id:uid(), service:d.service, category:d.category || "Gym", classId:d.classId || "", date:d.date, time:d.time, durationMinutes:d.category==="Padel"?Number(d.durationMinutes || state.businessSettings.padelDurationMinutes):null, name:d.name, email:d.email, phone:d.phone, payment:paid?"Paid in app demo":"Pay on arrival", paymentMethod:paid?(d.paymentMethod || "Mobile money demo"):"Reception", amount:Number(d.amount), status:"Confirmed", paymentStatus:paid?"Paid (demo)":"Due", emailDelivery:"sending" };
  let result;
  try {
    result=await backendPost({action:"booking-create",type:"booking-confirmation",bookingId:booking.id,name:booking.name,email:booking.email,phone:booking.phone,service:booking.service,category:booking.category,date:booking.date,time:booking.time,duration:booking.durationMinutes?durationLabel(booking.durationMinutes):"",durationMinutes:booking.durationMinutes || "",amount:booking.amount,paymentMethod:booking.paymentMethod,paymentStatus:booking.paymentStatus,classId:booking.classId,website:""},30000);
  } catch(error) { result={ok:false,error:String(error.message || error)}; }
  if(!result.ok) {
    return setState({modal:{type:"booking",data:{...d,error:result.error || "The reservation could not be saved. Please try again."}}},false);
  }
  booking.emailDelivery=result.emailSent?"sent":"failed";
  state.bookings = [...state.bookings,booking];
  if(booking.category==="Padel") state.remoteBusyPadel=[...(state.remoteBusyPadel || []),booking];
  state.activities = [{text:`${booking.name} booked ${booking.service}`,time:"Just now"},...state.activities];
  state.modal = {type:"success",data:booking};
  saveState(); render();
  toast("Booking saved", result.emailSent ? `Confirmation sent to ${booking.email}.` : "The reservation is saved; keep the booking number because email could not be sent.");
}

function trainerSubmit(e) {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target).entries());
  const req = {id:uid("TR"),name:f.name,email:f.email,phone:f.phone,goal:`${f.support}: ${f.goal}`,trainer:f.trainer,date:f.date,time:f.time,status:"Pending"};
  state.trainerRequests = [...state.trainerRequests,req]; state.activities=[{text:`New trainer request from ${req.name}`,time:"Just now"},...state.activities]; state.modal=null; saveState(); render(); toast("Request sent", "The trainer can now accept or decline it from the portal.");
}

function buddySubmit(e) {
  e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target).entries());
  const request={id:uid("BD"),name:f.name,phone:f.phone,date:f.date,time:f.time,level:f.level};
  state.buddyRequests=[...state.buddyRequests,request]; state.modal={type:"buddy"}; saveState(); render(); toast("Partner request posted","Other players can now text you from this device's partner board.");
}

function textBuddy(id) {
  const r=state.buddyRequests.find(x=>x.id===id); if(!r) return;
  const message=`Hi ${r.name}, I saw your Pulse Padel partner request for ${prettyDate(r.date)} at ${r.time}. Would you like to play?`;
  location.href=`sms:${String(r.phone).replace(/\s/g,"")}?body=${encodeURIComponent(message)}`;
}

function togglePadelFriend(id) {
  state.padelFriends = state.padelFriends.includes(id) ? state.padelFriends.filter(x=>x!==id) : [...state.padelFriends,id];
  saveState(); render(); toast(state.padelFriends.includes(id)?"Friend added":"Friend removed","Your Pulse Padel community has been updated.");
}

function claimPromotion(id) {
  if(state.session?.type!=="member") return toast("Members only","Sign in as a Pulse member to claim this offer.");
  if(state.claimedPromotions.includes(id)) return;
  state.claimedPromotions=[...state.claimedPromotions,id]; saveState(); render(); toast("Offer claimed","The discount is now linked to your member profile.");
}

function matchResultSubmit(e) {
  e.preventDefault();
  if(state.session?.type!=="member") return;
  const f=Object.fromEntries(new FormData(e.target).entries());
  const won=f.result==="Won"; const points=won?24:-8;
  state.padelMatches=[{id:`MT-${Date.now().toString().slice(-6)}`,date:f.date,player:"Tanisha Hassija",opponent:f.opponent,score:f.score,result:f.result,points},...state.padelMatches];
  const me=state.padelRankings.find(r=>r.name==="Tanisha Hassija"); if(me){me.played+=1; me.won+=won?1:0; me.points+=points;}
  state.activities=[{text:`Padel result recorded: ${f.result} vs ${f.opponent}`,time:"Just now"},...state.activities];
  state.modal={type:"padel-rankings"}; saveState(); render(); toast("Match recorded",`${points>0?"+":""}${points} ladder points applied.`);
}

function eventRegisterSubmit(e) {
  e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target).entries()); const event=state.padelEvents.find(x=>x.id===f.eventId); if(!event) return;
  if(event.registered.length>=event.capacity) return toast("Event full","Join the waiting list at reception.");
  if(event.registered.some(n=>n.toLowerCase()===String(f.name).toLowerCase())) return toast("Already registered","This player is already on the event list.");
  event.registered=[...event.registered,f.name]; state.activities=[{text:`${f.name} registered for ${event.title}`,time:"Just now"},...state.activities];
  state.modal={type:"padel-events"}; saveState(); render(); toast("Registration confirmed",`A confirmation is ready for ${f.email}.`);
}

function juiceSubmit(e) {
  e.preventDefault();
  if(state.session?.type!=="member") return toast("Members only","Please sign in as a Pulse member.");
  const f=Object.fromEntries(new FormData(e.target).entries());
  const [drink,amount]=String(f.drink).split("|");
  state.bookingDraft={category:"Juice Bar",service:`${drink} · Juice Bar preorder`,date:f.date,time:f.time,name:"Tanisha Hassija",email:"member@pulse.co.tz",phone:f.phone,notes:f.notes,amount:Number(amount),payment:"Paid in app"};
  setState({modal:{type:"payment",data:state.bookingDraft}},false);
}

function customerBookingAction(action,id) {
  const b = state.bookings.find(x=>x.id===id); if(!b || action!=="cancel") return;
  const cutoff = new Date(`${b.date}T${b.time || "00:00"}:00`).getTime() - Date.now();
  if (["Stretch","Padel"].includes(b.category) && cutoff < 24*60*60*1000) return toast("Cancellation unavailable", `${b.category} cancellations require at least 24 hours’ notice.`);
  b.status="Cancelled"; b.paymentStatus=b.paymentStatus==="Paid"?"Refunded":"Nothing due";
  state.activities=[{text:`${b.id} cancelled by customer`,time:"Just now"},...state.activities];
  state.modal={type:"bookings"}; saveState(); render(); toast("Booking cancelled",b.paymentStatus==="Refunded"?"Selcom refund recorded.":"No payment was collected.");
}

async function bookingAction(action,id) {
  const b = state.bookings.find(x=>x.id===id); if(!b) return;
  if(action==="manage") return setState({modal:{type:"manage-booking",data:{id}}},false);
  if(action==="checkin") { b.status="Checked in"; if(b.paymentStatus==="Due") b.paymentStatus="Paid at reception"; toast("Customer checked in", `${b.id} has been verified and admitted.`); }
  if(action==="cancel") {
    if(!staffCanCancel(b)) return toast("Cancellation unavailable","Pulse staff may cancel Gym and Stretch classes, but not Padel courts.");
    b.status="Cancelled"; b.paymentStatus=b.paymentStatus==="Paid"?"Refunded":"Nothing due"; toast("Booking cancelled", b.paymentStatus==="Refunded"?"Automatic Selcom refund recorded.":"No payment was collected.");
  }
  if(action==="collect") { b.paymentStatus="Paid at reception"; b.status="Fee cleared"; toast("No-show fee cleared", `${b.name} can book again.`); }
  if(/^PLS-\d{8,}$/.test(b.id)) {
    try { const result=await persistBookingUpdate(b); if(!result.ok) throw new Error(result.error || "Update failed."); }
    catch(error) { return toast("Shared booking not updated",String(error.message || error)); }
  }
  state.activities=[{text:`${b.id} updated: ${b.status}`,time:"Just now"},...state.activities]; saveState(); render();
}

async function manageBookingSubmit(e) {
  e.preventDefault();
  const fields=Object.fromEntries(new FormData(e.target).entries());
  const b=state.bookings.find(x=>x.id===fields.id); if(!b) return;
  if(fields.status==="Cancelled" && !staffCanCancel(b)) return toast("Cancellation unavailable","Pulse does not cancel Padel courts.");
  if(b.category==="Padel" && courtIsBooked(fields.service,fields.date,fields.time,b.id,b.durationMinutes || 90)) return toast("Court unavailable","That time overlaps another booking on the same court.");
  const next={...b,service:fields.service,date:fields.date,time:fields.time,status:fields.status,paymentStatus:fields.paymentStatus};
  if(/^PLS-\d{8,}$/.test(b.id)) {
    try { const result=await persistBookingUpdate(next); if(!result.ok) throw new Error(result.error || "Update failed."); }
    catch(error) { return toast("Booking not updated",String(error.message || error)); }
  }
  Object.assign(b,next);
  state.activities=[{text:`${b.id} edited by admin`,time:"Just now"},...state.activities];
  state.modal=null; saveState(); render(); toast("Booking updated",`${b.id} changes have been saved.`);
}

function persistBookingUpdate(booking) {
  return backendPost({action:"admin-update-booking",token:state.adminToken,bookingId:booking.id,service:booking.service,date:booking.date,time:booking.time,status:booking.status,paymentStatus:booking.paymentStatus});
}

function contactCustomer(channel,id) {
  const b=state.bookings.find(x=>x.id===id); if(!b) return;
  const message=`Pulse booking ${b.id}: ${b.service} on ${prettyDate(b.date)} at ${b.time}. Status: ${b.status}.`;
  if(channel==="email") location.href=`mailto:${encodeURIComponent(b.email)}?subject=${encodeURIComponent(`Pulse booking ${b.id}`)}&body=${encodeURIComponent(message)}`;
  if(channel==="sms") location.href=`sms:${String(b.phone).replace(/\s/g,"")}?body=${encodeURIComponent(message)}`;
}

function trainerAction(action,id) {
  const r=state.trainerRequests.find(x=>x.id===id); if(!r) return; r.status=action==="accept"?"Accepted":"Declined"; state.activities=[{text:`${r.trainer} ${r.status.toLowerCase()} ${r.name}’s request`,time:"Just now"},...state.activities]; saveState(); render(); toast(`Request ${r.status.toLowerCase()}`,"An email update has been prepared for the member.");
}

render();
loadPublicState();
setInterval(()=>{ if(state.session?.type!=="admin") loadPublicState(); },30000);
