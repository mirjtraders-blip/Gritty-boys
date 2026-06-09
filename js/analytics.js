/* ============================================================
   Mirj Rentals — Analytics  (js/analytics.js)
   Lightweight page-view tracker stored in localStorage.
   Stats are readable from the same origin (worker app, admin).

   ── TO ENABLE GOOGLE ANALYTICS 4 ────────────────────────────
   1. Go to analytics.google.com → create a GA4 property
   2. Copy your Measurement ID  (looks like: G-XXXXXXXXXX)
   3. Paste it as the value of GA4_ID below (in quotes)
   ──────────────────────────────────────────────────────────── */

window.MirjAnalytics = (function () {

  /* ── CONFIG ─────────────────────────────────────────── */
  var GA4_ID = 'G-T8TBZ345D3';
  /* ───────────────────────────────────────────────────── */

  var STORE = 'mirj_analytics';
  var SID   = 'mirj_asid';      // sessionStorage key
  var DAY   = 86400000;

  /* storage helpers */
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch(e) { return {}; } }
  function save(d) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch(e) {} }

  /* ── Track a page view ──────────────────────────────── */
  function track() {
    /* skip internal / admin pages */
    var skip = ['worker-app', 'admin'];
    if (skip.some(function(s){ return location.pathname.indexOf(s) !== -1; })) return;

    var d   = load();
    var now = Date.now();

    /* count a new session if none exists in this tab */
    if (!sessionStorage.getItem(SID)) {
      sessionStorage.setItem(SID, '1');
      d.sessions = (d.sessions || 0) + 1;
    }

    var page = location.pathname.split('/').pop().replace('.html','') || 'home';
    if (!page || page === '') page = 'home';

    if (!d.views) d.views = [];
    d.views.push({
      p: page,
      t: now,
      m: /Mobi|Android/i.test(navigator.userAgent) ? 1 : 0
    });

    /* keep last 3 000 views to avoid localStorage bloat */
    if (d.views.length > 3000) d.views = d.views.slice(-3000);
    save(d);
  }

  /* ── Track a named event ────────────────────────────── */
  function trackEvent(action, label) {
    var d = load();
    if (!d.events) d.events = [];
    d.events.push({ a: action, l: label || '', t: Date.now() });
    if (d.events.length > 500) d.events = d.events.slice(-500);
    save(d);
    if (window.gtag) window.gtag('event', action, { event_label: label });
  }

  /* ── Build summary stats ────────────────────────────── */
  function getStats() {
    var d    = load();
    var views = d.views || [];
    var now  = Date.now();

    /* time boundaries */
    var tod = new Date(); tod.setHours(0,0,0,0);
    var todMs = tod.getTime();
    var wkMs  = now - 7  * DAY;
    var moMs  = now - 30 * DAY;

    var today = 0, week = 0, month = 0, mobile = 0;
    views.forEach(function(v) {
      if (v.t >= todMs) today++;
      if (v.t >= wkMs)  week++;
      if (v.t >= moMs) { month++; if (v.m) mobile++; }
    });

    /* top pages in last 30 days */
    var pMap = {};
    views.filter(function(v){ return v.t >= moMs; })
         .forEach(function(v){ pMap[v.p] = (pMap[v.p] || 0) + 1; });
    var pages = Object.keys(pMap)
      .map(function(k){ return { n: k, c: pMap[k] }; })
      .sort(function(a,b){ return b.c - a.c; })
      .slice(0, 6);

    /* daily counts for past 7 days */
    var daily = [];
    for (var i = 6; i >= 0; i--) {
      var ds = new Date(); ds.setHours(0,0,0,0); ds.setDate(ds.getDate() - i);
      var de = ds.getTime() + DAY;
      var lbl = i === 0 ? 'Today' : ds.toLocaleDateString('en-ZA', { weekday: 'short' });
      daily.push({
        l: lbl,
        c: views.filter(function(v){ return v.t >= ds.getTime() && v.t < de; }).length
      });
    }

    /* pull business data from other storage keys */
    var leads = 0, bookings = 0, msgs = 0;
    try { leads    = (JSON.parse(localStorage.getItem('mirj_leads'))          || []).length; } catch(e) {}
    try { bookings = (JSON.parse(localStorage.getItem('mirj_bookings'))       || []).length; } catch(e) {}
    try { msgs     = (JSON.parse(localStorage.getItem('mirj_bob_messages'))   || []).length; } catch(e) {}

    return {
      today: today, week: week, month: month,
      sessions: d.sessions || 0,
      total: views.length,
      mobile: mobile, desktop: month - mobile,
      pages: pages, daily: daily,
      ga4: GA4_ID,
      leads: leads, bookings: bookings, messages: msgs
    };
  }

  /* ── GA4 is loaded via <script> in each page <head>.
        This block is a fallback only — it won't duplicate
        the tag if gtag is already initialised.            */
  if (GA4_ID && !window.gtag) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  }

  /* ── Auto-track current page on load ────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }

  return { trackEvent: trackEvent, getStats: getStats };

})();
