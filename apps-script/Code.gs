// Backend for the day planner on the trip guide site.
// Deploy as a Web App (Execute as: Me, Who has access: Anyone) and paste
// the resulting /exec URL into DAY_PLANNER_CONFIG.apiUrl in script.js.
//
// Storage: a sheet tab called "Entries" in whichever Spreadsheet this
// script is bound to (created automatically on first use).

const SHEET_NAME = 'Entries';
const HEADERS = ['ID', 'Date', 'Name', 'Category', 'Emoji', 'Text', 'Order', 'CreatedAt'];

const CHECKLIST_SHEET_NAME = 'Checklist';
const CHECKLIST_HEADERS = ['Name', 'ItemsJSON', 'UpdatedAt'];

const STATS_SHEET_NAME = 'Stats';
// EventsAdded/Deleted = day-planner entries (dated, tied to a specific
// day). IdeasAdded/Deleted = "Idées en vrac" backlog entries (undated).
const STATS_HEADERS = ['Name', 'EventsAdded', 'EventsDeleted', 'IdeasAdded', 'IdeasDeleted', 'TimeSpentSeconds', 'UpdatedAt'];

// The family iCloud Shared Album (public, read-only). Its token is the
// part after "#" in the album's public link.
const ICLOUD_ALBUM_TOKEN = 'B24JtdOXmKOo432';
const ICLOUD_PHOTOS_CACHE_KEY = 'icloud_photos_v1';
const ICLOUD_PHOTOS_CACHE_SECONDS = 300; // 5 min: browsers can't call Apple's API
// directly (no CORS headers), so this proxies + caches it to stay fast and
// avoid hammering Apple's servers on every page load.

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

function getChecklistSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CHECKLIST_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CHECKLIST_SHEET_NAME);
    sheet.appendRow(CHECKLIST_HEADERS);
  }
  return sheet;
}

function getStatsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(STATS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(STATS_SHEET_NAME);
    sheet.appendRow(STATS_HEADERS);
  }
  return sheet;
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
  if (e.parameter && e.parameter.type === 'photos') {
    return jsonResponse_({ photos: getIcloudPhotosCached_() });
  }

  if (e.parameter && e.parameter.type === 'checklist') {
    return jsonResponse_({ items: getChecklistItems_(e.parameter.name || '') });
  }

  if (e.parameter && e.parameter.type === 'stats') {
    return jsonResponse_({ stats: getStats_(e.parameter.name || '') });
  }

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

// ---------- iCloud Shared Album photo gallery ----------

function getIcloudPhotosCached_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(ICLOUD_PHOTOS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  let photos = [];
  try {
    photos = fetchIcloudPhotos_();
  } catch (err) {
    return []; // fail quietly: show an empty gallery rather than break the page
  }
  cache.put(ICLOUD_PHOTOS_CACHE_KEY, JSON.stringify(photos), ICLOUD_PHOTOS_CACHE_SECONDS);
  return photos;
}

function icloudFetch_(host, token, path, payload) {
  const resp = UrlFetchApp.fetch(`https://${host}/${token}/sharedstreams/${path}`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  return JSON.parse(resp.getContentText());
}

function fetchIcloudPhotos_() {
  const token = ICLOUD_ALBUM_TOKEN;
  let host = 'p23-sharedstreams.icloud.com';
  let stream;
  // Apple's API replies with a different partition host on first contact;
  // re-request against that host once it's given.
  for (let i = 0; i < 3; i++) {
    stream = icloudFetch_(host, token, 'webstream', { streamCtag: null });
    if (stream['X-Apple-MMe-Host'] && stream['X-Apple-MMe-Host'] !== host) {
      host = stream['X-Apple-MMe-Host'];
      continue;
    }
    break;
  }

  const photos = stream.photos || [];
  if (!photos.length) return [];

  const guids = photos.map(p => p.photoGuid);
  const assetData = icloudFetch_(host, token, 'webasseturls', { photoGuids: guids });
  const items = assetData.items || {};

  function urlFor(derivative) {
    if (!derivative) return null;
    const asset = items[derivative.checksum];
    return asset ? `https://${asset.url_location}${asset.url_path}` : null;
  }

  return photos
    .map(p => {
      const derivatives = p.derivatives || {};
      const sizes = Object.keys(derivatives).map(Number).sort((a, b) => a - b);
      const thumbSize = sizes.find(s => s >= 300) || sizes[sizes.length - 1];
      const fullSize = sizes[sizes.length - 1];
      return {
        guid: p.photoGuid,
        caption: p.caption || '',
        thumbUrl: urlFor(derivatives[String(thumbSize)]),
        fullUrl: urlFor(derivatives[String(fullSize)]),
        dateCreated: p.dateCreated || p.batchDateCreated || null,
      };
    })
    .filter(p => p.thumbUrl)
    .sort((a, b) => (b.dateCreated || '').localeCompare(a.dateCreated || ''));
}

// ---------- Personal checklist (per name, no real auth) ----------

function normalizeChecklistName_(name) {
  return (name || '').trim().toLowerCase();
}

function getChecklistItems_(name) {
  const key = normalizeChecklistName_(name);
  if (!key) return {};
  const sheet = getChecklistSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizeChecklistName_(data[i][0]) === key) {
      try {
        return JSON.parse(data[i][1] || '{}');
      } catch (err) {
        return {};
      }
    }
  }
  return {};
}

function saveChecklistItems_(name, items) {
  const key = normalizeChecklistName_(name);
  if (!key) return;
  const sheet = getChecklistSheet_();
  const data = sheet.getDataRange().getValues();
  const itemsJson = JSON.stringify(items || {});
  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    if (normalizeChecklistName_(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(itemsJson);
      sheet.getRange(i + 1, 3).setValue(now);
      return;
    }
  }
  sheet.appendRow([name.trim(), itemsJson, now]);
}

// ---------- Personal activity stats (per name) ----------
// Numeric columns instead of a JSON blob (unlike the checklist) so
// increments are a simple read-modify-write on each cell — the client
// reports deltas ("+1 event added", "+37s spent") since its last save
// rather than absolute totals, so it doesn't need to know the current
// server-side total first.

function findStatsRow_(sheet, data, key) {
  for (let i = 1; i < data.length; i++) {
    if (normalizeChecklistName_(data[i][0]) === key) return i; // 0-based index into data
  }
  return -1;
}

// Field name -> 0-based index into a data row, matching STATS_HEADERS.
const STATS_FIELDS = ['eventsAdded', 'eventsDeleted', 'ideasAdded', 'ideasDeleted', 'timeSpentSeconds'];

function emptyStats_() {
  const stats = {};
  STATS_FIELDS.forEach(f => { stats[f] = 0; });
  return stats;
}

function getStats_(name) {
  const key = normalizeChecklistName_(name);
  if (!key) return emptyStats_();
  const sheet = getStatsSheet_();
  const data = sheet.getDataRange().getValues();
  const i = findStatsRow_(sheet, data, key);
  if (i === -1) return emptyStats_();
  const stats = {};
  STATS_FIELDS.forEach((f, idx) => { stats[f] = Number(data[i][idx + 1]) || 0; });
  return stats;
}

function incrementStats_(name, deltas) {
  const key = normalizeChecklistName_(name);
  if (!key) return getStats_(name);
  const sheet = getStatsSheet_();
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  const i = findStatsRow_(sheet, data, key);
  const current = i === -1 ? emptyStats_() : {};
  if (i !== -1) STATS_FIELDS.forEach((f, idx) => { current[f] = Number(data[i][idx + 1]) || 0; });

  const updated = {};
  STATS_FIELDS.forEach(f => { updated[f] = current[f] + (Number(deltas[f]) || 0); });

  if (i === -1) {
    sheet.appendRow([name.trim()].concat(STATS_FIELDS.map(f => updated[f])).concat([now]));
  } else {
    const row = i + 1;
    STATS_FIELDS.forEach((f, idx) => sheet.getRange(row, idx + 2).setValue(updated[f]));
    sheet.getRange(row, STATS_FIELDS.length + 2).setValue(now);
  }
  return updated;
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
    applyOrder_(sheet, data, body.orderedIds || []);
    return jsonResponse_({ success: true });
  }

  if (body.action === 'move') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === body.id) {
        sheet.getRange(i + 1, 2).setValue(body.date); // column 2 = Date
        break;
      }
    }
    applyOrder_(sheet, data, body.orderedIds || []);
    return jsonResponse_({ success: true });
  }

  if (body.action === 'delete') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === body.id) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return jsonResponse_({ success: true });
  }

  if (body.action === 'saveChecklist') {
    saveChecklistItems_(body.name || '', body.items || {});
    return jsonResponse_({ success: true });
  }

  if (body.action === 'incrementStats') {
    const stats = incrementStats_(body.name || '', body.deltas || {});
    return jsonResponse_({ success: true, stats: stats });
  }

  return jsonResponse_({ success: false, error: 'Unknown action: ' + body.action });
}

function applyOrder_(sheet, data, orderedIds) {
  orderedIds.forEach((id, index) => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.getRange(i + 1, 7).setValue(index); // column 7 = Order
        break;
      }
    }
  });
}
