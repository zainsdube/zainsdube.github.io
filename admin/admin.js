// /admin/admin.js
// Requires: window.SUPABASE_URL, window.SUPABASE_ANON_KEY, window.ADMIN_EMAILS (array)
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const ADMIN_EMAILS = window.ADMIN_EMAILS || [];

const els = {
  // auth
  signedOut: document.getElementById('authSignedOut'),
  signedIn:  document.getElementById('authSignedIn'),
  userEmail: document.getElementById('userEmail'),
  signOut:   document.getElementById('signOutBtn'),
  loginForm: document.getElementById('loginForm'),

  // events
  eventsCard:       document.getElementById('eventsCard'),
  eventForm:        document.getElementById('eventForm'),
  eventStatus:      document.getElementById('eventStatus'),
  adminEventsList:  document.getElementById('adminEventsList'),

  // gallery
  tools:      document.getElementById('tools'),
  uploadForm: document.getElementById('uploadForm'),
  file:       document.getElementById('fileInput'),
  caption:    document.getElementById('caption'),
  tag:        document.getElementById('tag'),
  status:     document.getElementById('uploadStatus'),
  grid:       document.getElementById('adminGrid'),
  chips:      document.getElementById('adminChips'),
  refresh:    document.getElementById('refreshBtn'),

  // members
  membersTools:      document.getElementById('membersTools'),
  memberForm:        document.getElementById('memberForm'),
  memberStatus:      document.getElementById('memberStatus'),
  membersList:       document.getElementById('membersList'),
  membersRefreshBtn: document.getElementById('membersRefreshBtn'),

  // enquiries
  enquiriesPanel: document.getElementById('enquiriesPanel'),
  enqList:       document.getElementById('enqList'),
  enqFilter:     document.getElementById('enqFilter'),
  enqRefreshBtn: document.getElementById('enqRefreshBtn'),
};

let currentTag = 'All';

function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}

async function checkAuthAndGate() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // show sign-in panel
    els.signedOut.hidden = false;
    els.signedIn.hidden  = true;

    // hide tools
    els.tools && (els.tools.hidden = true);
    els.eventsCard && (els.eventsCard.hidden = true);
    els.membersTools && (els.membersTools.hidden = true);
    els.enquiriesPanel && (els.enquiriesPanel.hidden = true);
    return;
  }

  const allowed = isAdminEmail(user.email);
  els.userEmail.textContent = user.email || '';
  els.signedOut.hidden = true;
  els.signedIn.hidden  = false;

  // show or hide each tool group by permission
  if (els.tools)        els.tools.hidden        = !allowed;
  if (els.eventsCard)   els.eventsCard.hidden   = !allowed;
  if (els.membersTools) els.membersTools.hidden = !allowed;
  if (els.enquiriesPanel) els.enquiriesPanel.hidden = !allowed;

  if (!allowed) alert('This account is not allowed to access admin tools.');
}

supabase.auth.onAuthStateChange((_evt, _session) => {
  checkAuthAndGate();
  loadGallery();
  loadAdminEvents();
  loadEnquiries();
});

// --------------------- Auth ---------------------
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

// --------------------- Events ---------------------
els.eventForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!els.eventStatus) return;

  const date  = document.getElementById('evDate')?.value;
  const title = document.getElementById('evTitle')?.value.trim();
  const venue = document.getElementById('evVenue')?.value.trim();
  const type  = document.getElementById('evType')?.value.trim();

  if (!date || !title) {
    alert('Date and Title are required.');
    return;
  }

  els.eventStatus.textContent = 'Saving…';
  const { error } = await supabase.from('events').insert([{ date, title, venue, type }]);
  if (error) {
    console.error(error);
    els.eventStatus.textContent = 'Error';
    alert(error.message);
    return;
  }
  els.eventStatus.textContent = 'Saved ✔';
  setTimeout(() => (els.eventStatus.textContent = 'Ready'), 1200);
  e.currentTarget.reset();
  loadAdminEvents();
});

async function loadAdminEvents() {
  if (!els.adminEventsList) return;

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error(error);
    els.adminEventsList.innerHTML = '<div class="muted">Could not load events.</div>';
    return;
  }

  if (!data.length) {
    els.adminEventsList.innerHTML = '<div class="muted">No events yet.</div>';
    return;
  }

  els.adminEventsList.innerHTML = '';
  data.forEach((ev) => {
    const row = document.createElement('div');
    row.className = 'card';
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto';
    row.style.alignItems = 'center';
    row.style.gap = '.5rem';
    row.innerHTML = `
      <div>
        <div><strong>${ev.title || ''}</strong></div>
        <div class="muted small">📅 ${ev.date} • 📍 ${ev.venue || ''} ${ev.type ? '• ' + ev.type : ''}</div>
      </div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-outline" data-del="${ev.id}">Delete</button>
      </div>
    `;
    row.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return;
      await supabase.from('events').delete().eq('id', ev.id);
      loadAdminEvents();
    });
    els.adminEventsList.appendChild(row);
  });
}

// --------------------- Gallery (multi upload) ---------------------
els.uploadForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const files = Array.from(els.file?.files || []);
  if (!files.length) return alert('Choose at least one image.');

  const captionBase = (els.caption?.value || '').trim();
  const tag = (els.tag?.value || 'General').trim();

  let done = 0, fail = 0;
  const updateStatus = () => { if (els.status) els.status.textContent = `Uploading… ${done + fail}/${files.length} (${fail} failed)`; };
  updateStatus();

  for (const file of files) {
    const folder = new Date().toISOString().slice(0,7); // YYYY-MM
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safe}`;

    const { error: upErr } = await supabase.storage
      .from('gallery')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (upErr) { fail++; updateStatus(); continue; }

    const { data: pub } = supabase.storage.from('gallery').getPublicUrl(path);
    const url = pub?.publicUrl;

    const fileBase = safe.replace(/\.[^.]+$/, '');
    const caption  = captionBase ? `${captionBase}${fileBase}` : fileBase;

    const { error: insErr } = await supabase.from('gallery').insert([{ path, url, caption, tag }]);
    if (insErr) { fail++; updateStatus(); continue; }

    done++; updateStatus();
  }

  if (els.status) {
    if (fail === 0) els.status.textContent = `Uploaded ${done}/${files.length} ✔`;
    else if (done > 0) els.status.textContent = `Partial: ${done} ok, ${fail} failed`;
    else els.status.textContent = `All failed (${fail})`;
    setTimeout(() => (els.status.textContent = 'Ready'), 1500);
  }

  els.uploadForm.reset();
  loadGallery();
});

els.refresh?.addEventListener('click', () => loadGallery());

async function loadGallery() {
  if (!els.grid) return;

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
  if (!els.chips) return;
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
  if (!els.grid) return;
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

// --------------------- Enquiries (read + status) ---------------------
els.enqRefreshBtn?.addEventListener('click', () => loadEnquiries());
els.enqFilter?.addEventListener('change', () => loadEnquiries());

async function loadEnquiries() {
  if (!els.enqList) return;

  let query = supabase.from('enquiries').select('*').order('created_at', { ascending: false });
  const f = els.enqFilter?.value || 'all';
  if (f === 'open')    query = query.eq('status', 'open');
  if (f === 'handled') query = query.eq('status', 'handled');

  const { data, error } = await query;
  if (error) {
    console.error(error);
    els.enqList.innerHTML = '<div class="muted">Could not load enquiries.</div>';
    return;
  }

  if (!data.length) {
    els.enqList.innerHTML = '<div class="muted">No enquiries.</div>';
    return;
  }

  els.enqList.innerHTML = '';
  data.forEach((row) => {
    const card = document.createElement('div');
    card.className = 'card';
    const when = new Date(row.created_at).toLocaleString();
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center">
        <div>
          <div><strong>${row.name}</strong> — <a href="mailto:${row.email}">${row.email}</a>${row.phone ? ' — ' + row.phone : ''}</div>
          <div class="muted small">${when}</div>
          <div style="margin-top:.5rem">${(row.message || '').replace(/</g,'&lt;')}</div>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center">
          <span class="badge">${row.status || 'open'}</span>
          ${row.status === 'handled' ? '' : '<button class="btn btn-outline" data-mark="'+row.id+'">Mark handled</button>'}
        </div>
      </div>
    `;
    const btn = card.querySelector('[data-mark]');
    if (btn) {
      btn.addEventListener('click', async () => {
        await supabase.from('enquiries').update({ status: 'handled' }).eq('id', row.id);
        loadEnquiries();
      });
    }
    els.enqList.appendChild(card);
  });
}

// --------------------- Boot ---------------------
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndGate();
  await loadGallery();
  await loadAdminEvents();
  await loadEnquiries();
});
