// enquiries-public.js
(function () {
  // Require Supabase globals from supabase-config.js
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const form = document.getElementById('partnerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name || !/^\S+@\S+\.\S+$/.test(data.email)) {
      alert('Please fill your name and a valid email.');
      return;
    }

    const payload = {
      name: String(data.name || '').trim(),
      email: String(data.email || '').trim(),
      phone: String(data.phone || '').trim(),
      message: String(data.message || '').trim(),
    };

    const { data: res, error } = await sb
      .from('enquiries')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      alert('Sorry, something went wrong. (' + (error.message || 'Insert failed') + ')');
      return;
    }

    alert('✅ Enquiry sent! We will get back to you soon.');
    form.reset();
  });
})();
