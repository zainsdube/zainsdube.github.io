// /admin/admin.js
// Create client
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const ADMIN_EMAILS = window.ADMIN_EMAILS || [];

// ------- Elements -------
const els = {
  // Auth
  signedOut: document.getElementById('authSignedOut'),
  signedIn:  document.getElementById('authSignedIn'),
  userEmail: document.getElementById('userEmail'),
  signOut:   document.getElementById('signOutBtn'),
  loginForm: document.getElementById('loginForm'),

  // Gallery
  tools:     document.getElementById('tools'),
  uploadForm:document.getElementById('uploadForm'),
  file:      document.getElementById('fileInput'),
  caption:   document.getElementById('caption'),
  tag:       document.getElementById('tag'),
  status:    document.getElementById('uploadStatus'),
  grid:      document.getElementById('adminGrid'),
  chips:     document.getElementById('adminChips'),
  refresh:   document.getElementById('refreshBtn'),

  // Events (ADMIN UI)
  eventsCard:     document.getElementById('eventsCard'),
  eventForm:      document.getElementById('eventForm'),
  evDate:         document.getElementById('evDate'),
  evTitle:        document.getElementById('evTitle'),
  evVenue:        document.getElementById('evVenue'),
  evType:         document.getElementById('evType'),
  adminEventsList:document.getElementById('adminEventsList'),
};

let currentTag = 'All';

// ------- Helpers -------
function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}

// ------- Auth gate -------
async function checkAuthAndGate() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    els.signedOut.hidden = false;
    els.signedIn.hidden  = true;
    if (els.tools) els.tools.hidden = true;
    if (els.eventsCard) els.eventsCard.hidden = true;
    return;
  }

  const allowed = isAdminEmail(user.email);
  els.userEmail.textContent = user.email || '';
  els.signedOut.hidden = true;
  els.signedIn.hidden  = false;

  // Gate admin-only tools
  if (els.tools) els.tools.hidden = !allowed;
  if (els.eventsCard) els.eventsCard.hidden = !allowed;

  if (!allowed) alert('This account is not allowed to access admin tools.');
}

// React to auth changes
supabase.auth.onAuthStateChange((_evt, _session) => {
  checkAuthAndGate();
  loadGallery();
  loadAdminEvents();
});

// ------- Auth actions -------
els.loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.currentTarget.querySelector('#email').value.trim();
  const password = e.currentTarget.querySelector('#password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
});

els.signOut?.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// ------- Gallery -------
els.uploadForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = els.file.files[0];
  if (!file) return alert('Choose an image first.');

  els.status.textContent = 'Uploading...';

  const folder = new Date().toISOString().slice(0,7); // YYYY-MM
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${folder}/${Date.now()}_${safe}`;

  // Upload to Storage bucket 'gallery'
  const { error: upErr } = await supabase.storage
    .from('gallery')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (upErr) {
    els.status.textContent = 'Error';
    return alert(upErr.message);
  }

  // Get public URL
  const { data: pub } = supabase.storage.from('gallery').getPublicUrl(path);
  const url = pub?.publicUrl;

  // Insert metadata row
  const caption = els.caption.value.trim();
  const tag     = els.tag.value.trim() || 'General';

  const { error: insErr } = await supabase
    .from('gallery')
    .insert([{ path, url, caption, tag }]);

  if (insErr) {
    els.status.textContent = 'Error';
    return alert(insErr.message);
  }

  els.uploadForm.reset();
  els.status.textContent = 'Uploaded ✔';
  setTimeout(() => els.status.textContent = 'Ready', 1200);

  loadGallery();
});

els.refresh?.addEventListener('click', () => loadGallery());

async function loadGallery() {
  const { data: rows, error } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    els.grid.innerHTML = '<div class="muted">Could not load gallery.</div>';
    return;
  }

  const tags = Array.from(new Set(['All', ...rows.map(r => r.tag || 'General')]));
  renderChips(tags);

  const list = currentTag === 'All' ? rows : rows.filter(r => (r.tag || 'General') === currentTag);
  renderGrid(list);
}

function renderChips(tags) {
  els.chips.innerHTML = '';
  tags.forEach(tag => {
    const b = document.createElement('button');
    b.className = 'chip' + (tag === currentTag ? ' active' : '');
    b.textContent = tag;
    b.addEventListener('click', () => {
      currentTag = tag;
      [...els.chips.children].forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      loadGallery();
    });
    els.chips.appendChild(b);
  });
}

function renderGrid(rows) {
  els.grid.innerHTML = '';
  if (!rows.length) {
    els.grid.innerHTML = '<div class="muted">No images yet.</div>';
    return;
  }

  rows.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card gal-item';

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.caption || 'Gallery image';
    img.loading = 'lazy';
    img.className = 'gal-img';

    const meta = document.createElement('div');
    meta.className = 'gal-meta';
    meta.innerHTML = `
      <div class="gal-cap">${item.caption || 'Untitled'}</div>
      <div class="gal-sub">${item.tag || 'General'}</div>
    `;

    const actions = document.createElement('div');
    actions.style = 'display:flex;gap:.5rem;margin:.75rem 1rem 1rem';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteItem(item));
    actions.appendChild(delBtn);

    card.appendChild(img);
    card.appendChild(meta);
    card.appendChild(actions);

    els.grid.appendChild(card);
  });
}

async function deleteItem(item) {
  if (!confirm('Delete this image?')) return;

  await supabase.storage.from('gallery').remove([item.path]).catch(() => {});
  await supabase.from('gallery').delete().eq('id', item.id);

  loadGallery();
}

// ------- Events (ADMIN UI) -------
function fmtDateHuman(val) {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val || '');
  try {
    return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  } catch {
    return d.toDateString();
  }
}

async function loadAdminEvents() {
  if (!els.adminEventsList) return;
  els.adminEventsList.innerHTML = '<div class="muted">Loading events…</div>';

  // Show upcoming first (>= today), ascending
  const today = new Date().toISOString().slice(0,10);
  const { data: rows, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true });

  if (error) {
    console.error(error);
    els.adminEventsList.innerHTML = '<div class="muted">Could not load events.</div>';
    return;
  }

  renderAdminEvents(rows || []);
}

function renderAdminEvents(rows) {
  els.adminEventsList.innerHTML = '';
  if (!rows.length) {
    els.adminEventsList.innerHTML = '<div class="muted">No upcoming events.</div>';
    return;
  }

  rows.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.35rem">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
          <strong>${ev.title || ''}</strong>
          <div class="muted small">${fmtDateHuman(ev.date)}</div>
        </div>
        <div class="muted small">${ev.venue ? ev.venue : ''}</div>
        <div class="muted small">${ev.type ? ('Type: ' + ev.type) : ''}</div>
        <div style="display:flex;gap:.5rem;margin-top:.5rem">
          <button class="btn btn-outline" data-del="${ev.id}">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return;
      const { error } = await supabase.from('events').delete().eq('id', ev.id);
      if (error) {
        alert(error.message);
      } else {
        loadAdminEvents();
      }
    });

    els.adminEventsList.appendChild(card);
  });
}

els.eventForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const date  = els.evDate?.value;
  const title = els.evTitle?.value?.trim();
  const venue = els.evVenue?.value?.trim() || '';
  const type  = els.evType?.value?.trim()  || '';

  if (!date || !title) {
    return alert('Please provide date and title.');
  }

  const { error } = await supabase.from('events').insert([{ date, title, venue, type }]);
  if (error) {
    alert(error.message);
    return;
  }

  // reset & reload
  els.eventForm.reset();
  loadAdminEvents();
});

// ------- Boot -------
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndGate();
  await loadGallery();
  await loadAdminEvents();
});
