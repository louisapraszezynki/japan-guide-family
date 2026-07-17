// Backend for the day planner on the trip guide site.
// Deploy as a Web App (Execute as: Me, Who has access: Anyone) and paste
// the resulting /exec URL into DAY_PLANNER_CONFIG.apiUrl in script.js.
//
// Storage: a sheet tab called "Entries" in whichever Spreadsheet this
// script is bound to (created automatically on first use).

const SHEET_NAME = 'Entries';
const HEADERS = ['ID', 'Date', 'Name', 'Category', 'Emoji', 'Text', 'Order', 'CreatedAt'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  // Force the Date column to plain text so Sheets never auto-converts
  // "2026-09-03" into an actual Date value on write (which would silently
  // shift by the sheet's timezone and break every date comparison).
  sheet.getRange('B:B').setNumberFormat('@');
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Defensive: normalizes a cell value back to "YYYY-MM-DD" even if it was
// already auto-converted to a real Date (e.g. rows written before the
// plain-text fix above, or someone editing the sheet by hand).
function normalizeDate_(val) {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return val;
}

function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // skip header row
  const entries = rows
    .map(r => ({
      id: r[0],
      date: normalizeDate_(r[1]),
      name: r[2],
      category: r[3],
      emoji: r[4],
      text: r[5],
      order: r[6],
    }))
    .filter(entry => entry.id);
  return jsonResponse_({ entries: entries });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ success: false, error: 'Invalid JSON body' });
  }

  const sheet = getSheet_();

  if (body.action === 'add') {
    const id = Utilities.getUuid();
    const now = new Date();
    const data = sheet.getDataRange().getValues();
    const sameDay = data.slice(1).filter(r => normalizeDate_(r[1]) === body.date);
    const maxOrder = sameDay.length ? Math.max.apply(null, sameDay.map(r => Number(r[6]) || 0)) : -1;
    const order = maxOrder + 1;
    sheet.appendRow([id, body.date, body.name, body.category, body.emoji, body.text, order, now]);
    return jsonResponse_({ success: true, id: id, order: order });
  }

  if (body.action === 'reorder') {
    const data = sheet.getDataRange().getValues();
    const orderedIds = body.orderedIds || [];
    orderedIds.forEach((id, index) => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.getRange(i + 1, 7).setValue(index); // column 7 = Order
          break;
        }
      }
    });
    return jsonResponse_({ success: true });
  }

  return jsonResponse_({ success: false, error: 'Unknown action: ' + body.action });
}
