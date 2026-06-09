// =================== NAVIGATION ===================
document.addEventListener('DOMContentLoaded', () => {

  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => {
    const isOpen = mobileMenu?.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  document.querySelectorAll('.mobile-menu a').forEach(a => a.addEventListener('click', () => {
    mobileMenu?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
  }));

  // Active nav link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === currentPath) a.classList.add('active');
  });

  // =================== SCROLL REVEAL ===================
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // =================== BOOKING FORM ===================
  const bookingForm = document.getElementById('bookingForm');
  bookingForm?.addEventListener('submit', e => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(bookingForm));
    // Trim all string values
    const data = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k, typeof v === 'string' ? v.trim() : v]));
    // Basic validation
    if (!data.name || data.name.length < 2)   { alert('Please enter your full name.'); return; }
    if (!data.phone || data.phone.length < 7)  { alert('Please enter a valid phone number.'); return; }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { alert('Please enter a valid email address.'); return; }
    if (!data.eventDate)  { alert('Please select an event date.'); return; }
    if (!data.guestCount) { alert('Please enter the number of guests.'); return; }
    if (!data.address)    { alert('Please enter the event venue address.'); return; }
    if (!data.message)    { alert('Please describe the equipment you need.'); return; }

    // Parse items from product-page checkboxes (if any)
    const selectedItems = [];
    document.querySelectorAll('.item-select:checked').forEach(cb => {
      const qtyEl = document.querySelector(`.qty-input[data-item="${CSS.escape(cb.value)}"]`)
                 || document.getElementById('qty_' + cb.value);
      const qty = parseInt(qtyEl?.value || '1');
      selectedItems.push({ key: cb.value, qty });
    });

    // Always save as a quote request so it shows in the admin Quotes tab
    if (window.Bob) {
      window.Bob.saveQuoteRequest({
        name:          data.name,
        phone:         data.phone,
        email:         data.email,
        address:       data.address       || '',
        eventType:     data.eventType     || '',
        eventDate:     data.eventDate     || '',
        guestCount:    data.guestCount    || '',
        itemsInterest: data.message       || '',
        items:         selectedItems,
        source:        'Contact Form'
      });
    }

    // Check availability & attempt to create a booking if specific items are ticked
    if (window.Bob && data.eventDate && selectedItems.length > 0) {
      const check = window.Bob.checkAvailability(data.eventDate, selectedItems);
      if (!check.available) { showModal('unavailable', check.issues); return; }
      window.Bob.createBooking({
        customerName: data.name,
        phone:        data.phone,
        email:        data.email,
        address:      data.address || '',
        eventDate:    data.eventDate,
        eventType:    data.eventType,
        guestCount:   data.guestCount,
        items:        selectedItems,
        notes:        data.message || ''
      });
    }

    // Send via EmailJS
    if (window.MirjEmail) {
      MirjEmail.send({
        subject:    `[Mirj Rentals] Quote Request — ${data.name} (${data.eventType || 'Event'}, ${data.eventDate})`,
        type:       'Quote Request (Contact Form)',
        name:       data.name,
        phone:      data.phone,
        from_email: data.email,
        address:    data.address    || '',
        event_date: data.eventDate  || '',
        event_type: data.eventType  || 'Not specified',
        guests:     data.guestCount || '',
        items:      (selectedItems.length ? selectedItems.map(i => `${i.qty}× ${i.key}`).join(', ') : '') || data.message || '',
        message:    data.message    || ''
      });
    }

    showModal('success', null);
    bookingForm.reset();
  });

  function sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showModal(type, data) {
    const modal = document.getElementById('responseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal) return;

    if (type === 'success') {
      modalTitle.textContent = 'Enquiry Submitted';
      if (data?.id) {
        modalBody.innerHTML = `Your enquiry has been received. Our team will contact you within 24 hours with full details and confirmation.<br><br>Your reference: <strong>${sanitize(String(data.id))}</strong>`;
      } else {
        modalBody.textContent = 'Your enquiry has been received. Our team will contact you within 24 hours with full details and confirmation.';
      }
    } else if (type === 'unavailable') {
      const items = Array.isArray(data) ? data.map(i => `${sanitize(i.key)} (only ${sanitize(String(i.available))} available)`).join(', ') : 'Some items';
      modalTitle.textContent = 'Availability Issue';
      modalBody.innerHTML = `We're sorry — the following items are not fully available for your date: <strong>${items}</strong>. Please contact us to discuss alternatives or choose a different date.`;
    }
    modal.classList.remove('hidden');
  }

  document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('responseModal')?.classList.add('hidden');
  });

  // =================== PRODUCT PAGE QUOTE BUILDER ===================
  document.querySelectorAll('.item-select').forEach(cb => {
    cb.addEventListener('change', updateQuoteSummary);
  });
  document.querySelectorAll('.qty-input').forEach(inp => {
    inp.addEventListener('input', updateQuoteSummary);
  });

  function updateQuoteSummary() {
    const summaryEl = document.getElementById('quoteSummary');
    const totalEl = document.getElementById('quoteTotal');
    if (!summaryEl || !window.Bob) return;

    let total = 0;
    const lines = [];
    document.querySelectorAll('.item-select:checked').forEach(cb => {
      const key = cb.value;
      const qtyEl = document.querySelector(`.qty-input[data-item="${CSS.escape(key)}"]`)
                 || document.getElementById('qty_' + key);
      const qty = parseInt(qtyEl?.value || '1');
      const item = window.Bob.INVENTORY_MASTER[key];
      if (item && item.cost > 0) {
        const sub = item.cost * qty;
        total += sub;
        lines.push(`${qty}× ${key}: R${sub.toLocaleString()}`);
      } else if (item) {
        lines.push(`${qty}× ${key}: Quote Required`);
      }
    });

    summaryEl.innerHTML = lines.length ? lines.map(l => `<div class="quote-line">${sanitize(l)}</div>`).join('') : '<span class="text-dim">Select items to build your quote</span>';
    if (totalEl) totalEl.textContent = total > 0 ? `R${total.toLocaleString()}` : '—';
  }

  // =================== DATE MINIMUM ===================
  const dateInputs = document.querySelectorAll('input[type="date"]');
  const today = new Date().toISOString().split('T')[0];
  dateInputs.forEach(inp => { inp.min = today; });

});
