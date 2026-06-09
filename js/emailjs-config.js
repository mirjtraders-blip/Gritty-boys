/* ============================================================
   Mirj Rentals — EmailJS  (js/emailjs-config.js)
   Loaded synchronously after the EmailJS SDK.
   ============================================================ */

window.MirjEmail = (function () {

  var SERVICE_ID  = 'service_lfqfe1d';
  var TEMPLATE_ID = 'template_0634bsh';
  var PUBLIC_KEY  = 'od-V64wVtM1q8XZlt';
  var TO_EMAIL    = 'mirjtraders@gmail.com';

  /* ── Initialise immediately (SDK must already be loaded) ── */
  var ready = false;

  function tryInit() {
    if (typeof emailjs === 'undefined') {
      console.warn('[MirjEmail] EmailJS SDK not found on window');
      return false;
    }
    try {
      emailjs.init({ publicKey: PUBLIC_KEY });
      ready = true;
      console.log('[MirjEmail] EmailJS initialised ✓  service=' + SERVICE_ID + '  template=' + TEMPLATE_ID);
      return true;
    } catch (e) {
      console.error('[MirjEmail] Init threw:', e);
      return false;
    }
  }

  tryInit();

  /* ── Retry at send-time in case SDK loaded slightly late ─ */
  function ensureReady() {
    if (ready) return true;
    return tryInit();
  }

  /* ── Mailto fallback: navigates current tab (no popup block) ── */
  function mailtoFallback(params) {
    console.warn('[MirjEmail] Falling back to mailto: link');
    var lines = [
      'Type:         ' + (params.type        || ''),
      'Name:         ' + (params.name        || ''),
      'Phone:        ' + (params.phone       || ''),
      'Email:        ' + (params.from_email  || ''),
      'Address:      ' + (params.address     || ''),
      '',
      'Event Date:   ' + (params.event_date  || ''),
      'Event Type:   ' + (params.event_type  || ''),
      'Guests:       ' + (params.guests      || ''),
      'Items:        ' + (params.items       || ''),
      '',
      'Message:',
      (params.message || '—'),
      '',
      '─────────────────────────',
      'Sent from mirjrentals.netlify.app'
    ];
    var sub  = encodeURIComponent(params.subject || 'Mirj Rentals Enquiry');
    var body = encodeURIComponent(lines.join('\n'));
    window.location.href = 'mailto:' + TO_EMAIL + '?subject=' + sub + '&body=' + body;
  }

  /* ── Main send function ─────────────────────────────────── */
  function send(params) {
    params.to_email = TO_EMAIL;
    params.to_name  = 'Mirj Rentals';

    if (!ensureReady()) {
      console.error('[MirjEmail] Cannot send — EmailJS SDK unavailable. Is the CDN reachable?');
      mailtoFallback(params);
      return Promise.resolve({ status: 0, text: 'sdk_unavailable' });
    }

    console.log('[MirjEmail] Calling emailjs.send …', {
      service:  SERVICE_ID,
      template: TEMPLATE_ID,
      subject:  params.subject
    });

    return emailjs.send(SERVICE_ID, TEMPLATE_ID, params)
      .then(function (res) {
        console.log('[MirjEmail] ✅ Delivered — status ' + res.status + ' / ' + res.text);
        return res;
      })
      .catch(function (err) {
        console.error('[MirjEmail] ❌ Send error:', err);
        /* Log structured error for debugging */
        if (err && err.status) {
          console.error('[MirjEmail] HTTP ' + err.status + ':', err.text);
        }
        mailtoFallback(params);
        return { status: 0, text: 'send_error' };
      });
  }

  /* ── Expose a quick test helper (call MirjEmail.test() in console) ── */
  function test() {
    console.log('[MirjEmail] Running test send…');
    return send({
      subject:    '[TEST] Mirj Rentals Email Test',
      type:       'Test',
      name:       'Test User',
      phone:      '+27 66 227 1571',
      from_email: 'test@example.com',
      address:    '1 Test Street, Cape Town',
      event_date: '2025-01-01',
      event_type: 'Test Event',
      guests:     '10',
      items:      '2× Chair',
      message:    'This is an automated test message.'
    });
  }

  return { send: send, test: test };

})();
