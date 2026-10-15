const PULSE_TIMEZONE = 'Africa/Dar_es_Salaam';
const DAILY_SEND_LIMIT = 25;
const BOOKING_SHEET_NAME = 'Reservations';
const BOOKING_HEADERS = ['Created at','Booking ID','Name','Email','Phone','Category','Service','Date','Time','Duration','Amount TZS','Payment method','Payment status','Email status'];

function doGet() {
  return ContentService.createTextOutput('Pulse Mail is ready.');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = (e && e.parameter) || {};
    if (data.website || data.type !== 'booking-confirmation') return response_({ ok:false, error:'Invalid request' });
    const required = ['bookingId','name','email','service','date','time','paymentStatus'];
    required.forEach(function(field) {
      if (!String(data[field] || '').trim()) throw new Error('Missing ' + field);
    });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Invalid email');
    if (!/^PLS-\d+$/.test(data.bookingId)) throw new Error('Invalid booking');

    const sheet = bookingSheet_();
    const existingRow = bookingRow_(sheet, data.bookingId);
    if (existingRow) return response_({ ok:true, bookingId:data.bookingId, duplicate:true });

    enforceDailyLimit_();
    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, BOOKING_HEADERS.length).setValues([[
      Utilities.formatDate(new Date(), PULSE_TIMEZONE, 'yyyy-MM-dd HH:mm:ss'), data.bookingId, data.name,
      data.email, data.phone || '', data.category || '', data.service, data.date, data.time,
      data.duration || '', Number(data.amount || 0), data.paymentMethod || '', data.paymentStatus, 'Sending'
    ]]);
    const subject = 'Your Pulse reservation is confirmed — ' + data.bookingId;
    try {
      MailApp.sendEmail({
        to: data.email,
        subject: subject,
        name: 'Pulse Fitness',
        replyTo: 'hassijatanisha@gmail.com',
        htmlBody: bookingEmail_(data)
      });
      sheet.getRange(row, 14).setValue('Sent');
    } catch (mailError) {
      sheet.getRange(row, 14).setValue('Failed: ' + String(mailError.message || mailError));
      throw mailError;
    }
    incrementDailyCount_();
    return response_({ ok:true, bookingId:data.bookingId });
  } catch (error) {
    console.error(error);
    return response_({ ok:false, error:String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function bookingSheet_() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('PULSE_BOOKING_SPREADSHEET_ID');
  let spreadsheet;
  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('Pulse Fitness Reservations');
    spreadsheetId = spreadsheet.getId();
    props.setProperty('PULSE_BOOKING_SPREADSHEET_ID', spreadsheetId);
  }
  let sheet = spreadsheet.getSheetByName(BOOKING_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.getSheets()[0].setName(BOOKING_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function bookingRow_(sheet, bookingId) {
  if (sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(bookingId).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function bookingEmail_(b) {
  const firstName = escapeHtml_(String(b.name).split(' ')[0]);
  return '<div style="margin:0;background:#f2f3f0;padding:32px 16px;font-family:Arial,sans-serif;color:#111">' +
    '<div style="max-width:600px;margin:auto;background:#fff;border-radius:24px;overflow:hidden">' +
      '<div style="background:#0d0f0d;color:#fff;padding:38px">' +
        '<div style="font-size:22px;font-weight:800;letter-spacing:4px">PULSE</div>' +
        '<div style="margin-top:44px;color:#75aefe;font-size:11px;font-weight:700;letter-spacing:2px">BOOKING CONFIRMED</div>' +
        '<h1 style="margin:10px 0 12px;font-size:36px;line-height:1.05">You\'re all set, ' + firstName + '.</h1>' +
        '<p style="margin:0;color:#c8cbc8;line-height:1.6">Keep this check-in number and show it at reception when you arrive.</p>' +
        '<div style="display:inline-block;margin:24px 0 10px;padding:14px 18px;border-radius:12px;background:#fff;color:#111;font-weight:800;letter-spacing:2px">' + escapeHtml_(b.bookingId) + '</div>' +
      '</div>' +
      '<div style="padding:30px 38px">' + row_('Experience', b.service) + row_('Date', b.date) + row_('Time', b.time) + (b.duration ? row_('Playing time', b.duration) : '') + row_('Payment', b.paymentStatus) +
        '<p style="margin:26px 0 0;color:#6e736f;font-size:13px;line-height:1.6">Stretch and Padel cancellations require at least 24 hours\' notice.</p>' +
      '</div>' +
    '</div></div>';
}

function row_(label, value) {
  return '<div style="display:flex;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid #e4e5e2"><span style="color:#747975">' + escapeHtml_(label) + '</span><strong style="text-align:right">' + escapeHtml_(value) + '</strong></div>';
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, function(ch) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; });
}

function dayKey_() {
  return Utilities.formatDate(new Date(), PULSE_TIMEZONE, 'yyyy-MM-dd');
}

function enforceDailyLimit_() {
  const props = PropertiesService.getScriptProperties();
  const key = 'mail-count-' + dayKey_();
  if (Number(props.getProperty(key) || 0) >= DAILY_SEND_LIMIT) throw new Error('Daily demo email limit reached');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Gmail daily quota reached');
}

function incrementDailyCount_() {
  const props = PropertiesService.getScriptProperties();
  const key = 'mail-count-' + dayKey_();
  props.setProperty(key, String(Number(props.getProperty(key) || 0) + 1));
}

function response_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
