/* Salterio Music Ensemble – Vanilla JS */

// ------- Data -------
const repertoire = [
  { title: 'Hymn: Blessed Assurance', category: 'Hymns',           duration: '3:42', emoji: '📘' },
  { title: 'A Cappella: Psalm 150',   category: 'Scripture Song',  duration: '2:58', emoji: '📖' },
  { title: 'Anthem: The Lord Is My Light', category: 'Anthem',     duration: '4:21', emoji: '🎼' },
  { title: 'Chorale: Holy, Holy, Holy',    category: 'Chorale',    duration: '3:05', emoji: '🎵' },
  { title: 'African Medley: Tumutendeleze',category: 'Medley',     duration: '5:10', emoji: '🌍' },
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
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      mobileMenu.hidden = !open;
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Smooth scroll (buttons/links with data-scroll)
  $$('[data-scroll]').forEach(el => el.addEventListener('click', e => {
    const target = e.currentTarget.getAttribute('data-scroll');
    if (target) {
      e.preventDefault();
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (mobileMenu && !mobileMenu.hidden) {
      mobileMenu.classList.remove('open');
      mobileMenu.hidden = true;
      navToggle?.setAttribute('aria-expanded','false');
    }
  }));

  // Adaptive navbar over hero
  const hero = document.querySelector('.hero');
  const navWrap = document.querySelector('.nav-wrap');
  if (hero && navWrap) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) navWrap.classList.add('nav--on-hero');
        else navWrap.classList.remove('nav--on-hero');
      },
      { root: null, rootMargin: '-64px 0px 0px 0px', threshold: 0.01 }
    );
    io.observe(hero);
  }

  // Mini player (simulated)
  const playBtn = $('#playBtn');
  const bar = $('#progressBar');
  let playing = false, prog = 0, timer = null;
  const tick = () => { prog = (prog + 1) % 101; if (bar) bar.style.width = prog + '%'; };
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.textContent = playing ? '⏸' : '▶️';
      playBtn.setAttribute('aria-pressed', String(playing));
      if (playing) { timer = setInterval(tick, 120); } else { clearInterval(timer); }
    });
  }

  // Repertoire with filters
  const repGrid = $('#repGrid');
  const repChips = $('#repChips');
  const categories = ['All', ...new Set(repertoire.map(r => r.category))];

  function renderRepertoire(active = 'All') {
    if (!repGrid) return;
    repGrid.innerHTML = '';
    const list = active === 'All' ? repertoire : repertoire.filter(r => r.category === active);
    list.forEach(item => {
      const card = document.createElement('div'); card.className = 'rep-card';
      card.innerHTML = `
        <div class="rep-thumb" data-cat="${item.category}">
          <div class="rep-emoji">${item.emoji || '🎵'}</div>
        </div>
        <div class="rep-body">
          <div class="rep-top">
            <div class="rep-title">${item.title}</div>
            <span class="rep-badge">${item.category}</span>
          </div>
          <div class="rep-time">Typical duration: ${item.duration}</div>
        </div>
      `;
      repGrid.appendChild(card);
    });
  }

  function renderChips(active = 'All') {
    if (!repChips) return;
    repChips.innerHTML = '';
    categories.forEach(cat => {
      const b = document.createElement('button');
      b.className = 'chip' + (cat === active ? ' active' : '');
      b.textContent = cat;
      b.addEventListener('click', () => { renderChips(cat); renderRepertoire(cat); });
      repChips.appendChild(b);
    });
  }

  // Members
  const memGrid = $('#memGrid');
  function renderMembers() {
    if (!memGrid) return;
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
  const newsBtn = $('#newsBtn');
  if (newsBtn) {
    newsBtn.addEventListener('click', () => {
      const v = $('#newsEmail')?.value.trim();
      if (!v || !/^\S+@\S+\.\S+$/.test(v)) return alert('Please enter a valid email.');
      alert('Thank you for subscribing!');
      $('#newsEmail').value = '';
    });
  }



  // Theme toggle
  const themeBtn = $('#themeBtn');
  const applyTheme = (mode) => {
    document.body.classList.toggle('dark', mode === 'dark');
    if (themeBtn) themeBtn.textContent = mode === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('salterio-theme', mode);
  };
  applyTheme(localStorage.getItem('salterio-theme') || 'light');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = document.body.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  // Footer year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Initial renders
  renderChips();
  renderRepertoire();
  renderMembers();

  // Self-tests
  console.group('Salterio self-tests');
  console.assert(document.querySelector('#repertoire') !== null, 'Repertoire section exists');
  console.assert(repertoire.length > 0, 'Repertoire has items');
  console.assert(members.length > 0, 'Members have items');
  console.groupEnd();
});
