// events-supabase.js  — public site: read + render upcoming events
// Requirements in index.html (in this order):
// 1) <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// 2) <script src="/supabase-config.js"></script>
// 3) <script src="/events-supabase.js" defer></script>

(function () {
  // Basic guards
  if (!window.supabase) {
    console.error("Supabase JS SDK not found. Load it before events-supabase.js");
    return;
  }
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error("SUPABASE_URL / SUPABASE_ANON_KEY missing. Check supabase-config.js");
    return;
  }

  // Create client
  var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // DOM target
  var eventsGrid = document.getElementById("eventsGrid");
  if (!eventsGrid) {
    console.warn("#eventsGrid not found on this page.");
    return;
  }

  function formatDate(val) {
    // val is "YYYY-MM-DD" (date column) or a Date/ISO. Normalize to Date object.
    var d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    try {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch (_) {
      // very old browsers
      return d.toDateString();
    }
  }

  function renderEvents(rows) {
    eventsGrid.innerHTML = "";
    if (!rows || !rows.length) {
      eventsGrid.innerHTML = '<div class="muted">No upcoming events yet.</div>';
      return;
    }

    for (var i = 0; i < rows.length; i++) {
      var ev = rows[i];
      var card = document.createElement("div");
      card.className = "card";

      var dateHuman = formatDate(ev.date);
      var typeChip = ev.type ? '<span class="badge">' + ev.type + "</span>" : "";

      card.innerHTML =
        '<div style="font-weight:700; margin-bottom:.35rem;">' + (ev.title || "") + "</div>" +
        '<div class="muted">📅 <strong>' + dateHuman + "</strong></div>" +
        '<div class="muted" style="margin-top:.25rem;">📍 ' + (ev.venue || "") + "</div>" +
        '<div style="margin-top:.5rem;">' + typeChip + "</div>";

      eventsGrid.appendChild(card);
    }
  }

  async function loadEvents() {
    // Only upcoming events (>= today), ASC by date
    var todayISO = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"

    var res = await sb
      .from("events")
      .select("*")
      .gte("date", todayISO)
      .order("date", { ascending: true });

    if (res.error) {
      console.error("events fetch error:", res.error);
      eventsGrid.innerHTML = '<div class="muted">Could not load events.</div>';
      return;
    }

    renderEvents(res.data || []);
  }

  // Kickoff after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadEvents);
  } else {
    loadEvents();
  }
})();
