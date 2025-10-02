// gallery-supabase.js — read-only gallery (public)
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const galGrid  = document.getElementById('galGrid');
const galChips = document.getElementById('galChips');

let currentTag = 'All';

async function loadGallery() {
  const { data: rows, error } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase gallery error:', error);
    galGrid.innerHTML = `<div class="muted">Could not load gallery.</div>`;
    return;
  }

  const tags = Array.from(new Set(['All', ...rows.map(r => r.tag || 'General')]));
  renderChips(tags);

  const list = currentTag === 'All' ? rows : rows.filter(r => (r.tag || 'General') === currentTag);
  renderGrid(list);
}

function renderChips(tags) {
  galChips.innerHTML = '';
  tags.forEach(tag => {
    const b = document.createElement('button');
    b.className = 'chip' + (tag === currentTag ? ' active' : '');
    b.textContent = tag;
    b.addEventListener('click', () => {
      currentTag = tag;
      [...galChips.children].forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      loadGallery();
    });
    galChips.appendChild(b);
  });
}

function renderGrid(rows) {
  galGrid.innerHTML = '';
  if (!rows.length) {
    galGrid.innerHTML = '<div class="muted">No images yet.</div>';
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

    card.appendChild(img);
    card.appendChild(meta);
    galGrid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', loadGallery);
