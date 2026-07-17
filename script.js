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

// ---------- Day planner (shared via a Google Form + Sheet) ----------
// Fill these in once the Form/Sheet exist (see README.md).
const DAY_PLANNER_CONFIG = {
  sheetId: '12cnec0Vt5q7XTV1TypvKn58hk7UMQGYOc-dWym2DGHM',
  formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSdj3Qq4oJ2LP9qtDm_JNKNKtzgUzPlMy9xFhXwHXsA1mV8Pvg/formResponse',
  entryDate: 'entry.295084129',
  entryName: 'entry.774320166',
  entryText: 'entry.1852794116',
  entryTime: 'entry.1117304232',
  entryCategory: 'entry.1406253915',
};

const TIME_RANKS = {
  'toute la journée': -1,
  'matin': 9,
  'déjeuner': 12,
  'après-midi': 14,
  'soirée': 17,
  'dîner': 19,
};
function getTimeRank(label){
  const norm = (label || '').trim().toLowerCase();
  if (norm in TIME_RANKS) return TIME_RANKS[norm];
  const m = /(\d{1,2})/.exec(norm);
  return m ? parseInt(m[1], 10) : 99;
}
function getCategoryMeta(label){
  const norm = (label || '').trim().toLowerCase();
  if (norm === 'nourriture') return { icon: '🍣', cls: 'cat-food' };
  if (norm === 'activité' || norm === 'activite') return { icon: '⛩️', cls: 'cat-activity' };
  return { icon: '✏️', cls: 'cat-custom' };
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
  const timeInput = document.getElementById('dayPanelTime');
  const categoryInput = document.getElementById('dayPanelCategory');
  const textInput = document.getElementById('dayPanelText');
  const formStatus = document.getElementById('dayPanelStatus');
  const dayButtons = document.querySelectorAll('.cal-day.highlight[data-date]');

  const weekGrid = document.getElementById('weekGrid');
  const weekLabel = document.getElementById('weekLabel');
  const weekPrevBtn = document.getElementById('weekPrev');
  const weekNextBtn = document.getElementById('weekNext');
  const TRIP_START = '2026-09-03';
  const TRIP_END = '2026-09-23';

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

  let allEntries = [];
  let currentDate = null;

  function isConfigured(){
    return Object.values(DAY_PLANNER_CONFIG).every(v => v && !v.startsWith('REPLACE'));
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function normalizeSheetDate(raw){
    if (raw == null) return '';
    if (typeof raw === 'string' && raw.startsWith('Date(')) {
      const p = raw.slice(5, -1).split(',').map(Number);
      return `${p[0]}-${String(p[1] + 1).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
    }
    return String(raw).trim();
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
    if (!isConfigured()) return;
    const url = `https://docs.google.com/spreadsheets/d/${DAY_PLANNER_CONFIG.sheetId}/gviz/tq?tqx=out:json&gid=0&_=${Date.now()}`;
    return fetch(url)
      .then(res => res.text())
      .then(text => {
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = (data.table && data.table.rows) || [];
        allEntries = rows.map(row => {
          const c = row.c || [];
          return {
            date: normalizeSheetDate(c[1] && c[1].v),
            name: (c[2] && c[2].v) || '',
            text: (c[3] && c[3].v) || '',
            time: (c[4] && c[4].v) || '',
            category: (c[5] && c[5].v) || '',
          };
        }).filter(item => item.date && item.text);
        updateBadges();
        renderWeekView();
      })
      .catch(() => {});
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
        .sort((a, b) => getTimeRank(a.time) - getTimeRank(b.time));

      const body = !inTrip
        ? ''
        : items.length
          ? items.map(item => {
              const cat = getCategoryMeta(item.category);
              return `<div class="week-entry ${cat.cls}">${cat.icon} ${escapeHtml(item.text)}</div>`;
            }).join('')
          : '<p class="week-day-empty">—</p>';

      return `<div class="week-day${inTrip ? ' clickable' : ' muted'}" ${inTrip ? `data-date="${dateStr}"` : ''}>
        <div class="week-day-label">${label}</div>
        ${body}
      </div>`;
    }).join('');

    if (weekGrid.dataset.bound !== 'true') {
      weekGrid.addEventListener('click', e => {
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

  function renderEntriesFor(dateStr){
    const items = allEntries
      .filter(item => item.date === dateStr)
      .slice()
      .sort((a, b) => getTimeRank(a.time) - getTimeRank(b.time));
    if (!items.length) {
      entriesEl.innerHTML = '<p class="day-panel-status">Rien de prévu pour l\'instant. Soyez le premier !</p>';
      return;
    }
    entriesEl.innerHTML = items.map(item => {
      const cat = getCategoryMeta(item.category);
      return `<div class="day-entry ${cat.cls}">
        <div class="day-entry-meta">
          ${item.time ? `<span class="day-entry-time">🕐 ${escapeHtml(item.time)}</span>` : ''}
          ${item.category ? `<span class="day-entry-category">${cat.icon} ${escapeHtml(item.category)}</span>` : ''}
        </div>
        <p><span class="day-entry-name">${escapeHtml(item.name)} :</span>${escapeHtml(item.text)}</p>
      </div>`;
    }).join('');
  }

  function selectDay(dateStr, btn){
    currentDate = dateStr;
    dayButtons.forEach(b => b.classList.toggle('active-day', b === btn));

    const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    titleEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    const savedName = localStorage.getItem('familyName');
    if (savedName) nameInput.value = savedName;
    timeInput.value = '';
    categoryInput.value = '';
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
    const time = timeInput.value.trim();
    const category = categoryInput.value.trim();
    const text = textInput.value.trim();
    if (!name || !time || !category || !text) return;
    localStorage.setItem('familyName', name);

    const submitBtn = form.querySelector('button');
    submitBtn.disabled = true;
    formStatus.textContent = 'Envoi...';

    const body = new FormData();
    body.append(DAY_PLANNER_CONFIG.entryDate, currentDate);
    body.append(DAY_PLANNER_CONFIG.entryName, name);
    body.append(DAY_PLANNER_CONFIG.entryText, text);
    body.append(DAY_PLANNER_CONFIG.entryTime, time);
    body.append(DAY_PLANNER_CONFIG.entryCategory, category);

    fetch(DAY_PLANNER_CONFIG.formAction, { method: 'POST', mode: 'no-cors', body })
      .catch(() => {})
      .finally(() => {
        allEntries.push({ date: currentDate, name, text, time, category });
        updateBadges();
        renderEntriesFor(currentDate);
        renderWeekView();
        textInput.value = '';
        timeInput.value = '';
        categoryInput.value = '';
        formStatus.textContent = 'Ajouté !';
        submitBtn.disabled = false;
        setTimeout(() => { formStatus.textContent = ''; }, 2000);
      });
  });

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
