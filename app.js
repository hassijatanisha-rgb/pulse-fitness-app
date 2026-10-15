const icons = {
  pulse: `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M5 25h8l4-12 7 24 6-18 4 6h9" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bell: `🔔`, user: `●`, arrow: `↗`, check: `✓`, close: `×`
};

const seed = {
  bookings: [
    { id:"PLS-2408", service:"Strength Circuit", category:"Gym", date:"2026-10-16", time:"07:00", name:"Amina Yusuf", email:"amina@example.com", phone:"+255 712 441 820", payment:"Paid in app", amount:25000, status:"Confirmed", paymentStatus:"Paid" },
    { id:"PLS-2411", service:"Padel Court 1", category:"Padel", date:"2026-10-16", time:"18:00", name:"David Mushi", email:"david@example.com", phone:"+255 754 220 118", payment:"Pay on arrival", amount:40000, status:"Confirmed", paymentStatus:"Due" },
    { id:"PLS-2415", service:"Private Stretch", category:"Stretch", date:"2026-10-17", time:"10:30", name:"Neema Issa", email:"neema@example.com", phone:"+255 685 110 927", payment:"Paid in app", amount:35000, status:"Confirmed", paymentStatus:"Paid" },
    { id:"PLS-2398", service:"Padel Court 2", category:"Padel", date:"2026-10-14", time:"20:00", name:"Kelvin John", email:"kelvin@example.com", phone:"+255 713 951 120", payment:"Pay on arrival", amount:40000, status:"No-show", paymentStatus:"No-show fee due" }
  ],
  trainerRequests: [
    { id:"TR-102", name:"Mariam Said", email:"mariam@example.com", phone:"+255 786 300 122", goal:"Build strength and create a sustainable diet plan", trainer:"Baraka M.", date:"2026-10-18", time:"12:00", status:"Pending" }
  ],
  buddyRequests: [
    { id:"BD-101", name:"Asha", phone:"+255 710 221 904", date:"2026-10-18", time:"18:00", level:"Intermediate" },
    { id:"BD-102", name:"Jonas", phone:"+255 754 119 328", date:"2026-10-19", time:"10:00", level:"Beginner" }
  ],
  activities: [
    { text:"Amina booked Strength Circuit", time:"4 min ago" },
    { text:"Payment received for PLS-2408", time:"4 min ago" },
    { text:"Kelvin marked as a no-show", time:"Yesterday" }
  ]
};

const defaultState = {
  session: null,
  route: "home",
  adminRoute: "overview",
  bookings: seed.bookings,
  trainerRequests: seed.trainerRequests,
  buddyRequests: seed.buddyRequests,
  activities: seed.activities,
  modal: null,
  bookingDraft: null,
  filters: "All",
  adminReturn: "guest"
};

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("pulse-demo-state"));
    const loaded = { ...defaultState, ...(saved || {}), modal:null, bookingDraft:null };
    const preview = new URLSearchParams(location.search).get("view");
    if (preview === "admin") loaded.session = null;
    if (preview === "member") loaded.session = { type:"member" };
    if (preview === "guest") loaded.session = { type:"guest" };
    if (preview === "entry") loaded.session = null;
    return loaded;
  } catch { return structuredClone(defaultState); }
}

function saveState() {
  const safe = { ...state, modal:null, bookingDraft:null };
  localStorage.setItem("pulse-demo-state", JSON.stringify(safe));
}

function money(value) { return new Intl.NumberFormat("en-TZ", { style:"currency", currency:"TZS", maximumFractionDigits:0 }).format(value); }
function prettyDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-TZ", { weekday:"short", day:"numeric", month:"short" }); }
function uid(prefix="PLS") {
  const records = prefix === "TR" ? state.trainerRequests : prefix === "BD" ? state.buddyRequests : state.bookings;
  const floor = prefix === "PLS" ? 2400 : 100;
  const highest = records.reduce((max,item)=>Math.max(max,Number(String(item.id || "").split("-").pop()) || 0),floor);
  return `${prefix}-${highest + 1}`;
}
function escapeHTML(value="") { return String(value).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function activeBooking(b) { return !["Cancelled","No-show","Fee cleared"].includes(b.status); }
function staffCanCancel(b) { return ["Gym","Stretch"].includes(b.category); }
function courtNumber(service="") { return String(service).match(/court\s*(\d+)/i)?.[1] || ""; }
function courtIsBooked(service,date,time,ignoreId="") {
  const court=courtNumber(service);
  return Boolean(court && state.bookings.some(b=>b.id!==ignoreId && b.category==="Padel" && activeBooking(b) && courtNumber(b.service)===court && b.date===date && b.time===time));
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
      ${serviceCard("stretch","Stretch at Pulse","Private recovery and guided group sessions.")}
      ${serviceCard("padel","Padel at Pulse","Pick a court, choose a time, and play.")}
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

const gymSlots = [
  ["07:00","Strength Circuit","Baraka · 6 spots"], ["09:30","Pulse HIIT","Joy · 3 spots"], ["17:30","Box & Burn","Moses · 8 spots"], ["19:00","Core Lab","Joy · 4 spots"]
];
const stretchSlots = [["08:00","Morning Mobility","8 spots"],["12:30","Desk Reset","5 spots"],["17:00","Deep Release","4 spots"],["18:30","Recovery Flow","7 spots"]];
const padelSlots = [["08:00","Court 1","Available"],["10:00","Court 2","Available"],["16:00","Court 1","Available"],["18:00","Court 3","Available"]];

function schedule(slots, category) {
  return `<section class="schedule"><div class="schedule-head"><div><div class="eyebrow">Thursday, 16 October</div><h2>Available today</h2></div><button class="btn btn-ghost btn-sm" data-action="calendar" data-category="${category}">Full calendar</button></div>
  <div class="slot-grid">${slots.map(s=>{ const booked=category==="Padel" && courtIsBooked(s[1],"2026-10-16",s[0]); return `<button class="slot ${booked?"unavailable":""}" data-action="book" data-category="${category}" data-service="${s[1]}" data-time="${s[0]}" data-date="2026-10-16" ${booked?"disabled":""}><div class="slot-time">${s[0]}</div><div class="slot-meta">${s[1]}</div><span class="spots">${booked?"Booked":s[2]}</span></button>`; }).join("")}</div></section>`;
}

function gymView() {
  return `<main class="page">${categoryHero("gym","Build your strength","Gym at Pulse","Book a class, work with a trainer, or renew your membership—all in one place.")}
    <section class="action-grid">
      ${actionCard("◫","Book a class","Reserve your place in this week’s schedule.","book","Gym","Fitness class")}
      ${actionCard("◎","Find a trainer","Tell us your goals or choose a trainer directly.","trainers")}
      ${actionCard("↻","Membership","Renew your plan through Selcom.","renew")}
      ${actionCard("◇","Buy a day pass","One full day of Pulse access.","book","Gym","Gym day pass")}
      ${state.session?.type === "member" ? actionCard("◍","Preorder from the Juice Bar","Choose a drink and pickup time so it is ready after your workout.","juice") : ""}
      ${actionCard("＋","What we offer","Equipment, facilities and services.","offerings")}
    </section>${schedule(gymSlots,"Gym")}
  </main>`;
}

function stretchView() {
  return `<main class="page">${categoryHero("stretch","Recover. Reset. Return.","Stretch at Pulse","Give your body focused attention with private sessions or guided group classes.")}
    <section class="action-grid">
      ${actionCard("◒","Private session","One-on-one assisted stretching built around you.","book","Stretch","Private Stretch")}
      ${actionCard("◉","Group class","Book a place in a guided Stretch class.","book","Stretch","Stretch class")}
      ${actionCard("i","Cancellation policy","Notify us at least 24 hours before your session.","policy")}
    </section>${schedule(stretchSlots,"Stretch")}
  </main>`;
}

function padelView() {
  return `<main class="page">${categoryHero("padel","No membership needed","Padel at Pulse","Choose your court and time. Pay securely now or settle at reception when you arrive.")}
    <section class="action-grid">
      ${actionCard("▦","Book a court","Choose an available court and time slot.","book","Padel","Padel Court")}
      ${actionCard("⌁","How check-in works","Show your emailed booking code at reception.","checkin-info")}
      ${actionCard("♟","Find someone to play with","Coming soon: post a time or find another player who needs a partner.","buddy")}
      ${actionCard("!","No-show policy","Unpaid no-shows must clear their fee before playing again.","policy")}
    </section>${schedule(padelSlots,"Padel")}
  </main>`;
}

function actionCard(icon, title, desc, action, category="", service="") {
  return `<button class="action-card" data-action="${action}" data-category="${category}" data-service="${service}"><span class="action-icon">${icon}</span><div><h3>${title}</h3><p>${desc}</p></div><span>${icons.arrow}</span></button>`;
}

function signInModal() {
  return modalShell("Member sign in", `<div class="steps"><span class="step on"></span><span class="step"></span></div><form id="signin-form"><div class="form-grid"><div class="field full"><label for="email">Email or member ID</label><input id="email" name="email" type="email" value="member@pulse.co.tz" required></div><div class="field full"><label for="password">Password</label><input id="password" name="password" type="password" value="pulsefitness" required></div></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Sign in</button></div><p class="fine-print">Demo access is pre-filled. OkayFit authentication will connect here.</p></form>`);
}

function adminSignInModal() {
  return modalShell("Admin portal", `<form id="admin-signin-form"><div class="form-grid"><div class="field full"><label for="admin-email">Admin email</label><input id="admin-email" name="email" type="email" autocomplete="username" required placeholder="admin@admin.com"></div><div class="field full"><label for="admin-password">Password</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required placeholder="Password"></div></div><p id="admin-login-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Sign in to admin</button></div><p class="fine-print">Demo portal access. Production authentication will be moved to a secure server before launch.</p></form>`);
}

function bookingModal(draft = {}) {
  const d = { category:"Gym", service:"Fitness class", time:"07:00", date:"2026-10-16", amount: draft.category === "Padel" ? 40000 : draft.category === "Stretch" ? 35000 : 25000, ...draft, date:draft.date || "2026-10-16", time:draft.time || "07:00" };
  state.bookingDraft = d;
  const services = d.category === "Padel" ? [courtNumber(d.service)?d.service:"Court 1","Court 1","Court 2","Court 3"] : [d.service,"Fitness class","Private Stretch","Stretch class","Gym day pass","Pulse Unlimited membership renewal"];
  return modalShell("Make a booking", `<div class="steps"><span class="step on"></span><span class="step on"></span><span class="step"></span></div>
    <form id="booking-form"><div class="form-grid">
      <div class="field"><label>Service</label><select name="service">${services.filter((v,i,a)=>a.indexOf(v)===i).map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("")}</select></div>
      <div class="field"><label>Date</label><input name="date" type="date" value="${d.date}" min="2026-10-15" required></div>
      <div class="field"><label>Time</label><select name="time">${[d.time,"08:00","10:00","12:30","17:00","18:00","19:00"].filter((v,i,a)=>a.indexOf(v)===i).map(v=>`<option>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Full name</label><input name="name" value="${state.session?.type === "member" ? "Tanisha Hassija" : ""}" required placeholder="Your name"></div>
      <div class="field"><label>Email</label><input name="email" type="email" value="${state.session?.type === "member" ? "member@pulse.co.tz" : ""}" required placeholder="you@example.com"></div>
      <div class="field"><label>Phone number</label><input name="phone" type="tel" required placeholder="+255 7XX XXX XXX"></div>
      <div class="field full"><label>Payment</label><input type="hidden" name="payment" value="Paid in app"><div class="segmented"><button type="button" class="segment selected" data-payment="Paid in app"><strong>Pay in the app</strong><span>Secure Selcom checkout</span></button><button type="button" class="segment" data-payment="Pay on arrival"><strong>Pay on arrival</strong><span>Settle at reception</span></button></div></div>
    </div><p class="form-error" role="alert">${escapeHTML(d.error || "")}</p><div class="summary-box"><div class="summary-row"><span>Booking estimate</span><strong>${money(d.amount)}</strong></div><div class="summary-row"><span>Cancellation</span><strong>24 hours’ notice</strong></div></div>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Continue</button></div></form>`);
}

function paymentModal(d) {
  return modalShell("Selcom secure checkout", `<div class="steps"><span class="step on"></span><span class="step on"></span><span class="step on"></span></div>
    <div class="summary-box"><div class="summary-row"><span>${escapeHTML(d.service)}</span><strong>${money(d.amount)}</strong></div><div class="summary-row"><span>${prettyDate(d.date)} at ${d.time}</span><strong>${escapeHTML(d.name)}</strong></div></div>
    <form id="payment-form"><input type="hidden" name="method" value="Mobile money"><div class="eyebrow" style="margin-bottom:10px">Select payment method</div><div class="payment-methods"><button type="button" class="payment-card selected" data-method="Mobile money"><span class="payment-logo">MOMO</span><span><strong>Mobile money</strong><small>M-Pesa, Airtel Money, Mixx by Yas</small></span></button><button type="button" class="payment-card" data-method="Card"><span class="payment-logo">CARD</span><span><strong>Debit or credit card</strong><small>Visa and Mastercard via Selcom</small></span></button></div>
    <div class="form-grid" style="margin-top:16px"><div class="field full"><label>Payment phone number</label><input name="paymentPhone" type="tel" value="${escapeHTML(d.phone)}" required placeholder="+255 7XX XXX XXX"></div></div>
    <p class="fine-print">Prototype checkout. The production button will create a Selcom order and verify its webhook before confirming.</p>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="back-booking">Back</button><button class="btn btn-blue">Pay ${money(d.amount)}</button></div></form>`);
}

function calendarModal(category) {
  const slots = category === "Padel" ? padelSlots : category === "Stretch" ? stretchSlots : gymSlots;
  const dates = Array.from({length:7},(_,i)=>{ const d=new Date("2026-10-16T12:00:00"); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); });
  return modalShell(`${category} calendar`, `<p class="panel-sub">Choose a date and available time.</p><div class="calendar-list">${dates.map(date=>`<section class="calendar-day"><strong>${prettyDate(date)}</strong><div class="slot-grid">${slots.slice(0,3).map(s=>{ const booked=category==="Padel" && courtIsBooked(s[1],date,s[0]); return `<button class="slot ${booked?"unavailable":""}" data-action="book" data-category="${category}" data-service="${escapeHTML(s[1])}" data-time="${s[0]}" data-date="${date}" ${booked?"disabled":""}><span class="slot-time">${s[0]}</span><span class="slot-meta">${escapeHTML(s[1])}</span><span class="spots">${booked?"Booked":"Available"}</span></button>`; }).join("")}</div></section>`).join("")}</div>`, true);
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
  return modalShell("Find a Padel partner — coming soon", `<div class="coming-soon">Coming soon preview</div><p class="panel-sub">Post when you want to play, or text someone already looking for a partner.</p><form id="buddy-form"><div class="form-grid"><div class="field"><label>Name</label><input name="name" required placeholder="Your name"></div><div class="field"><label>Phone</label><input name="phone" type="tel" required placeholder="+255 7XX XXX XXX"></div><div class="field"><label>Date</label><input name="date" type="date" min="2026-10-15" value="2026-10-18" required></div><div class="field"><label>Time</label><select name="time"><option>08:00</option><option>10:00</option><option>16:00</option><option>18:00</option><option>20:00</option></select></div><div class="field full"><label>Playing level</label><select name="level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Any level</option></select></div></div><div class="form-actions"><button class="btn btn-primary">Post my time</button></div></form><div class="buddy-list"><h3>Players looking for a buddy</h3>${state.buddyRequests.map(r=>`<article class="buddy-row"><div><strong>${escapeHTML(r.name)}</strong><span>${escapeHTML(r.level)} · ${prettyDate(r.date)} at ${r.time}</span></div><button class="btn btn-ghost btn-sm" data-buddy-text="${r.id}">Text ${escapeHTML(r.name)}</button></article>`).join("")}</div>`, true);
}

function juiceModal() {
  return modalShell("Preorder from the Juice Bar", `<p class="panel-sub">Members only. Pay through the Selcom demo and collect your drink after your workout.</p><form id="juice-form"><div class="form-grid"><div class="field full"><label>Drink</label><select name="drink"><option value="Green Machine|12000">Green Machine — ${money(12000)}</option><option value="Berry Recovery|14000">Berry Recovery — ${money(14000)}</option><option value="Protein Power|16000">Protein Power — ${money(16000)}</option><option value="Cold-Pressed Orange|10000">Cold-Pressed Orange — ${money(10000)}</option></select></div><div class="field"><label>Pickup date</label><input name="date" type="date" min="2026-10-15" value="2026-10-16" required></div><div class="field"><label>Ready by</label><select name="time"><option>08:00</option><option>10:00</option><option>12:00</option><option>17:00</option><option>19:00</option><option>21:00</option></select></div><div class="field full"><label>Notes</label><textarea name="notes" placeholder="For example: no ice, extra ginger"></textarea></div><div class="field full"><label>Payment phone number</label><input name="phone" type="tel" required placeholder="+255 7XX XXX XXX"></div></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Continue to Selcom</button></div></form>`, true);
}

function successModal(b) {
  return modalShell("Booking confirmed", `<div class="success-view"><span class="success-icon">✓</span><h2>You’re booked.</h2><p>A confirmation has been prepared for <strong>${escapeHTML(b.email)}</strong>. Show this booking number at reception.</p><span class="booking-code">${b.id}</span><p>${escapeHTML(b.service)} · ${prettyDate(b.date)} at ${b.time}</p><div class="form-actions" style="justify-content:center"><button class="btn btn-primary" data-action="finish-booking">Back to Pulse</button></div></div>`);
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
  return modalShell(isMember ? "Member profile" : "Guest session", `<div class="summary-box"><div class="summary-row"><span>Access</span><strong>${isMember ? "Pulse member" : "Guest"}</strong></div>${isMember ? `<div class="summary-row"><span>Membership</span><strong>Active</strong></div><div class="summary-row"><span>OkayFit</span><strong>Integration ready</strong></div>` : ""}<div class="summary-row"><span>Bookings on this device</span><strong>${state.bookings.length}</strong></div></div><div class="form-actions"><button class="btn btn-danger" data-action="signout">Sign out</button>${!isMember ? `<button class="btn btn-primary" data-action="switch-member">Member sign in</button>` : ""}<button class="btn btn-ghost" data-action="open-admin">Open admin demo</button></div>`);
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
  if (type === "calendar") return calendarModal(data.category);
  if (type === "bookings") return bookingsModal();
  if (type === "manage-booking") return manageBookingModal(state.bookings.find(b=>b.id===data.id));
  if (type === "buddy") return buddyModal();
  if (type === "juice") return juiceModal();
  if (type === "trainers") return trainersModal();
  if (type === "trainer-form") return trainerFormModal(data.trainer);
  if (type === "profile") return profileModal();
  if (type === "info") return infoModal(data.title, data.body);
  return "";
}

function adminView() {
  return `<div class="admin-shell"><aside class="admin-side">${logo()}<nav class="admin-menu">${[["overview","▦","Overview"],["bookings","◫","Bookings"],["trainers","◎","Trainers"],["members","●","Members"],["payments","◇","Payments"],["integrations","⌁","Integrations"]].map(([r,i,l])=>`<button class="admin-link ${state.adminRoute===r?"active":""}" data-admin-route="${r}"><span>${i}</span>${l}</button>`).join("")}</nav><button class="admin-link signout" data-action="exit-admin">← Customer app</button></aside><main class="admin-main">${adminContent()}</main></div>${modalView()}`;
}

function adminContent() {
  if (state.adminRoute === "bookings") return bookingAdmin();
  if (state.adminRoute === "trainers") return trainerAdmin();
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
  return `<div class="table-wrap"><table><thead><tr><th>Booking</th><th>Customer</th><th>Date & time</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(b=>`<tr><td><div class="cell-main">${escapeHTML(b.service)}</div><div class="cell-sub">${b.id} · ${b.category}</div></td><td><div class="cell-main">${escapeHTML(b.name)}</div><div class="cell-sub">${escapeHTML(b.phone)}</div><div class="contact-actions"><button class="text-link" data-contact="email" data-id="${b.id}">Email</button><button class="text-link" data-contact="sms" data-id="${b.id}">Text</button></div></td><td><div class="cell-main">${prettyDate(b.date)}</div><div class="cell-sub">${b.time}</div></td><td><div class="cell-main">${escapeHTML(b.paymentStatus)}</div><div class="cell-sub">${money(b.amount)}</div></td><td><span class="status ${b.status.toLowerCase().replace("-","")}">${b.status}</span></td><td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-booking-action="manage" data-id="${b.id}">Manage</button>${b.status==="Confirmed"?`<button class="btn btn-ghost btn-sm" data-booking-action="checkin" data-id="${b.id}">Check in</button>${staffCanCancel(b)?`<button class="btn btn-danger btn-sm" data-booking-action="cancel" data-id="${b.id}">Cancel</button>`:""}`:""}${b.status==="Checked in"?`<button class="btn btn-ghost btn-sm" disabled>Admitted</button>`:""}${b.status==="No-show"?`<button class="btn btn-primary btn-sm" data-booking-action="collect" data-id="${b.id}">Collect fee</button>`:""}</div></td></tr>`).join("")}</tbody></table></div>`;
}

function trainerAdmin() {
  return `<header class="admin-top"><div><h1>Trainer requests</h1><p>Review goals and match members with the right coach.</p></div></header><section class="admin-panel"><div class="table-wrap"><table><thead><tr><th>Member</th><th>Goal</th><th>Preferred meeting</th><th>Trainer</th><th>Status</th><th>Actions</th></tr></thead><tbody>${state.trainerRequests.map(r=>`<tr><td><div class="cell-main">${escapeHTML(r.name)}</div><div class="cell-sub">${escapeHTML(r.email || "")}</div><div class="cell-sub">${escapeHTML(r.phone)}</div></td><td>${escapeHTML(r.goal)}</td><td><div class="cell-main">${r.date ? prettyDate(r.date) : "Flexible"}</div><div class="cell-sub">${escapeHTML(r.time || "Any time")}</div></td><td>${escapeHTML(r.trainer)}</td><td><span class="status ${r.status==="Pending"?"pending":""}">${r.status}</span></td><td><div class="row-actions">${r.status==="Pending"?`<button class="btn btn-primary btn-sm" data-trainer-action="accept" data-id="${r.id}">Accept</button><button class="btn btn-danger btn-sm" data-trainer-action="decline" data-id="${r.id}">Decline</button>`:"—"}</div></td></tr>`).join("")}</tbody></table></div></section>`;
}

function settingsAdmin(route) {
  if (route === "integrations") return `<header class="admin-top"><div><h1>Integrations</h1><p>Connection points are prepared for production credentials.</p></div></header><section class="admin-grid"><div class="admin-panel"><div class="panel-head"><h2>Services</h2></div>${integration("SELCOM","Selcom payments","Checkout, webhooks and automated refunds","Sandbox ready")}${integration("OK","OkayFit","Memberships, classes and member authentication","Awaiting API")}${integration("MAIL","Email","Booking codes, updates and cancellations","Demo mode")}${integration("PUSH","Push notifications","Booking and trainer updates","Frontend ready")}</div><div class="admin-panel"><h2>Integration checklist</h2><div class="activity"><span class="activity-mark"></span><div><p>Selcom adapter defined</p><time>Needs merchant keys</time></div></div><div class="activity"><span class="activity-mark" style="background:var(--stretch)"></span><div><p>OkayFit data mapping prepared</p><time>Needs API documentation</time></div></div><div class="activity"><span class="activity-mark" style="background:var(--pulse-dark)"></span><div><p>Email templates designed</p><time>Needs sending provider</time></div></div></div></section>`;
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
  document.querySelectorAll("[data-customer-action]").forEach(el => el.onclick = () => customerBookingAction(el.dataset.customerAction,el.dataset.id));
  document.querySelectorAll("[data-trainer-action]").forEach(el => el.onclick = () => trainerAction(el.dataset.trainerAction,el.dataset.id));
  document.getElementById("signin-form")?.addEventListener("submit", e => { e.preventDefault(); setState({session:{type:"member"},route:"home",modal:null}); toast("Welcome back", "Your Pulse membership is active."); });
  document.getElementById("admin-signin-form")?.addEventListener("submit", adminSignInSubmit);
  document.getElementById("booking-form")?.addEventListener("submit", bookingSubmit);
  document.getElementById("payment-form")?.addEventListener("submit", paymentSubmit);
  document.getElementById("trainer-form")?.addEventListener("submit", trainerSubmit);
  document.getElementById("manage-booking-form")?.addEventListener("submit", manageBookingSubmit);
  document.getElementById("buddy-form")?.addEventListener("submit", buddySubmit);
  document.getElementById("juice-form")?.addEventListener("submit", juiceSubmit);
  document.querySelector(".modal-backdrop")?.addEventListener("click", e => { if(e.target.classList.contains("modal-backdrop")) setState({modal:null},false); });
}

function handleAction(action, el, e) {
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
  if (action === "signout") return setState({...defaultState,bookings:state.bookings,trainerRequests:state.trainerRequests,buddyRequests:state.buddyRequests,activities:state.activities});
  if (action === "open-admin") return setState({adminReturn:state.session?.type || "guest",modal:{type:"admin-signin"}},false);
  if (action === "exit-admin") return setState({session:{type:state.adminReturn || "guest"},route:"home",modal:null});
  if (action === "book") return setState({modal:{type:"booking",data:{category:data.category,service:data.service,time:data.time,date:data.date}}},false);
  if (action === "quick-book" || action === "admin-new-booking") return setState({modal:{type:"booking",data:{}}},false);
  if (action === "renew") return setState({modal:{type:"booking",data:{category:"Gym",service:"Pulse Unlimited membership renewal",amount:180000}}},false);
  if (action === "trainers") return setState({modal:{type:"trainers"}},false);
  if (action === "buddy") return setState({modal:{type:"buddy"}},false);
  if (action === "juice") return state.session?.type === "member" ? setState({modal:{type:"juice"}},false) : toast("Members only","Sign in as a Pulse member to preorder from the Juice Bar.");
  if (action === "trainer-form") return setState({modal:{type:"trainer-form",data:{trainer:data.trainer}}},false);
  if (action === "back-booking") return setState({modal:{type:"booking",data:state.bookingDraft}},false);
  if (action === "finish-booking") { setState({modal:null,route:"home"}); return requestAnimationFrame(() => window.scrollTo({top:0,left:0})); }
  if (action === "view-bookings") return setState({modal:{type:"bookings"}},false);
  if (action === "calendar") return setState({modal:{type:"calendar",data:{category:data.category || "Gym"}}},false);
  if (info[action]) return setState({modal:{type:"info",data:info[action]}},false);
}

function bookingSubmit(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const draft = { ...state.bookingDraft, ...Object.fromEntries(form.entries()) };
  const serviceDetails = {
    "Fitness class":["Gym",25000], "Private Stretch":["Stretch",35000], "Stretch class":["Stretch",30000],
    "Court 1":["Padel",40000], "Court 2":["Padel",40000], "Court 3":["Padel",40000], "Gym day pass":["Gym",30000], "Pulse Unlimited membership renewal":["Gym",180000]
  };
  const mapped = serviceDetails[draft.service];
  if (mapped) { draft.category = mapped[0]; draft.amount = mapped[1]; }
  else draft.amount = Number(state.bookingDraft.amount || (draft.category === "Padel" ? 40000 : draft.category === "Stretch" ? 35000 : 25000));
  if (draft.category === "Padel" && courtIsBooked(draft.service,draft.date,draft.time)) {
    return setState({modal:{type:"booking",data:{...draft,error:"That court has just been booked. Please choose another court or time."}}},false);
  }
  state.bookingDraft = draft;
  if (draft.payment === "Pay on arrival") finalizeBooking(false);
  else setState({modal:{type:"payment",data:draft}},false);
}

function adminSignInSubmit(e) {
  e.preventDefault();
  const fields=Object.fromEntries(new FormData(e.target).entries());
  if (String(fields.email).trim().toLowerCase() !== "admin@admin.com" || fields.password !== "12345678") {
    const error=document.getElementById("admin-login-error");
    if(error) error.textContent="Incorrect email or password.";
    return;
  }
  setState({session:{type:"admin"},modal:null,adminRoute:"overview"});
  toast("Admin portal opened","Signed in as admin@admin.com.");
}

function paymentSubmit(e) {
  e.preventDefault();
  const fields = Object.fromEntries(new FormData(e.target).entries());
  state.bookingDraft = { ...state.bookingDraft, paymentMethod:fields.method, paymentPhone:fields.paymentPhone };
  finalizeBooking(true);
}

function finalizeBooking(paid) {
  const d = state.bookingDraft;
  if (d.category === "Padel" && courtIsBooked(d.service,d.date,d.time)) {
    return setState({modal:{type:"booking",data:{...d,error:"That court is no longer available. No payment was taken."}}},false);
  }
  const booking = { id:uid(), service:d.service, category:d.category || "Gym", date:d.date, time:d.time, name:d.name, email:d.email, phone:d.phone, payment:paid?"Paid in app":"Pay on arrival", paymentMethod:paid?(d.paymentMethod || "Mobile money"):"Reception", amount:Number(d.amount), status:"Confirmed", paymentStatus:paid?"Paid":"Due" };
  state.bookings = [...state.bookings,booking];
  state.activities = [{text:`${booking.name} booked ${booking.service}`,time:"Just now"},...state.activities];
  state.modal = {type:"success",data:booking};
  saveState(); render();
  toast(paid ? "Payment approved" : "Booking reserved", paid ? "Selcom demo payment completed." : "Payment is due at reception.");
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

function bookingAction(action,id) {
  const b = state.bookings.find(x=>x.id===id); if(!b) return;
  if(action==="manage") return setState({modal:{type:"manage-booking",data:{id}}},false);
  if(action==="checkin") { b.status="Checked in"; if(b.paymentStatus==="Due") b.paymentStatus="Paid at reception"; toast("Customer checked in", `${b.id} has been verified and admitted.`); }
  if(action==="cancel") {
    if(!staffCanCancel(b)) return toast("Cancellation unavailable","Pulse staff may cancel Gym and Stretch classes, but not Padel courts.");
    b.status="Cancelled"; b.paymentStatus=b.paymentStatus==="Paid"?"Refunded":"Nothing due"; toast("Booking cancelled", b.paymentStatus==="Refunded"?"Automatic Selcom refund recorded.":"No payment was collected.");
  }
  if(action==="collect") { b.paymentStatus="Paid at reception"; b.status="Fee cleared"; toast("No-show fee cleared", `${b.name} can book again.`); }
  state.activities=[{text:`${b.id} updated: ${b.status}`,time:"Just now"},...state.activities]; saveState(); render();
}

function manageBookingSubmit(e) {
  e.preventDefault();
  const fields=Object.fromEntries(new FormData(e.target).entries());
  const b=state.bookings.find(x=>x.id===fields.id); if(!b) return;
  if(fields.status==="Cancelled" && !staffCanCancel(b)) return toast("Cancellation unavailable","Pulse does not cancel Padel courts.");
  Object.assign(b,{service:fields.service,date:fields.date,time:fields.time,status:fields.status,paymentStatus:fields.paymentStatus});
  state.activities=[{text:`${b.id} edited by admin`,time:"Just now"},...state.activities];
  state.modal=null; saveState(); render(); toast("Booking updated",`${b.id} changes have been saved.`);
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
