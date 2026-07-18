// Auto-swap image placeholders for real photos, if present
document.querySelectorAll('.image-placeholder[data-slot]').forEach(el => {
  const src = el.getAttribute('data-slot');
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url("${src}")`;
    el.classList.add('has-image');
  };
  img.onerror = () => {}; // keep placeholder as-is
  img.src = src;
});

// Interactive Japan map (Leaflet + OpenStreetMap), pinned on Yonezawa,
// Tokyo and Mont Fuji. Wheel-zoom starts off so the map doesn't hijack
// page scrolling; it turns on once the user actually clicks into it.
(function initJapanMap(){
  const mapEl = document.getElementById('japanMap');
  if (!mapEl || !window.L) return;

  const map = L.map(mapEl, { scrollWheelZoom: false, minZoom: 5, maxZoom: 12 });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  function pinIcon(emoji, colorClass){
    return L.divIcon({
      html: `<div class="map-pin ${colorClass}">${emoji}</div>`,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17],
    });
  }

  const points = [
    { lat: 37.9227, lng: 140.1197, emoji: '🏠', color: 'map-pin-home', label: '🏠 Yonezawa — chez nous !' },
    { lat: 35.6812, lng: 139.7671, emoji: '🗼', color: 'map-pin-tokyo', label: '🗼 Tokyo' },
    { lat: 35.3606, lng: 138.7274, emoji: '🗻', color: 'map-pin-fuji', label: '🗻 Mont Fuji' },
  ];

  points.forEach(p => {
    L.marker([p.lat, p.lng], { icon: pinIcon(p.emoji, p.color) }).addTo(map).bindPopup(p.label);
  });

  map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [30, 30] });

  mapEl.addEventListener('click', () => map.scrollWheelZoom.enable());
})();

// Speak Japanese phrases aloud (Web Speech API)
(function initSpeakButtons(){
  const buttons = document.querySelectorAll('.speak-btn');
  if (!buttons.length) return;
  if (!('speechSynthesis' in window)) {
    buttons.forEach(btn => { btn.disabled = true; btn.title = 'Lecture vocale non disponible sur ce navigateur'; });
    return;
  }
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-jp');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
      buttons.forEach(b => b.classList.remove('speaking'));
      btn.classList.add('speaking');
      utterance.onend = () => btn.classList.remove('speaking');
      utterance.onerror = () => btn.classList.remove('speaking');
      window.speechSynthesis.speak(utterance);
    });
  });
})();

// Countdown to the trip
const countdownEl = document.getElementById('countdown');
if (countdownEl) {
  const tripStart = new Date('2026-09-03T00:00:00');
  const tripEnd = new Date('2026-09-23T23:59:59');
  const now = new Date();
  if (now < tripStart) {
    const days = Math.ceil((tripStart - now) / 86400000);
    countdownEl.textContent = `🎉 J-${days} avant le grand départ !`;
  } else if (now <= tripEnd) {
    countdownEl.textContent = `✈️ Vous êtes avec nous en ce moment !`;
  } else {
    countdownEl.textContent = `🎉 On espère que ce séjour vous a plu !`;
  }
}

// Scroll progress bar
const progressBar = document.getElementById('progressBar');
function updateProgress(){
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// Reveal-on-scroll
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// ---------- Day planner (shared via a Google Apps Script Web App) ----------
// Fill this in once the Apps Script is deployed (see README.md).
const DAY_PLANNER_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbzgyAxDzk9eWccFeRXVs1xcjM8AYfo3RNWl5SqmfNOpMk77VY0cg-ZRfeg5GiRnN-dR/exec',
};

const CATEGORY_COLORS = ['cat-color-0', 'cat-color-1', 'cat-color-2', 'cat-color-3', 'cat-color-4'];
function getCategoryColorClass(label){
  const str = (label || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

// Generic drag-to-reorder for a flat list of direct children with [data-id].
// Follows the pointer with a floating clone; the real item silently reorders
// in the background based on which sibling's midpoint it has crossed.
function makeSortable(container, onReorder, onDragStateChange){
  // Uses event delegation, so one listener handles children added later via
  // innerHTML replacement too — guard against attaching more than once per
  // persistent container (e.g. the day panel's entries list is reused across
  // renders, unlike the week view's cells which are recreated each time).
  if (container.dataset.sortableBound === 'true') return;
  container.dataset.sortableBound = 'true';

  let dragItem = null;
  let ghost = null;
  let pointerId = null;
  let offsetX = 0, offsetY = 0;
  let startOrderIds = [];

  function getItems(){
    return Array.from(container.children).filter(el => el.hasAttribute('data-id'));
  }

  function onPointerDown(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.day-entry-delete')) return;
    const item = e.target.closest('[data-id]');
    if (!item || item.parentElement !== container) return;

    dragItem = item;
    pointerId = e.pointerId;
    startOrderIds = getItems().map(el => el.getAttribute('data-id'));

    const rect = item.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    ghost = item.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '999';
    ghost.style.opacity = '.95';
    ghost.style.boxShadow = '0 10px 24px -6px rgba(0,0,0,.4)';
    document.body.appendChild(ghost);

    item.classList.add('dragging');
    if (onDragStateChange) onDragStateChange(true);

    try { item.setPointerCapture(pointerId); } catch (err) { /* no-op */ }
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e){
    if (!dragItem || !ghost) return;
    ghost.style.left = (e.clientX - offsetX) + 'px';
    ghost.style.top = (e.clientY - offsetY) + 'px';

    const items = getItems().filter(el => el !== dragItem);
    const pointerY = e.clientY;
    let placed = false;
    for (const sib of items) {
      const rect = sib.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (pointerY < mid) {
        if (sib.previousElementSibling !== dragItem) container.insertBefore(dragItem, sib);
        placed = true;
        break;
      }
    }
    if (!placed && container.lastElementChild !== dragItem) {
      container.appendChild(dragItem);
    }
  }

  function onPointerUp(){
    if (!dragItem) return;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    dragItem.classList.remove('dragging');
    if (ghost) { ghost.remove(); ghost = null; }

    const newOrderIds = getItems().map(el => el.getAttribute('data-id'));
    dragItem = null;

    const changed = newOrderIds.some((id, i) => id !== startOrderIds[i]);
    if (changed) onReorder(newOrderIds);

    if (onDragStateChange) setTimeout(() => onDragStateChange(false), 50);
  }

  container.addEventListener('pointerdown', onPointerDown);
}

// Drag-to-reorder-or-move across several containers at once (the week
// view's day cells): dragging within one cell reorders it, dragging into a
// different cell moves the entry to that day. Containers are expected to be
// freshly created each call (the week view is rebuilt from scratch on every
// render), so no idempotency guard is needed here unlike makeSortable.
function makeCrossDaySortable(containers, onReorder, onMove, onDragStateChange){
  const containerList = Array.from(containers);
  let dragItem = null;
  let ghost = null;
  let pointerId = null;
  let offsetX = 0, offsetY = 0;
  let originContainer = null;
  let currentContainer = null;

  function getItems(container){
    return Array.from(container.children).filter(el => el.hasAttribute('data-id'));
  }

  function containerAt(x, y){
    for (const c of containerList) {
      const rect = c.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return c;
    }
    return null;
  }

  function refreshEmptyState(container){
    const placeholder = container.querySelector('.week-day-empty');
    if (getItems(container).length === 0) {
      if (!placeholder) container.innerHTML = '<p class="week-day-empty">—</p>';
    } else if (placeholder) {
      placeholder.remove();
    }
  }

  function onPointerDown(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const item = e.target.closest('[data-id]');
    if (!item || !containerList.includes(item.parentElement)) return;

    dragItem = item;
    originContainer = item.parentElement;
    currentContainer = originContainer;
    pointerId = e.pointerId;

    const rect = item.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    ghost = item.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '999';
    ghost.style.opacity = '.95';
    ghost.style.boxShadow = '0 10px 24px -6px rgba(0,0,0,.4)';
    document.body.appendChild(ghost);

    item.classList.add('dragging');
    if (onDragStateChange) onDragStateChange(true);

    try { item.setPointerCapture(pointerId); } catch (err) { /* no-op */ }
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e){
    if (!dragItem) return;
    ghost.style.left = (e.clientX - offsetX) + 'px';
    ghost.style.top = (e.clientY - offsetY) + 'px';

    const hoverContainer = containerAt(e.clientX, e.clientY);
    if (hoverContainer && hoverContainer !== currentContainer) {
      const placeholder = hoverContainer.querySelector('.week-day-empty');
      if (placeholder) placeholder.remove();
      hoverContainer.appendChild(dragItem);
      currentContainer = hoverContainer;
    }
    if (!currentContainer) return;

    const items = getItems(currentContainer).filter(el => el !== dragItem);
    const pointerY = e.clientY;
    let placed = false;
    for (const sib of items) {
      const rect = sib.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (pointerY < mid) {
        if (sib.previousElementSibling !== dragItem) currentContainer.insertBefore(dragItem, sib);
        placed = true;
        break;
      }
    }
    if (!placed && currentContainer.lastElementChild !== dragItem) {
      currentContainer.appendChild(dragItem);
    }
  }

  function onPointerUp(){
    if (!dragItem) return;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    dragItem.classList.remove('dragging');
    if (ghost) { ghost.remove(); ghost = null; }

    const itemId = dragItem.getAttribute('data-id');
    const fromContainer = originContainer;
    const finalContainer = currentContainer;
    const finalOrderIds = getItems(finalContainer).map(el => el.getAttribute('data-id'));
    dragItem = null;

    refreshEmptyState(finalContainer);
    if (fromContainer !== finalContainer) refreshEmptyState(fromContainer);

    const toDate = finalContainer.closest('.week-day').getAttribute('data-date');
    if (fromContainer !== finalContainer) {
      onMove(itemId, toDate, finalOrderIds);
    } else {
      onReorder(toDate, finalOrderIds);
    }

    originContainer = null;
    currentContainer = null;
    if (onDragStateChange) setTimeout(() => onDragStateChange(false), 50);
  }

  containerList.forEach(c => c.addEventListener('pointerdown', onPointerDown));
}

(function initDayPlanner(){
  const emptyState = document.getElementById('dayPanelEmpty');
  const contentState = document.getElementById('dayPanelContent');
  if (!emptyState || !contentState) return;

  const titleEl = document.getElementById('dayPanelTitle');
  const entriesEl = document.getElementById('dayPanelEntries');
  const resetBtn = document.getElementById('dayPanelReset');
  const form = document.getElementById('dayPanelForm');
  const nameInput = document.getElementById('dayPanelName');
  const categoryInput = document.getElementById('dayPanelCategory');
  const categoryEmojiInput = document.getElementById('dayPanelCategoryEmoji');
  const emojiPicker = document.getElementById('dayPanelEmojiPicker');
  const emojiTrigger = document.getElementById('dayPanelEmojiTrigger');
  const emojiGrid = document.getElementById('dayPanelEmojiGrid');
  const emojiPreview = document.getElementById('dayPanelEmojiPreview');
  const textInput = document.getElementById('dayPanelText');
  const formStatus = document.getElementById('dayPanelStatus');
  const dayButtons = document.querySelectorAll('.cal-day.highlight[data-date]');

  const backlogList = document.getElementById('backlogList');
  const backlogAddBtn = document.getElementById('backlogAddBtn');
  const backlogForm = document.getElementById('backlogForm');
  const backlogInput = document.getElementById('backlogInput');

  const weekGrid = document.getElementById('weekGrid');
  const weekLabel = document.getElementById('weekLabel');
  const weekPrevBtn = document.getElementById('weekPrev');
  const weekNextBtn = document.getElementById('weekNext');
  const TRIP_START = '2026-09-03';
  const TRIP_END = '2026-09-23';

  let allEntries = [];
  let currentDate = null;
  let isDraggingEntry = false;

  function resetEmojiPicker(){
    categoryEmojiInput.value = '';
    emojiPreview.textContent = '🙂';
    emojiGrid.hidden = true;
    emojiGrid.querySelectorAll('button.selected').forEach(b => b.classList.remove('selected'));
  }

  emojiTrigger.addEventListener('click', () => { emojiGrid.hidden = !emojiGrid.hidden; });
  emojiGrid.querySelectorAll('button[data-emoji]').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji');
      categoryEmojiInput.value = emoji;
      emojiPreview.textContent = emoji;
      emojiGrid.querySelectorAll('button.selected').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      emojiGrid.hidden = true;
    });
  });
  document.addEventListener('click', e => {
    if (!emojiGrid.hidden && !emojiPicker.contains(e.target)) emojiGrid.hidden = true;
  });

  function toDateStr(date){
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  const weeks = (function buildWeeks(){
    const result = [];
    const cursor = new Date('2026-08-31T00:00:00'); // Monday of the first week
    for (let w = 0; w < 4; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(cursor);
        dt.setDate(cursor.getDate() + w * 7 + d);
        days.push(dt);
      }
      result.push(days);
    }
    return result;
  })();
  let currentWeekIndex = (function findDefaultWeek(){
    const todayStr = toDateStr(new Date());
    for (let i = 0; i < weeks.length; i++) {
      const first = toDateStr(weeks[i][0]);
      const last = toDateStr(weeks[i][6]);
      if (todayStr >= first && todayStr <= last) return i;
    }
    return 0;
  })();

  function isConfigured(){
    return DAY_PLANNER_CONFIG.apiUrl && !DAY_PLANNER_CONFIG.apiUrl.startsWith('REPLACE');
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function updateBadges(){
    const counts = {};
    allEntries.forEach(e => { counts[e.date] = (counts[e.date] || 0) + 1; });
    dayButtons.forEach(btn => {
      const n = counts[btn.getAttribute('data-date')] || 0;
      btn.classList.toggle('has-entries', n > 0);
      if (n > 0) btn.setAttribute('data-count', n); else btn.removeAttribute('data-count');
    });
  }

  function fetchAllEntries(){
    if (!isConfigured()) return Promise.resolve();
    return fetch(`${DAY_PLANNER_CONFIG.apiUrl}?_=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        allEntries = (data.entries || []).slice().sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        updateBadges();
        renderWeekView();
        renderBacklog();
      })
      .catch(() => {});
  }

  function reorderDay(dateStr, orderedIds){
    // Optimistic local update first, so the UI feels instant.
    orderedIds.forEach((id, index) => {
      const entry = allEntries.find(e => e.id === id);
      if (entry) entry.order = index;
    });
    updateBadges();
    renderWeekView();
    if (dateStr === currentDate) renderEntriesFor(dateStr);
    if (!isConfigured()) return;
    fetch(DAY_PLANNER_CONFIG.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'reorder', date: dateStr, orderedIds }),
    }).catch(() => {});
  }

  function moveEntry(itemId, toDate, orderedIds){
    const entry = allEntries.find(e => e.id === itemId);
    const fromDate = entry ? entry.date : null;
    if (entry) entry.date = toDate;
    orderedIds.forEach((id, index) => {
      const e2 = allEntries.find(en => en.id === id);
      if (e2) e2.order = index;
    });
    updateBadges();
    renderWeekView();
    if (fromDate === currentDate || toDate === currentDate) renderEntriesFor(currentDate);
    if (!isConfigured()) return;
    fetch(DAY_PLANNER_CONFIG.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'move', id: itemId, date: toDate, orderedIds }),
    }).catch(() => {});
  }

  function deleteEntry(id){
    if (!confirm('Supprimer cette idée ?')) return;
    const entry = allEntries.find(e => e.id === id);
    const dateStr = entry ? entry.date : null;
    allEntries = allEntries.filter(e => e.id !== id);
    updateBadges();
    renderWeekView();
    if (dateStr === currentDate) renderEntriesFor(currentDate);
    if (!isConfigured()) return;
    fetch(DAY_PLANNER_CONFIG.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    }).catch(() => {});
  }

  entriesEl.addEventListener('click', e => {
    const btn = e.target.closest('.day-entry-delete');
    if (!btn) return;
    deleteEntry(btn.getAttribute('data-id'));
  });

  // Ideas backlog: entries with no date attached (date === ''), shown in
  // place of the day panel's empty state. Reuses the same add/delete API.
  function renderBacklog(){
    if (!backlogList) return;
    const items = allEntries
      .filter(item => item.date === '')
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    if (!items.length) {
      backlogList.innerHTML = '<p class="backlog-empty">Aucune idée pour l\'instant.</p>';
      return;
    }
    backlogList.innerHTML = items.map(item =>
      `<div class="backlog-item"><span>${escapeHtml(item.text)}</span><button type="button" class="backlog-item-delete" data-id="${item.id}" aria-label="Supprimer">✕</button></div>`
    ).join('');
  }

  if (backlogList) {
    backlogList.addEventListener('click', e => {
      const btn = e.target.closest('.backlog-item-delete');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!confirm('Supprimer cette idée ?')) return;
      allEntries = allEntries.filter(en => en.id !== id);
      renderBacklog();
      if (!isConfigured()) return;
      fetch(DAY_PLANNER_CONFIG.apiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id }),
      }).catch(() => {});
    });

    backlogAddBtn.addEventListener('click', () => {
      backlogForm.hidden = !backlogForm.hidden;
      if (!backlogForm.hidden) backlogInput.focus();
    });

    backlogForm.addEventListener('submit', e => {
      e.preventDefault();
      const text = backlogInput.value.trim();
      if (!text || !isConfigured()) return;
      const submitBtn = backlogForm.querySelector('button');
      submitBtn.disabled = true;
      fetch(DAY_PLANNER_CONFIG.apiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'add', date: '', name: '', category: '', emoji: '', text }),
      })
        .then(res => res.json())
        .then(result => {
          if (!result || !result.success) throw new Error('add failed');
          allEntries.push({ id: result.id, date: '', name: '', category: '', emoji: '', text, order: result.order });
          renderBacklog();
          backlogInput.value = '';
          backlogForm.hidden = true;
        })
        .catch(() => {
          alert("Erreur lors de l'ajout, réessayez.");
        })
        .finally(() => {
          submitBtn.disabled = false;
        });
    });
  }

  function renderWeekView(){
    if (!weekGrid) return;
    const days = weeks[currentWeekIndex];
    const first = days[0], last = days[6];
    weekLabel.textContent = `${first.getDate()} ${first.toLocaleDateString('fr-FR', { month: 'short' })} – ${last.getDate()} ${last.toLocaleDateString('fr-FR', { month: 'short' })}`;
    weekPrevBtn.disabled = currentWeekIndex === 0;
    weekNextBtn.disabled = currentWeekIndex === weeks.length - 1;

    weekGrid.innerHTML = days.map(dt => {
      const dateStr = toDateStr(dt);
      const inTrip = dateStr >= TRIP_START && dateStr <= TRIP_END;
      const label = dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      const items = allEntries
        .filter(item => item.date === dateStr)
        .slice()
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

      const body = !inTrip
        ? ''
        : items.length
          ? items.map(item => `<div class="week-entry ${getCategoryColorClass(item.category)}" data-id="${item.id}">${item.emoji || '🏷️'} ${escapeHtml(item.text)}</div>`).join('')
          : '<p class="week-day-empty">—</p>';

      return `<div class="week-day${inTrip ? ' clickable' : ' muted'}" ${inTrip ? `data-date="${dateStr}"` : ''}>
        <div class="week-day-label">${label}</div>
        <div class="week-day-entries">${body}</div>
      </div>`;
    }).join('');

    const dropTargets = Array.from(weekGrid.querySelectorAll('.week-day.clickable .week-day-entries'));
    makeCrossDaySortable(
      dropTargets,
      (dateStr, orderedIds) => reorderDay(dateStr, orderedIds),
      (itemId, toDate, orderedIds) => moveEntry(itemId, toDate, orderedIds),
      dragging => { isDraggingEntry = dragging; }
    );

    if (weekGrid.dataset.bound !== 'true') {
      weekGrid.addEventListener('click', e => {
        if (isDraggingEntry) return;
        const cell = e.target.closest('.week-day.clickable');
        if (!cell) return;
        const btn = document.querySelector(`.cal-day.highlight[data-date="${cell.getAttribute('data-date')}"]`);
        if (btn) {
          selectDay(cell.getAttribute('data-date'), btn);
          document.getElementById('dayPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      weekGrid.dataset.bound = 'true';
    }
  }

  function updateScrollFade(){
    const fade = document.getElementById('dayPanelScrollFade');
    if (!fade) return;
    fade.classList.toggle('show', entriesEl.scrollHeight > entriesEl.clientHeight + 2);
  }

  function renderEntriesFor(dateStr){
    const items = allEntries
      .filter(item => item.date === dateStr)
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    if (!items.length) {
      entriesEl.innerHTML = '<p class="day-panel-status">Rien de prévu pour l\'instant. Soyez le premier !</p>';
      updateScrollFade();
      return;
    }
    entriesEl.innerHTML = items.map(item => `<div class="day-entry ${getCategoryColorClass(item.category)}" data-id="${item.id}">
        <button type="button" class="day-entry-delete" data-id="${item.id}" aria-label="Supprimer">✕</button>
        <div class="day-entry-meta">
          <span class="day-entry-category">${item.emoji || '🏷️'} ${escapeHtml(item.category)}</span>
        </div>
        <p><span class="day-entry-name">${escapeHtml(item.name)} :</span>${escapeHtml(item.text)}</p>
      </div>`).join('');
    updateScrollFade();
    makeSortable(entriesEl, orderedIds => reorderDay(dateStr, orderedIds), dragging => { isDraggingEntry = dragging; });
  }

  function selectDay(dateStr, btn){
    currentDate = dateStr;
    dayButtons.forEach(b => b.classList.toggle('active-day', b === btn));

    const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    titleEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    const savedName = localStorage.getItem('familyName');
    if (savedName) nameInput.value = savedName;
    categoryInput.value = '';
    resetEmojiPicker();
    textInput.value = '';
    formStatus.textContent = '';

    emptyState.hidden = true;
    contentState.hidden = false;

    if (!isConfigured()) {
      entriesEl.innerHTML = '<p class="day-panel-status">La liste partagée n\'est pas encore configurée.</p>';
      return;
    }
    entriesEl.innerHTML = '<p class="day-panel-status">Chargement...</p>';
    renderEntriesFor(dateStr);
  }

  function resetPanel(){
    currentDate = null;
    dayButtons.forEach(b => b.classList.remove('active-day'));
    emptyState.hidden = false;
    contentState.hidden = true;
  }

  dayButtons.forEach(btn => {
    btn.addEventListener('click', () => selectDay(btn.getAttribute('data-date'), btn));
  });
  resetBtn.addEventListener('click', resetPanel);

  if (weekPrevBtn && weekNextBtn) {
    weekPrevBtn.addEventListener('click', () => { currentWeekIndex--; renderWeekView(); });
    weekNextBtn.addEventListener('click', () => { currentWeekIndex++; renderWeekView(); });
    renderWeekView();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!isConfigured() || !currentDate) {
      formStatus.textContent = "La liste partagée n'est pas encore configurée.";
      return;
    }
    const name = nameInput.value.trim();
    const category = categoryInput.value.trim();
    const emoji = categoryEmojiInput.value.trim();
    const text = textInput.value.trim();
    if (!name) { formStatus.textContent = 'Merci de renseigner votre prénom.'; return; }
    if (!category) { formStatus.textContent = 'Merci de choisir une catégorie.'; return; }
    if (!emoji) { formStatus.textContent = 'Choisissez un émoji pour cette catégorie.'; return; }
    if (!text) { formStatus.textContent = 'Merci de décrire votre idée.'; return; }
    localStorage.setItem('familyName', name);

    const submitBtn = form.querySelector('button');
    submitBtn.disabled = true;
    formStatus.textContent = 'Envoi...';

    fetch(DAY_PLANNER_CONFIG.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'add', date: currentDate, name, category, emoji, text }),
    })
      .then(res => res.json())
      .then(result => {
        if (!result || !result.success) throw new Error('add failed');
        allEntries.push({ id: result.id, date: currentDate, name, category, emoji, text, order: result.order });
        updateBadges();
        renderEntriesFor(currentDate);
        renderWeekView();
        textInput.value = '';
        categoryInput.value = '';
        resetEmojiPicker();
        formStatus.textContent = 'Ajouté !';
        setTimeout(() => { formStatus.textContent = ''; }, 2000);
      })
      .catch(() => {
        formStatus.textContent = "Erreur lors de l'envoi, réessayez.";
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  renderBacklog();
  fetchAllEntries();
})();

// Active dot nav tracking
const sections = document.querySelectorAll('.section');
const dots = document.querySelectorAll('.dot-nav .dot');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      dots.forEach(d => d.classList.toggle('active', d.getAttribute('href') === `#${id}`));
    }
  });
}, { threshold: 0.5 });
sections.forEach(s => sectionObserver.observe(s));
