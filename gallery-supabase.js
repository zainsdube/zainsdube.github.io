// gallery-supabase.js — Paged grid with left/right arrows + lightbox
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// DOM
const galGrid   = document.getElementById('galGrid');
const galChips  = document.getElementById('galChips');
const btnPrev   = document.getElementById('galPrev');
const btnNext   = document.getElementById('galNext');
const pageInfo  = document.getElementById('galPageInfo');

// Lightbox
const lbRoot    = document.getElementById('lightbox');
const lbImg     = document.getElementById('lbImg');
const lbCaption = document.getElementById('lbCaption');
const lbDownload= document.getElementById('lbDownload');

// Paging state
const PAGE_SIZE = 12; // number of images per "page" of the grid
let currentTag   = 'All';
let totalCount   = 0;
let totalPages   = 1;
let pageIndex    = 0; // 0-based

document.addEventListener('DOMContentLoaded', () => {
  boot();
});

// ===== Boot / initial load
async function boot() {
  await buildTags();       // load tags (optional)
  await refreshCount();    // count rows for currentTag
  await loadPage(0);       // load first page
  wire();
}

function wire() {
  btnPrev?.addEventListener('click', () => {
    if (pageIndex > 0) loadPage(pageIndex - 1);
  });
  btnNext?.addEventListener('click', () => {
    if (pageIndex < totalPages - 1) loadPage(pageIndex + 1);
  });

  // Lightbox close: backdrop or X, Esc key; arrows navigate
  lbRoot?.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lbRoot.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
  });
}

// ===== Tag filters (optional)
async function buildTags() {
  if (!galChips) return;

  const { data, error } = await supabase.from('gallery').select('tag');
  if (error) {
    console.error('Tag load error:', error);
    renderChips(['All']);
    return;
  }
  const tags = Array.from(new Set(['All', ...(data || []).map(r => r.tag || 'General')]));
  renderChips(tags);
}

function renderChips(tags) {
  galChips.innerHTML = '';
  tags.forEach(tag => {
    const b = document.createElement('button');
    b.className = 'chip' + (tag === currentTag ? ' active' : '');
    b.textContent = tag;
    b.addEventListener('click', async () => {
      if (tag === currentTag) return;
      currentTag = tag;
      [...galChips.children].forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      await refreshCount();
      await loadPage(0);
    });
    galChips.appendChild(b);
  });
}

// ===== Count + paging
async function refreshCount() {
  // Use a HEAD query to get count without loading rows
  let q = supabase.from('gallery').select('id', { count: 'exact', head: true });
  if (currentTag !== 'All') q = q.eq('tag', currentTag);
  const { count, error } = await q;
  if (error) {
    console.error('Count error:', error);
    totalCount = 0; totalPages = 1; pageIndex = 0;
    updatePagerUI();
    galGrid.innerHTML = '<div class="muted">Could not load gallery.</div>';
    return;
  }
  totalCount = count || 0;
  totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  pageIndex  = Math.min(pageIndex, totalPages - 1);
  updatePagerUI();
}

function updatePagerUI() {
  pageInfo.textContent = `Page ${totalCount ? (pageIndex + 1) : 0} of ${totalPages}`;
  btnPrev.disabled = pageIndex <= 0;
  btnNext.disabled = pageIndex >= totalPages - 1;
}

// ===== Load a page
async function loadPage(index) {
  pageIndex = index;
  updatePagerUI();

  const from = index * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let q = supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (currentTag !== 'All') q = q.eq('tag', currentTag);

  const { data: rows, error } = await q;
  if (error) {
    console.error('Page load error:', error);
    galGrid.innerHTML = '<div class="muted">Could not load gallery.</div>';
    return;
  }

  renderGrid(rows || []);
}

function renderGrid(rows) {
  const frag = document.createDocumentFragment();

  if (!rows.length) {
    galGrid.innerHTML = '<div class="muted">No images in this view.</div>';
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
    img.addEventListener('click', () => openLightbox(item));

    const meta = document.createElement('div');
    meta.className = 'gal-meta';
    meta.innerHTML = `
      <div class="gal-cap">${escapeHTML(item.caption || 'Untitled')}</div>
      <div class="gal-sub">${escapeHTML(item.tag || 'General')}</div>
    `;

    card.appendChild(img);
    card.appendChild(meta);
    frag.appendChild(card);
  });

  galGrid.innerHTML = '';
  galGrid.appendChild(frag);
}

// ===== Lightbox
function openLightbox(item) {
  lbImg.src = item.url;
  lbCaption.textContent = item.caption || 'Untitled';
  // Best-effort download: many browsers respect download attr for same-origin or CORS-allowed.
  // Supabase public URLs allow it; still provide target=_blank fallback.
  lbDownload.href = item.url + (item.url.includes('?') ? '&' : '?') + 'download';
  lbDownload.setAttribute('download', sanitizeFilename(item.caption || 'image') + '.jpg');

  lbRoot.classList.add('open');
  lbRoot.setAttribute('aria-hidden', 'false');

  // Keyboard nav for next/prev while lightbox open
  const onKey = (e) => {
    if (!lbRoot.classList.contains('open')) return;
    if (e.key === 'ArrowRight' && pageIndex < totalPages - 1) {
      loadPage(pageIndex + 1);
    } else if (e.key === 'ArrowLeft' && pageIndex > 0) {
      loadPage(pageIndex - 1);
    }
  };
  document.addEventListener('keydown', onKey, { once: true });
}

function closeLightbox() {
  lbRoot.classList.remove('open');
  lbRoot.setAttribute('aria-hidden', 'true');
  lbImg.src = '';
}

// ===== Utils
function escapeHTML(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function sanitizeFilename(s) {
  return s.replace(/[^\w\-\.\s]/g, '_').slice(0, 80).trim() || 'image';
}
