// /admin/admin.js
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const ADMIN_EMAILS = window.ADMIN_EMAILS || [];

/* ------------ Elements ------------ */
const els = {
  // auth
  signedOut: document.getElementById('authSignedOut'),
  signedIn:  document.getElementById('authSignedIn'),
  userEmail: document.getElementById('userEmail'),
  signOut:   document.getElementById('signOutBtn'),
  loginForm: document.getElementById('loginForm'),

  // gallery tools
  tools:       document.getElementById('tools'),
  uploadForm:  document.getElementById('uploadForm'),
  file:        document.getElementById('fileInput'),
  caption:     document.getElementById('caption'),
  tag:         document.getElementById('tag'),
  status:      document.getElementById('uploadStatus'),
  grid:        document.getElementById('adminGrid'),
  chips:       document.getElementById('adminChips'),
  refresh:     document.getElementById('refreshBtn'),

  // members tools
  membersTools:     document.getElementById('membersTools'),
  memberForm:       document.getElementById('memberForm'),
  m_name:           document.getElementById('m_name'),
  m_section:        document.getElementById('m_section'),
  m_role:           document.getElementById('m_role'),
  m_sort:           document.getElementById('m_sort'),
  m_photo:          document.getElementById('m_photo'),
  memberStatus:     document.getElementById('memberStatus'),
  membersRefresh:   document.getElementById('membersRefreshBtn'),
  membersList:      document.getElementById('membersList'),
};

let currentTag = 'All';

/* ------------ auth gating ------------ */
function isAdminEmail(email){ return !!email && ADMIN_EMAILS.includes(email); }

async function checkAuthAndGate() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    els.signedOut.hidden = false;
    els.signedIn.hidden  = true;
    els.tools.hidden     = true;
    els.membersTools.hidden = true;
    return;
  }

  const allowed = isAdminEmail(user.email);
  els.userEmail.textContent = user.email || '';
  els.signedOut.hidden = true;
  els.signedIn.hidden  = false;
  els.tools.hidden     = !allowed;
  els.membersTools.hidden = !allowed;

  if (!allowed) alert('This account is not allowed to access admin tools.');
}

supabase.auth.onAuthStateChange((_evt, _session) => {
  checkAuthAndGate();
  loadGallery();
  loadMembers();
});

/* ------------ auth events ------------ */
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

/* =====================================
   Gallery admin
   ===================================== */
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
    delBtn.addEventListener('click', () => deleteGalleryItem(item));
    actions.appendChild(delBtn);

    card.appendChild(img);
    card.appendChild(meta);
    card.appendChild(actions);

    els.grid.appendChild(card);
  });
}

async function deleteGalleryItem(item) {
  if (!confirm('Delete this image?')) return;
  try { await supabase.storage.from('gallery').remove([item.path]); } catch {}
  await supabase.from('gallery').delete().eq('id', item.id);
  loadGallery();
}

/* =====================================
   Members admin
   ===================================== */
els.memberForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = els.m_name.value.trim();
  const section = els.m_section.value.trim();
  const role    = els.m_role.value.trim();
  const sort    = parseInt(els.m_sort.value || '0', 10);
  const file    = els.m_photo.files[0];

  if (!name || !section) return alert('Name and section are required.');

  els.memberStatus.textContent = 'Saving...';

  let photo_url = null;

  // Optional headshot upload to 'members' bucket
  if (file) {
    const folder = new Date().toISOString().slice(0,7); // YYYY-MM
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${folder}/${Date.now()}_${safe}`;

    const { error: upErr } = await supabase.storage
      .from('members')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (upErr) {
      els.memberStatus.textContent = 'Error';
      return alert('Upload failed: ' + upErr.message);
    }
    const { data: pub } = supabase.storage.from('members').getPublicUrl(path);
    photo_url = pub?.publicUrl || null;
  }

  const { error: insErr } = await supabase
    .from('members')
    .insert([{ name, section, role, sort, photo_url }]);

  if (insErr) {
    els.memberStatus.textContent = 'Error';
    return alert(insErr.message);
  }

  els.memberForm.reset();
  els.memberStatus.textContent = 'Saved ✔';
  setTimeout(() => els.memberStatus.textContent = 'Ready', 1200);

  loadMembers();
});

els.membersRefresh?.addEventListener('click', () => loadMembers());

async function loadMembers() {
  const { data: rows, error } = await supabase
    .from('members')
    .select('*')
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    els.membersList.innerHTML = '<div class="muted">Could not load members.</div>';
    return;
  }

  renderMembers(rows || []);
}

function renderMembers(rows) {
  els.membersList.innerHTML = '';
  if (!rows.length) {
    els.membersList.innerHTML = '<div class="muted">No members yet.</div>';
    return;
  }

  rows.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:56px;height:56px;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,var(--primary-1),var(--primary-2));display:grid;place-items:center;">
            ${m.photo_url ? `<img src="${m.photo_url}" alt="${escapeHtml(m.name)}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-weight:800;color:#fff;">${getInitials(m.name)}</span>`}
          </div>
          <div>
            <div style="font-weight:700">${escapeHtml(m.name)}</div>
            <div class="muted small">${escapeHtml(m.section)}${m.role ? ' • ' + escapeHtml(m.role) : ''} • order ${m.sort ?? 0}</div>
          </div>
        </div>
        <div style="display:flex;gap:.5rem;">
          <button class="btn btn-outline" data-del="${m.id}">Delete</button>
        </div>
      </div>
    `;

    // hook delete
    card.querySelector('[data-del]')?.addEventListener('click', () => deleteMember(m));

    els.membersList.appendChild(card);
  });
}

async function deleteMember(m) {
  if (!confirm(`Delete ${m.name}?`)) return;
  // Try to delete headshot file if it's from our 'members' bucket
  if (m.photo_url) {
    try {
      const url = new URL(m.photo_url);
      // path like: /storage/v1/object/public/members/2025-10/123_name.jpg
      const parts = url.pathname.split('/public/members/');
      if (parts[1]) {
        const storagePath = decodeURIComponent(parts[1]);
        await supabase.storage.from('members').remove([storagePath]);
      }
    } catch {}
  }
  await supabase.from('members').delete().eq('id', m.id);
  loadMembers();
}

/* ------------ utils ------------ */
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function getInitials(name=''){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join(''); }

/* ------------ boot ------------ */
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndGate();
  await loadGallery();
  await loadMembers();
});
