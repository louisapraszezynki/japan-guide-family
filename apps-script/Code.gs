// Backend for the day planner on the trip guide site.
// Deploy as a Web App (Execute as: Me, Who has access: Anyone) and paste
// the resulting /exec URL into DAY_PLANNER_CONFIG.apiUrl in script.js.
//
// Storage: a sheet tab called "Entries" in whichever Spreadsheet this
// script is bound to (created automatically on first use).

const SHEET_NAME = 'Entries';
const HEADERS = ['ID', 'Date', 'Name', 'Category', 'Emoji', 'Text', 'Order', 'CreatedAt'];

// The family iCloud Shared Album (public, read-only). Its token is the
// part after "#" in the album's public link.
const ICLOUD_ALBUM_TOKEN = 'B24JtdOXmKOo432';
const ICLOUD_PHOTOS_CACHE_KEY = 'icloud_photos_v1';
const ICLOUD_PHOTOS_CACHE_SECONDS = 300; // 5 min: browsers can't call Apple's API
// directly (no CORS headers), so this proxies + caches it to stay fast and
// avoid hammering Apple's servers on every page load.

// Temporary: select this in the function dropdown (no trailing "_" so it's
// visible there, unlike the private helpers) and click Run. It should pop
// up the permissions screen the first time. Delete once photos work.
function testUrlFetch() {
  const resp = UrlFetchApp.fetch('https://www.google.com');
  Logger.log(resp.getResponseCode());
}

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
  if (e.parameter && e.parameter.type === 'photos') {
    return jsonResponse_({ photos: getIcloudPhotosCached_() });
  }

  // Bypasses the cache and the try/catch in getIcloudPhotosCached_ so we
  // can see the real error instead of a silently-empty gallery. Temporary,
  // for debugging why photos aren't showing up.
  if (e.parameter && e.parameter.type === 'photos-debug') {
    try {
      return jsonResponse_({ photos: fetchIcloudPhotos_() });
    } catch (err) {
      return jsonResponse_({ error: String(err), stack: err.stack || null });
    }
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
