/* Salterio Music Ensemble – Vanilla JS */

// ------- Data -------
const repertoire = [
  { title: 'Hymn: Blessed Assurance', category: 'Hymns',        duration: '3:42' },
  { title: 'A Cappella: Psalm 150',   category: 'Scripture Song', duration: '2:58' },
  { title: 'Anthem: The Lord Is My Light', category: 'Anthem',  duration: '4:21' },
  { title: 'Chorale: Holy, Holy, Holy',    category: 'Chorale', duration: '3:05' },
  { title: 'African Medley: Tumutendeleze',category: 'Medley',  duration: '5:10' },
];

const events = [
  { date: '2025-10-05', title: 'Sabbath Special Music — Northmead SDA', venue: 'Lusaka',   type: 'Worship' },
  { date: '2025-10-18', title: 'Youth Week of Prayer Concert',          venue: 'Kitwe',    type: 'Concert' },
  { date: '2025-11-09', title: 'Community Outreach — Prison Ministry',  venue: 'Chingola', type: 'Outreach' },
];

const members = [
  { name: 'Director — Mr. K. Banda',   section: 'Conductor' },
  { name: 'Soprano Leader — Grace M.', section: 'Soprano'   },
  { name: 'Alto Leader — Linda C.',    section: 'Alto'      },
  { name: 'Tenor Leader — Victor S.',  section: 'Tenor'     },
  { name: 'Bass Leader — Nathan P.',   section: 'Bass'      },
];

// ------- Helpers -------
const $  = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

// ------- UI Wiring -------
document.addEventListener('DOMContentLoaded', () => {
  // Navbar mobile
  const navToggle = $('#navToggle');
  const mobileMenu = $('#mobileMenu');
  navToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    mobileMenu.hidden = !open;
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // Smooth scroll (buttons/links with data-scroll)
  $$('[data-scroll]').forEach(el => el.addEventListener('click', e => {
    const target = e.currentTarget.getAttribute('data-scroll');
    if (target) { e.preventDefault(); document.querySelector(target).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (!mobileMenu.hidden) { mobileMenu.classList.remove('open'); mobileMenu.hidden = true; navToggle.setAttribute('aria-expanded','false'); }
  }));

  // Mini player (simulated)
  const playBtn = $('#playBtn');
  const bar = $('#progressBar');
  let playing = false, prog = 0, timer = null;
  const tick = () => { prog = (prog + 1) % 101; bar.style.width = prog + '%'; };
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸' : '▶️';
    playBtn.setAttribute('aria-pressed', String(playing));
    if (playing) { timer = setInterval(tick, 120); } else { clearInterval(timer); }
  });

  // Repertoire with filters
  const repGrid = $('#repGrid');
  const repChips = $('#repChips');
  const categories = ['All', ...new Set(repertoire.map(r => r.category))];

  function renderRepertoire(active = 'All') {
    repGrid.innerHTML = '';
    const list = active === 'All' ? repertoire : repertoire.filter(r => r.category === active);
    list.forEach(item => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;">
          <div style="font-weight:700">${item.title}</div>
          <span class="badge">${item.category}</span>
        </div>
        <div class="muted" style="margin-top:.35rem;">Typical duration: ${item.duration}</div>
      `;
      repGrid.appendChild(card);
    });
  }

  function renderChips(active = 'All') {
    repChips.innerHTML = '';
    categories.forEach(cat => {
      const b = document.createElement('button');
      b.className = 'chip' + (cat === active ? ' active' : '');
      b.textContent = cat;
      b.addEventListener('click', () => { renderChips(cat); renderRepertoire(cat); });
      repChips.appendChild(b);
    });
  }

  // Events
  const eventsGrid = $('#eventsGrid');
  function renderEvents() {
    eventsGrid.innerHTML = '';
    events.forEach(ev => {
      const d = new Date(ev.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div style="font-weight:700; margin-bottom:.35rem;">${ev.title}</div>
        <div class="muted">📅 <strong>${d}</strong></div>
        <div class="muted" style="margin-top:.25rem;">📍 ${ev.venue}</div>
        <div style="margin-top:.5rem;"><span class="badge">${ev.type}</span></div>
      `;
      eventsGrid.appendChild(card);
    });
  }

  // Members
  const memGrid = $('#memGrid');
  function renderMembers() {
    memGrid.innerHTML = '';
    members.forEach(m => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--primary-1),var(--primary-2));"></div>
          <div>
            <div style="font-weight:700;">${m.name}</div>
            <div class="muted" style="font-size:.9rem;">${m.section}</div>
          </div>
        </div>`;
      memGrid.appendChild(card);
    });
  }

  // Newsletter
  $('#newsBtn').addEventListener('click', () => {
    const v = $('#newsEmail').value.trim();
    if (!v || !/^\S+@\S+\.\S+$/.test(v)) return alert('Please enter a valid email.');
    alert('Thank you for subscribing!');
    $('#newsEmail').value = '';
  });

  // Partner form
  $('#partnerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!data.name || !/^\S+@\S+\.\S+$/.test(data.email)) return alert('Please fill your name and a valid email.');
    console.log('Partner enquiry:', data);
    alert('Thank you! Your enquiry has been received.');
    e.currentTarget.reset();
  });

  // Theme toggle
  const themeBtn = $('#themeBtn');
  const applyTheme = (mode) => {
    document.body.classList.toggle('dark', mode === 'dark');
    themeBtn.textContent = mode === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('salterio-theme', mode);
  };
  applyTheme(localStorage.getItem('salterio-theme') || 'light');
  themeBtn.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  });

  // Footer year
  $('#year').textContent = new Date().getFullYear();

  // Initial renders
  renderChips();
  renderRepertoire();
  renderEvents();
  renderMembers();

  // ---------- Lightweight Self-Tests (console.assert) ----------
  console.group('Salterio self-tests');
  console.assert(document.querySelector('#repertoire') !== null, 'Repertoire section exists');
  console.assert(categories.length >= 2, 'Repertoire categories detected');
  console.assert(repertoire.length > 0, 'Repertoire has items');
  console.assert(events.length > 0, 'Events have items');
  console.assert(members.length > 0, 'Members have items');
  console.groupEnd();
});
