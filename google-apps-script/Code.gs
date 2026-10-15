const PULSE_TIMEZONE = 'Africa/Dar_es_Salaam';
const DAILY_SEND_LIMIT = 100;
const BOOKING_SHEET_NAME = 'Reservations';
const CLASS_SHEET_NAME = 'Gym Schedule';
const BOOKING_HEADERS = ['Created at','Booking ID','Name','Email','Phone','Category','Service','Date','Time','Duration','Amount TZS','Payment method','Payment status','Email status','Duration minutes','Status','Class ID'];
const CLASS_HEADERS = ['ID','Name','Date','Start time','End time','Instructor','Capacity','Price TZS','Active'];
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD_SHA256 = PropertiesService.getScriptProperties().getProperty('PULSE_ADMIN_PASSWORD_SHA256');
const DEFAULT_SETTINGS = { padelCourtPrice:40000, padelDurationMinutes:90, padelCourtCount:3, weekdayOpeningTime:'05:00', weekdayClosingTime:'21:00', weekendOpeningTime:'07:00', weekendClosingTime:'19:00' };
const DEFAULT_GYM_CLASSES = [
  ['GC-11','Fusion – TRX','2026-10-16','06:30','07:30','Karim',14,25000,true],['GC-12','Circuit','2026-10-16','18:00','19:00','Mussa',14,25000,true],['GC-13','Aerobics','2026-10-16','18:00','19:00','Leah',14,25000,true],['GC-14','Aerial Hoop','2026-10-16','18:30','19:30','Selam',14,25000,true],
  ['GC-21','Spinning','2026-10-17','09:00','10:00','Nadhege',14,25000,true],['GC-41','Boxing','2026-10-19','17:00','18:00','Slim',14,25000,true],['GC-42','Spinning','2026-10-19','17:45','18:30','Nadhege',14,25000,true],['GC-43','Core Work','2026-10-19','18:00','18:45','Mussa',14,25000,true],['GC-44','Aerial Yoga','2026-10-19','19:00','19:45','Liz',14,25000,true],
  ['GC-51','Spinning','2026-10-20','06:30','07:30','Karim',14,25000,true],['GC-52','Mat Pilates','2026-10-20','18:00','19:00','Eli',14,25000,true],['GC-53','Climb to the Beat','2026-10-20','18:30','19:30','Mchina',14,25000,true],['GC-61','Spinning','2026-10-21','06:30','07:30','Mchina',14,25000,true],['GC-62','Power Yoga','2026-10-21','08:15','09:15','Sisti',14,25000,true],['GC-63','Aerobics','2026-10-21','18:00','19:00','Leah',14,25000,true],['GC-64','Zumba','2026-10-21','18:30','19:15','Arafat',14,25000,true],
  ['GC-71','Spin. HIIT. Repeat.','2026-10-22','18:00','19:00','Mandi',14,25000,true],['GC-72','Dance','2026-10-22','18:00','19:00','Selam',14,25000,true],['GC-73','Boxing Bootcamp','2026-10-22','18:30','19:30','Slim',14,25000,true]
];

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'health');
  if (action === 'public-state') {
    const payload = { ok:true, settings:settings_(), gymSchedule:gymSchedule_(), busyPadel:busyPadel_(), updatedAt:new Date().toISOString() };
    return jsonp_(payload, e.parameter.callback);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok:true, service:'Pulse API', updatedAt:new Date().toISOString() })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  const data = (e && e.parameter) || {};
  try {
    const action = String(data.action || (data.type === 'booking-confirmation' ? 'booking-create' : ''));
    let result;
    if (action === 'booking-create') result = createBooking_(data);
    else if (action === 'admin-login') result = adminLogin_(data);
    else if (action === 'admin-list') result = adminList_(data);
    else if (action === 'admin-update-booking') result = adminUpdateBooking_(data);
    else if (action === 'admin-update-settings') result = adminUpdateSettings_(data);
    else if (action === 'admin-save-class') result = adminSaveClass_(data);
    else if (action === 'admin-delete-class') result = adminDeleteClass_(data);
    else result = { ok:false, error:'Unsupported action' };
    return bridgeResponse_(result, data.requestId);
  } catch (error) {
    console.error(error);
    return bridgeResponse_({ ok:false, error:String(error.message || error) }, data.requestId);
  } finally {
    lock.releaseLock();
  }
}

function createBooking_(data) {
  if (data.website) return { ok:false, error:'Invalid request' };
  const required = ['bookingId','name','email','service','date','time','paymentStatus'];
  required.forEach(function(field) { if (!String(data[field] || '').trim()) throw new Error('Missing ' + field); });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Invalid email');
  if (!/^PLS-\d{8,}$/.test(data.bookingId)) throw new Error('Invalid booking number');

  const sheet = bookingSheet_();
  const existingRow = bookingRow_(sheet, data.bookingId);
  if (existingRow) return { ok:true, bookingId:data.bookingId, duplicate:true, emailSent:String(sheet.getRange(existingRow, 14).getValue()) === 'Sent' };
  const durationMinutes = Number(data.durationMinutes || 0);
  if (String(data.category) === 'Padel' && bookingConflict_(sheet, data.service, data.date, data.time, durationMinutes || 90, '')) {
    return { ok:false, conflict:true, error:'That court was just booked. Choose another court or time.' };
  }

  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, BOOKING_HEADERS.length).setValues([[
    Utilities.formatDate(new Date(), PULSE_TIMEZONE, 'yyyy-MM-dd HH:mm:ss'), data.bookingId, clean_(data.name), clean_(data.email), clean_(data.phone), clean_(data.category), clean_(data.service), clean_(data.date), clean_(data.time), clean_(data.duration), Number(data.amount || 0), clean_(data.paymentMethod), clean_(data.paymentStatus), 'Queued', durationMinutes, 'Confirmed', clean_(data.classId)
  ]]);

  let emailSent = false;
  try {
    enforceDailyLimit_();
    MailApp.sendEmail({ to:data.email, subject:'Your Pulse reservation is confirmed — ' + data.bookingId, name:'Pulse Fitness', replyTo:'hassijatanisha@gmail.com', htmlBody:bookingEmail_(data) });
    sheet.getRange(row, 14).setValue('Sent');
    incrementDailyCount_();
    emailSent = true;
  } catch (mailError) {
    sheet.getRange(row, 14).setValue('Failed: ' + String(mailError.message || mailError).slice(0, 180));
  }
  return { ok:true, bookingId:data.bookingId, emailSent:emailSent };
}

function adminLogin_(data) {
  const email = String(data.email || '').trim().toLowerCase();
  const passwordHash = String(data.passwordHash || '').trim();
  if (email !== ADMIN_EMAIL || passwordHash !== ADMIN_PASSWORD_SHA256) return { ok:false, error:'Incorrect email or password.' };
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('pulse-admin-' + token, email, 21600);
  return { ok:true, token:token, email:email, expiresIn:21600 };
}

function requireAdmin_(token) {
  if (!token || !CacheService.getScriptCache().get('pulse-admin-' + token)) throw new Error('Admin session expired. Sign in again.');
}

function adminList_(data) {
  requireAdmin_(data.token);
  const sheet = bookingSheet_();
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues() : [];
  return { ok:true, bookings:rows.filter(function(row){ return row[1]; }).map(bookingFromRow_), settings:settings_(), gymSchedule:gymSchedule_() };
}

function adminUpdateBooking_(data) {
  requireAdmin_(data.token);
  const sheet = bookingSheet_();
  const row = bookingRow_(sheet, data.bookingId);
  if (!row) return { ok:false, error:'Booking not found in the shared database.' };
  const current = bookingFromRow_(sheet.getRange(row, 1, 1, BOOKING_HEADERS.length).getValues()[0]);
  const next = { service:clean_(data.service || current.service), date:clean_(data.date || current.date), time:clean_(data.time || current.time), status:clean_(data.status || current.status), paymentStatus:clean_(data.paymentStatus || current.paymentStatus) };
  if (current.category === 'Padel' && next.status !== 'Cancelled' && bookingConflict_(sheet, next.service, next.date, next.time, current.durationMinutes || 90, current.id)) return { ok:false, conflict:true, error:'That court overlaps another confirmed booking.' };
  sheet.getRange(row, 7).setValue(next.service);
  sheet.getRange(row, 8).setValue(next.date);
  sheet.getRange(row, 9).setValue(next.time);
  sheet.getRange(row, 13).setValue(next.paymentStatus);
  sheet.getRange(row, 16).setValue(next.status);
  return { ok:true, booking:Object.assign(current, next) };
}

function adminUpdateSettings_(data) {
  requireAdmin_(data.token);
  const next = settings_();
  const price = Number(data.padelCourtPrice), duration = Number(data.padelDurationMinutes);
  if (!Number.isFinite(price) || price < 0) throw new Error('Invalid court price');
  if (!Number.isInteger(duration) || duration < 30 || duration > 480 || duration % 15 !== 0) throw new Error('Booking length must be a 15-minute interval from 30 to 480 minutes.');
  next.padelCourtPrice = price;
  next.padelDurationMinutes = duration;
  PropertiesService.getScriptProperties().setProperty('PULSE_PUBLIC_SETTINGS', JSON.stringify(next));
  return { ok:true, settings:next };
}

function adminSaveClass_(data) {
  requireAdmin_(data.token);
  const sheet = classSheet_();
  const record = { id:clean_(data.id || ('GC-' + new Date().getTime())), name:clean_(data.name), date:clean_(data.date), time:clean_(data.time), endTime:clean_(data.endTime), trainer:clean_(data.trainer), capacity:Number(data.capacity || 0), price:Number(data.price || 0), active:String(data.active) === 'true' };
  if (!record.name || !record.date || !record.time || !record.endTime || !record.trainer || record.capacity < 1 || record.price < 0) throw new Error('Complete every class field.');
  const values = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat() : [];
  const index = values.indexOf(record.id);
  const row = index >= 0 ? index + 2 : sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, CLASS_HEADERS.length).setValues([[record.id,record.name,record.date,record.time,record.endTime,record.trainer,record.capacity,record.price,record.active]]);
  return { ok:true, gymClass:record };
}

function adminDeleteClass_(data) {
  requireAdmin_(data.token);
  const sheet = classSheet_();
  if (sheet.getLastRow() < 2) return { ok:true };
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  const index = values.indexOf(String(data.id || ''));
  if (index >= 0) sheet.deleteRow(index + 2);
  return { ok:true };
}

function spreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('PULSE_BOOKING_SPREADSHEET_ID');
  let spreadsheet;
  if (spreadsheetId) spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  else { spreadsheet = SpreadsheetApp.create('Pulse Fitness Reservations'); props.setProperty('PULSE_BOOKING_SPREADSHEET_ID', spreadsheet.getId()); }
  return spreadsheet;
}

function bookingSheet_() {
  const spreadsheet = spreadsheet_();
  let sheet = spreadsheet.getSheetByName(BOOKING_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.getSheets()[0].setName(BOOKING_SHEET_NAME);
  ensureHeaders_(sheet, BOOKING_HEADERS);
  return sheet;
}

function classSheet_() {
  const spreadsheet = spreadsheet_();
  let sheet = spreadsheet.getSheetByName(CLASS_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(CLASS_SHEET_NAME);
  ensureHeaders_(sheet, CLASS_HEADERS);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); sheet.setFrozenRows(1); return; }
  headers.forEach(function(header, index) { if (!sheet.getRange(1, index + 1).getValue()) sheet.getRange(1, index + 1).setValue(header); });
}

function bookingRow_(sheet, bookingId) {
  if (sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(String(bookingId)).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function bookingFromRow_(row) {
  return { id:String(row[1] || ''), name:String(row[2] || ''), email:String(row[3] || ''), phone:String(row[4] || ''), category:String(row[5] || 'Gym'), service:String(row[6] || ''), date:dateValue_(row[7]), time:timeValue_(row[8]), durationMinutes:Number(row[14] || durationMinutes_(row[9]) || 0), amount:Number(row[10] || 0), paymentMethod:String(row[11] || ''), payment:String(row[11] || ''), paymentStatus:String(row[12] || 'Due'), emailDelivery:String(row[13] || ''), status:String(row[15] || 'Confirmed'), classId:String(row[16] || '') };
}

function bookingConflict_(sheet, service, date, time, durationMinutes, ignoreId) {
  if (sheet.getLastRow() < 2) return false;
  const start = timeMinutes_(time), end = start + Number(durationMinutes || 90);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues().some(function(row) {
    const b = bookingFromRow_(row);
    if (!b.id || b.id === ignoreId || b.category !== 'Padel' || b.service !== service || b.date !== date || ['Cancelled','No-show','Fee cleared'].indexOf(b.status) >= 0) return false;
    const otherStart = timeMinutes_(b.time), otherEnd = otherStart + Number(b.durationMinutes || 90);
    return start < otherEnd && otherStart < end;
  });
}

function busyPadel_() {
  const sheet = bookingSheet_();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues().map(bookingFromRow_).filter(function(b){ return b.category === 'Padel' && ['Cancelled','No-show','Fee cleared'].indexOf(b.status) < 0; }).map(function(b){ return { id:b.id, service:b.service, date:b.date, time:b.time, durationMinutes:b.durationMinutes || 90, status:b.status }; });
}

function gymSchedule_() {
  const sheet = classSheet_();
  if (sheet.getLastRow() < 2) sheet.getRange(2, 1, DEFAULT_GYM_CLASSES.length, CLASS_HEADERS.length).setValues(DEFAULT_GYM_CLASSES);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, CLASS_HEADERS.length).getValues().filter(function(row){ return row[0]; }).map(function(row){ return { id:String(row[0]), name:String(row[1]), date:dateValue_(row[2]), time:timeValue_(row[3]), endTime:timeValue_(row[4]), trainer:String(row[5]), capacity:Number(row[6]), price:Number(row[7]), active:Boolean(row[8]) }; });
}

function settings_() {
  try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(PropertiesService.getScriptProperties().getProperty('PULSE_PUBLIC_SETTINGS') || '{}')); }
  catch (error) { return Object.assign({}, DEFAULT_SETTINGS); }
}

function bookingEmail_(b) {
  const firstName = escapeHtml_(String(b.name).split(' ')[0]);
  return '<div style="margin:0;background:#f2f3f0;padding:32px 16px;font-family:Arial,sans-serif;color:#111"><div style="max-width:600px;margin:auto;background:#fff;border-radius:24px;overflow:hidden"><div style="background:#0d0f0d;color:#fff;padding:38px"><div style="font-size:22px;font-weight:800;letter-spacing:4px">PULSE</div><div style="margin-top:44px;color:#75aefe;font-size:11px;font-weight:700;letter-spacing:2px">BOOKING CONFIRMED</div><h1 style="margin:10px 0 12px;font-size:36px;line-height:1.05">You\'re all set, ' + firstName + '.</h1><p style="margin:0;color:#c8cbc8;line-height:1.6">Keep this check-in number and show it at reception when you arrive.</p><div style="display:inline-block;margin:24px 0 10px;padding:14px 18px;border-radius:12px;background:#fff;color:#111;font-weight:800;letter-spacing:2px">' + escapeHtml_(b.bookingId) + '</div></div><div style="padding:30px 38px">' + row_('Experience',b.service) + row_('Date',b.date) + row_('Time',b.time) + (b.duration ? row_('Playing time',b.duration) : '') + row_('Payment',b.paymentStatus) + '<p style="margin:26px 0 0;color:#6e736f;font-size:13px;line-height:1.6">Stretch and Padel cancellations require at least 24 hours\' notice.</p></div></div></div>';
}

function row_(label, value) { return '<div style="display:flex;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid #e4e5e2"><span style="color:#747975">' + escapeHtml_(label) + '</span><strong style="text-align:right">' + escapeHtml_(value) + '</strong></div>'; }
function escapeHtml_(value) { return String(value || '').replace(/[&<>"']/g, function(ch) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; }); }
function clean_(value) { return String(value == null ? '' : value).trim().slice(0, 500); }
function timeMinutes_(value) { const parts=String(value || '00:00').split(':').map(Number); return parts[0] * 60 + parts[1]; }
function durationMinutes_(value) { const text=String(value || ''); const hours=Number((text.match(/(\d+)\s*(?:hr|hour)/i)||[])[1]||0); const minutes=Number((text.match(/(\d+)\s*min/i)||[])[1]||0); return hours*60+minutes; }
function dateValue_(value) { return value instanceof Date ? Utilities.formatDate(value, PULSE_TIMEZONE, 'yyyy-MM-dd') : String(value || ''); }
function timeValue_(value) { return value instanceof Date ? Utilities.formatDate(value, PULSE_TIMEZONE, 'HH:mm') : String(value || '').slice(0,5); }
function dayKey_() { return Utilities.formatDate(new Date(), PULSE_TIMEZONE, 'yyyy-MM-dd'); }
function enforceDailyLimit_() { const props=PropertiesService.getScriptProperties(), key='mail-count-'+dayKey_(); if(Number(props.getProperty(key)||0)>=DAILY_SEND_LIMIT) throw new Error('Daily email limit reached'); if(MailApp.getRemainingDailyQuota()<1) throw new Error('Gmail daily quota reached'); }
function incrementDailyCount_() { const props=PropertiesService.getScriptProperties(), key='mail-count-'+dayKey_(); props.setProperty(key,String(Number(props.getProperty(key)||0)+1)); }

function jsonp_(value, callback) {
  const name = /^[A-Za-z_$][\w$\.]{0,100}$/.test(String(callback || '')) ? String(callback) : 'pulseCallback';
  return ContentService.createTextOutput(name + '(' + JSON.stringify(value).replace(/</g,'\\u003c') + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function bridgeResponse_(value, requestId) {
  const payload = Object.assign({ source:'pulse-backend', requestId:String(requestId || '') }, value);
  const json = JSON.stringify(payload).replace(/</g,'\\u003c').replace(/<\/script/gi,'<\\/script');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>top.postMessage(' + json + ',"*");<\/script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
