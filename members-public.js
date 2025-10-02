// /members-public.js
// Requires: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//           <script src="/supabase-config.js"></script>

(() => {
  const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const memGrid = document.getElementById('memGrid');
  if (!memGrid) return;

  async function loadMembers() {
    const { data: rows, error } = await supabase
      .from('members')
      .select('*')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('members fetch error:', error);
      memGrid.innerHTML = '<div class="muted">Could not load members.</div>';
      return;
    }

    render(rows || []);
  }

  function render(list) {
    memGrid.innerHTML = '';
    if (!list.length) {
      memGrid.innerHTML = '<div class="muted">No members yet.</div>';
      return;
    }

    list.forEach(m => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:56px;height:56px;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,var(--primary-1),var(--primary-2));display:grid;place-items:center;">
            ${m.photo_url ? `<img src="${m.photo_url}" alt="${escapeHtml(m.name)}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-weight:800;color:#fff;">${getInitials(m.name)}</span>`}
          </div>
          <div>
            <div style="font-weight:700;">${escapeHtml(m.name)}</div>
            <div class="muted" style="font-size:.9rem;">${escapeHtml(m.section)}${m.role ? ' • ' + escapeHtml(m.role) : ''}</div>
          </div>
        </div>
      `;
      memGrid.appendChild(card);
    });
  }

  function escapeHtml(s='') {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getInitials(name='') {
    return name.split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('');
  }

  document.addEventListener('DOMContentLoaded', loadMembers);
})();
