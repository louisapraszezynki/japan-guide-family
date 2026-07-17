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
};

(function initDayPlanner(){
  const overlay = document.getElementById('dayModalOverlay');
  if (!overlay) return;

  const titleEl = document.getElementById('dayModalTitle');
  const entriesEl = document.getElementById('dayModalEntries');
  const closeBtn = document.getElementById('dayModalClose');
  const form = document.getElementById('dayModalForm');
  const nameInput = document.getElementById('dayModalName');
  const textInput = document.getElementById('dayModalText');
  const formStatus = document.getElementById('dayModalFormStatus');
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

  function renderEntries(items){
    if (!items.length) {
      entriesEl.innerHTML = '<p class="day-modal-status">Rien de prévu pour l\'instant. Soyez le premier !</p>';
      return;
    }
    entriesEl.innerHTML = items.map(item =>
      `<div class="day-entry"><span class="day-entry-name">${escapeHtml(item.name)}</span>${escapeHtml(item.text)}</div>`
    ).join('');
  }

  function fetchEntries(dateStr){
    if (!isConfigured()) {
      entriesEl.innerHTML = '<p class="day-modal-status">La liste partagée n\'est pas encore configurée.</p>';
      return;
    }
    entriesEl.innerHTML = '<p class="day-modal-status">Chargement...</p>';
    const url = `https://docs.google.com/spreadsheets/d/${DAY_PLANNER_CONFIG.sheetId}/gviz/tq?tqx=out:json&gid=0&_=${Date.now()}`;
    fetch(url)
      .then(res => res.text())
      .then(text => {
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = (data.table && data.table.rows) || [];
        const items = rows.map(row => {
          const c = row.c || [];
          return {
            date: normalizeSheetDate(c[1] && c[1].v),
            name: (c[2] && c[2].v) || '',
            text: (c[3] && c[3].v) || '',
          };
        }).filter(item => item.date === dateStr && item.text);
        renderEntries(items);
      })
      .catch(() => {
        entriesEl.innerHTML = '<p class="day-modal-status">Impossible de charger la liste pour le moment.</p>';
      });
  }

  function openModal(dateStr){
    currentDate = dateStr;
    const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    titleEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    const savedName = localStorage.getItem('familyName');
    if (savedName) nameInput.value = savedName;
    formStatus.textContent = '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    fetchEntries(dateStr);
  }

  function closeModal(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.cal-day.highlight[data-date]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-date')));
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!isConfigured()) {
      formStatus.textContent = "La liste partagée n'est pas encore configurée.";
      return;
    }
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    if (!name || !text) return;
    localStorage.setItem('familyName', name);

    const submitBtn = form.querySelector('button');
    submitBtn.disabled = true;
    formStatus.textContent = 'Envoi...';

    const body = new FormData();
    body.append(DAY_PLANNER_CONFIG.entryDate, currentDate);
    body.append(DAY_PLANNER_CONFIG.entryName, name);
    body.append(DAY_PLANNER_CONFIG.entryText, text);

    fetch(DAY_PLANNER_CONFIG.formAction, { method: 'POST', mode: 'no-cors', body })
      .catch(() => {})
      .finally(() => {
        if (entriesEl.querySelector('.day-modal-status')) entriesEl.innerHTML = '';
        const entry = document.createElement('div');
        entry.className = 'day-entry';
        entry.innerHTML = `<span class="day-entry-name">${escapeHtml(name)}</span>${escapeHtml(text)}`;
        entriesEl.appendChild(entry);
        textInput.value = '';
        formStatus.textContent = 'Ajouté !';
        submitBtn.disabled = false;
        setTimeout(() => { formStatus.textContent = ''; }, 2000);
      });
  });
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
