/**
 * BOB — Mirj Rentals Inventory & Booking Intelligence System
 * Bob never communicates with customers.
 * Bob tracks stock, bookings, and communicates with the owner via email.
 */

const Bob = (() => {

  // =================== INVENTORY MASTER DATA ===================
  const INVENTORY_MASTER = {
    "3x6 Gazebo":            { total: 1,  cost: 600,  unit: "per gazebo",   category: "tents" },
    "3x3 Gazebo":            { total: 4,  cost: 400,  unit: "per gazebo",   category: "tents" },
    "2x2 Gazebo":            { total: 20, cost: 250,  unit: "per gazebo",   category: "tents" },
    "3x9 Cabana":            { total: 2,  cost: 1400, unit: "per cabana",   category: "tents" },
    "Stretch Tent 6x9":      { total: 1,  cost: 1800, unit: "per tent",     category: "tents" },
    "Stretch Tent 6x12":     { total: 1,  cost: 2500, unit: "per tent",     category: "tents" },
    "Marquee 6x9":           { total: 1,  cost: 2500, unit: "per tent",     category: "tents" },
    "Marquee 6x12":          { total: 1,  cost: 3500, unit: "per tent",     category: "tents" },
    "Tiffany Chairs":        { total: 50, cost: 20,   unit: "per chair",    category: "chairs" },
    "Black Stackable Chairs":{ total: 20, cost: 7,    unit: "per chair",    category: "chairs" },
    "Black Foldable Chairs": { total: 50, cost: 15,   unit: "per chair",    category: "chairs" },
    "White Foldable Chairs": { total: 50, cost: 15,   unit: "per chair",    category: "chairs" },
    "White 4-Seater Benches":{ total: 6,  cost: 40,   unit: "per bench",    category: "chairs" },
    "Cocktail Chairs":       { total: 40, cost: 30,   unit: "per chair",    category: "chairs" },
    "Stage Platform 2x2":    { total: 3,  cost: 250,  unit: "per stage",    category: "photobooth" },
    "Stage Platform 1x1":    { total: 3,  cost: 200,  unit: "per stage",    category: "photobooth" },
    "Magazine Photobooth":   { total: 1,  cost: 2000, unit: "per booth",    category: "photobooth" },
    "Backdrop Arcs":         { total: 5,  cost: 150,  unit: "per arch",     category: "photobooth" },
    "Balloon Setup":         { total: 99, cost: 0,    unit: "quote required",category: "photobooth" },
    "Display Table":         { total: 10, cost: 150,  unit: "per table",    category: "tables" },
    "Cocktail Tables":       { total: 15, cost: 80,   unit: "per table",    category: "tables" },
    "Foldable Tables":       { total: 20, cost: 60,   unit: "per table (tablecloth included)", category: "tables" },
    "Round Tables":          { total: 15, cost: 80,   unit: "per table (tablecloth included)", category: "tables" },
    "Step Display":          { total: 4,  cost: 50,   unit: "per stand",    category: "food" },
    "Food Pedestals":        { total: 15, cost: 50,   unit: "per pedestal (R120 for 3)", category: "food" },
    "Pyramid Stand":         { total: 5,  cost: 50,   unit: "per stand (R90 for 2)", category: "food" },
    "Chair Cover (B/W)":     { total: 100,cost: 5,    unit: "per cover",    category: "chairs" },
    "3D Arch":               { total: 1,  cost: 500,  unit: "per arch (personalised wording included)", category: "photobooth" },
    "Welcome Board with Frame": { total: 1, cost: 300, unit: "per board",   category: "photobooth" },
    "Welcome Flower Box":    { total: 1,  cost: 400,  unit: "per box",      category: "photobooth" },
    "Kiddies Tiffany Chairs":{ total: 10, cost: 15,   unit: "per chair",    category: "kids" },
    "Kiddies Party Tables":  { total: 1,  cost: 100,  unit: "per table",    category: "kids" },
    "Jumping Castle":        { total: 1,  cost: 800,  unit: "per castle",   category: "kids" },
    "Jumping Castle with Balloons": { total: 1, cost: 1500, unit: "per castle incl. balloon décor", category: "kids", stockKey: "Jumping Castle" },
    "Bubble House":          { total: 1,  cost: 1500, unit: "per bubble house", category: "kids" },
    "Water Slide":           { total: 1,  cost: 450,  unit: "per slide",    category: "kids" },
  };

  const OWNER_EMAIL = "mirjtraders@gmail.com";
  const DELIVERY_FEE = 300;
  const VAT_RATE = 0; // VAT exempt

  // =================== COMPANY DETAILS ===================
  const COMPANY = {
    name:    "MIRJ Traders",
    address: "23 Andrews Road",
    suburb:  "Newfields, Athlone, Cape Town",
    postal:  "7764 ZA",
    phone:   "066 227 1571",
    email:   "mirjtraders@gmail.com",
    regNo:   "2020/911735/07",
    bank:    "Standard Bank",
    accountHolder: "MR MR Jacobs",
    accountNumber: "10256047888",
    branchCode:    "005909"
  };

  // =================== STORAGE HELPERS ===================
  function getBookings() {
    try { return JSON.parse(localStorage.getItem('mirj_bookings') || '[]'); }
    catch(e) { return []; }
  }
  function saveBookings(bookings) {
    localStorage.setItem('mirj_bookings', JSON.stringify(bookings));
  }
  function getMessages() {
    try { return JSON.parse(localStorage.getItem('mirj_bob_messages') || '[]'); }
    catch(e) { return []; }
  }
  function saveMessages(msgs) {
    localStorage.setItem('mirj_bob_messages', JSON.stringify(msgs));
  }

  // =================== AVAILABILITY CHECK ===================
  /**
   * Check if requested items are available on a given date.
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @param {Array}  requestedItems - [{ key, qty }]
   * @returns {{ available: boolean, issues: [], alternatives: [] }}
   */
  function checkAvailability(date, requestedItems) {
    const bookings = getBookings().filter(b => b.eventDate === date && b.status !== 'cancelled');
    // Tally up what's already booked for that date
    const bookedQty = {};
    bookings.forEach(booking => {
      booking.items.forEach(({ key, qty }) => {
        const sk = (INVENTORY_MASTER[key] && INVENTORY_MASTER[key].stockKey) || key; // items sharing one physical unit
        bookedQty[sk] = (bookedQty[sk] || 0) + qty;
      });
    });

    const issues = [];
    const available = [];
    requestedItems.forEach(({ key, qty }) => {
      const item = INVENTORY_MASTER[key];
      if (!item) return;
      const sk = item.stockKey || key;
      const alreadyBooked = bookedQty[sk] || 0;
      const remaining = item.total - alreadyBooked;
      if (remaining < qty) {
        issues.push({
          key,
          requested: qty,
          available: remaining,
          total: item.total
        });
      } else {
        available.push({ key, qty });
      }
    });

    return {
      available: issues.length === 0,
      issues,
      availableItems: available
    };
  }

  // =================== QUOTATION NUMBER ===================
  function nextQuoteNumber() {
    const n = parseInt(localStorage.getItem('mirj_quote_counter') || '1239') + 1;
    localStorage.setItem('mirj_quote_counter', n);
    return n;
  }

  // =================== QUOTATION GENERATOR ===================
  function formatR(n) {
    return 'R' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function pad(str, len, right = false) {
    const s = String(str);
    return right ? s.padStart(len) : s.padEnd(len);
  }

  /**
   * Generates a plain-text quotation (for email body / mailto).
   */
  function generateQuotationText(booking) {
    // Ensure quotation object exists (guard for manually-created bookings)
    if (!booking.quotation) {
      const n = nextQuoteNumber();
      booking.quotation = { number: n };
      // Persist the assigned number back to storage
      const bookings = getBookings();
      const idx = bookings.findIndex(b => b.id === booking.id);
      if (idx > -1) { bookings[idx].quotation = booking.quotation; saveBookings(bookings); }
    }
    const q = booking.quotation;
    const line = '─'.repeat(72);
    const thin = '─'.repeat(72);

    const rows = (booking.items || []).map(({ key, qty }) => {
      const item = INVENTORY_MASTER[key];
      if (!item || item.cost === 0) return null;
      const rate = item.cost;
      const amount = rate * qty;
      return { desc: key, qty, rate, amount };
    }).filter(Boolean);

    const subtotal = rows.reduce((s, r) => s + r.amount, 0);
    const delivery = (typeof booking.deliveryFee === 'number') ? booking.deliveryFee : DELIVERY_FEE;
    const vat = 0;
    const total = subtotal + delivery + vat;

    const eventDate = booking.eventDate
      ? new Date(booking.eventDate + 'T12:00:00').toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

    let txt = '';
    txt += `\n`;
    txt += `${COMPANY.name}\n`;
    txt += `${COMPANY.address}\n`;
    txt += `${COMPANY.suburb}\n`;
    txt += `${COMPANY.postal}   ${COMPANY.phone}\n`;
    txt += `${COMPANY.email}\n`;
    txt += `Reg. No. ${COMPANY.regNo}\n`;
    txt += `\n${line}\n`;
    txt += `                          Q U O T A T I O N\n`;
    txt += `${line}\n\n`;

    txt += `Client Details:                          Quotation Details:\n`;
    txt += `${booking.customerName || '—'}                            Quotation #: ${q.number}\n`;
    txt += `${booking.email || '—'}                       Date: ${eventDate}\n`;
    txt += `${booking.phone || '—'}\n\n`;

    txt += `${line}\n`;
    txt += `${pad('DESCRIPTION', 34)} ${pad('QTY', 6)} ${pad('RATE', 14)} ${pad('AMOUNT', 12)}\n`;
    txt += `${line}\n`;

    rows.forEach(r => {
      txt += `${pad(r.desc, 34)} ${pad(r.qty, 6)} ${pad(formatR(r.rate), 14)} ${pad(formatR(r.amount), 12)}\n`;
    });

    txt += `${line}\n`;
    txt += `${pad('Subtotal', 56)} ${pad(formatR(subtotal), 14)}\n`;
    txt += `${pad('Delivery & Set up', 56)} ${pad(formatR(delivery), 14)}\n`;
    txt += `${pad('VAT', 56)} ${pad(formatR(vat), 14)}\n`;
    txt += `${line}\n`;
    txt += `${pad('TOTAL', 56)} ${pad(formatR(total), 14)}\n`;
    txt += `${line}\n\n`;

    txt += `Banking Details:\n`;
    txt += `Bank:             ${COMPANY.bank}\n`;
    txt += `Account Holder:   ${COMPANY.accountHolder}\n`;
    txt += `Account Number:   ${COMPANY.accountNumber}\n`;
    txt += `Branch Code:      ${COMPANY.branchCode}\n\n`;

    txt += `Payment Reference: ${q.number} / ${booking.customerName || ''}\n\n`;
    txt += `This quotation is valid for 7 days from the date of issue.\n`;
    txt += `For queries contact us at ${COMPANY.email} or ${COMPANY.phone}.\n`;

    return { txt, subtotal, delivery, vat, total, rows };
  }

  /**
   * Generates a printable HTML quotation (stored in localStorage for admin panel).
   */
  function generateQuotationHTML(booking) {
    const q = booking.quotation;
    const { rows, subtotal, delivery, vat, total } = generateQuotationText(booking);

    const eventDate = booking.eventDate
      ? new Date(booking.eventDate + 'T12:00:00').toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

    const itemRows = rows.map(r => `
      <tr>
        <td>${r.desc}</td>
        <td class="center">${r.qty}</td>
        <td class="right">${formatR(r.rate)}</td>
        <td class="right">${formatR(r.amount)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Quotation ${q.number} — ${booking.customerName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Montserrat',sans-serif;background:#f4f1eb;color:#1a1a1a;padding:40px 20px;font-size:13px;}
  .page{max-width:760px;margin:0 auto;background:#fff;padding:48px 52px;box-shadow:0 4px 24px rgba(0,0,0,0.12);}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #C9A84C;}
  .company-name{font-size:22px;font-weight:800;letter-spacing:0.04em;color:#0a0a0a;margin-bottom:6px;}
  .company-details{font-size:11.5px;color:#666;line-height:1.7;}
  .doc-title{text-align:right;}
  .doc-title h1{font-size:28px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;margin-bottom:4px;}
  .doc-title .ref{font-size:11px;color:#888;letter-spacing:0.1em;text-transform:uppercase;}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;padding:20px 0;border-bottom:1px solid #e5e0d5;}
  .info-label{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#C9A84C;margin-bottom:6px;}
  .info-val{font-size:12.5px;color:#1a1a1a;line-height:1.7;}
  .gold-bar{height:4px;background:linear-gradient(to right,#C9A84C,#D4AF37);margin-bottom:0;}
  table{width:100%;border-collapse:collapse;margin-bottom:0;}
  thead tr{background:#0a0a0a;}
  thead th{padding:11px 14px;text-align:left;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#C9A84C;font-weight:700;}
  thead th.right{text-align:right;}
  thead th.center{text-align:center;}
  tbody tr{border-bottom:1px solid #f0ebe0;}
  tbody tr:nth-child(even){background:#faf8f4;}
  tbody td{padding:11px 14px;font-size:12.5px;color:#1a1a1a;}
  td.right{text-align:right;}
  td.center{text-align:center;}
  .totals{margin-top:0;border-top:2px solid #C9A84C;}
  .totals table{width:340px;margin-left:auto;}
  .totals td{padding:8px 14px;font-size:12.5px;color:#444;border-bottom:1px solid #f0ebe0;}
  .totals td:last-child{text-align:right;color:#1a1a1a;font-weight:600;}
  .totals .grand-total td{background:#0a0a0a;color:#C9A84C!important;font-weight:800!important;font-size:14px;padding:12px 14px;border:none;}
  .banking{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-top:24px;border-top:1px solid #e5e0d5;}
  .banking-box{background:#faf8f4;border:1px solid #e5e0d5;padding:18px 20px;}
  .banking-box h4{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#C9A84C;font-weight:700;margin-bottom:10px;}
  .banking-box p{font-size:12px;color:#444;line-height:1.8;}
  .banking-box strong{color:#1a1a1a;}
  .footer{margin-top:32px;padding-top:20px;border-top:1px solid #e5e0d5;text-align:center;font-size:10.5px;color:#999;line-height:1.7;}
  .print-btn{display:block;margin:24px auto 0;padding:12px 36px;background:#C9A84C;color:#000;border:none;font-family:inherit;font-weight:700;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;}
  @media print{.print-btn{display:none!important;} body{background:#fff;padding:0;} .page{box-shadow:none;padding:24px;}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">${COMPANY.name}</div>
      <div class="company-details">
        ${COMPANY.address}<br/>
        ${COMPANY.suburb}<br/>
        ${COMPANY.postal} &nbsp;|&nbsp; ${COMPANY.phone}<br/>
        ${COMPANY.email}<br/>
        Reg. No. ${COMPANY.regNo}
      </div>
    </div>
    <div class="doc-title">
      <h1>Quotation</h1>
      <div class="ref">Ref: #${q.number}</div>
      <div class="ref" style="margin-top:4px">Date: ${eventDate}</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="info-label">Bill To</div>
      <div class="info-val">
        <strong>${booking.customerName || '—'}</strong><br/>
        ${booking.email || ''}<br/>
        ${booking.phone || ''}
      </div>
    </div>
    <div>
      <div class="info-label">Event Details</div>
      <div class="info-val">
        <strong>Event Date:</strong> ${eventDate}<br/>
        <strong>Event Type:</strong> ${booking.eventType || 'Not specified'}<br/>
        <strong>Quotation Valid:</strong> 7 days from issue
      </div>
    </div>
  </div>

  <div class="gold-bar"></div>
  <table>
    <thead>
      <tr>
        <th style="width:45%">Description</th>
        <th class="center" style="width:10%">Qty</th>
        <th class="right" style="width:20%">Rate</th>
        <th class="right" style="width:25%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td>${formatR(subtotal)}</td></tr>
      <tr><td>Delivery &amp; Set up</td><td>${formatR(delivery)}</td></tr>
      <tr><td>VAT</td><td>${formatR(vat)}</td></tr>
      <tr class="grand-total"><td>TOTAL</td><td>${formatR(total)}</td></tr>
    </table>
  </div>

  <div class="banking">
    <div class="banking-box">
      <h4>Banking Details</h4>
      <p>
        <strong>Bank:</strong> ${COMPANY.bank}<br/>
        <strong>Account Holder:</strong> ${COMPANY.accountHolder}<br/>
        <strong>Account Number:</strong> ${COMPANY.accountNumber}<br/>
        <strong>Branch Code:</strong> ${COMPANY.branchCode}
      </p>
    </div>
    <div class="banking-box">
      <h4>Payment Reference</h4>
      <p>
        Please use the following reference when making payment:<br/><br/>
        <strong style="font-size:14px;color:#C9A84C">${q.number} / ${(booking.customerName || '').split(' ')[0]}</strong>
      </p>
    </div>
  </div>

  <div class="footer">
    Thank you for considering Mirj Rentals. This quotation is valid for 7 days from the date of issue.<br/>
    For any queries please contact us at <strong>${COMPANY.email}</strong> or <strong>${COMPANY.phone}</strong>
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
</body>
</html>`;
  }

  /**
   * Generates a Word-compatible HTML document (.doc) that opens in Microsoft Word
   * and can be edited and saved as .docx. Uses the MSO XML namespace trick.
   */
  function generateQuotationDOC(booking) {
    const q = booking.quotation;
    const { rows, subtotal, delivery, vat, total } = generateQuotationText(booking);

    const eventDate = booking.eventDate
      ? new Date(booking.eventDate + 'T12:00:00').toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

    const issued = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    const validUntil = (() => {
      const d = new Date(); d.setDate(d.getDate() + 7);
      return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    })();

    const itemRows = rows.map(r => `
        <tr>
          <td style="border:1pt solid #cccccc;padding:6pt 9pt;font-size:10pt">${r.desc}</td>
          <td style="border:1pt solid #cccccc;padding:6pt 9pt;font-size:10pt;text-align:center">${r.qty}</td>
          <td style="border:1pt solid #cccccc;padding:6pt 9pt;font-size:10pt;text-align:right">${formatR(r.rate)}</td>
          <td style="border:1pt solid #cccccc;padding:6pt 9pt;font-size:10pt;text-align:right">${formatR(r.amount)}</td>
        </tr>`).join('');

    return `<html xmlns:o='urn:schemas-microsoft-com:office:office'
  xmlns:w='urn:schemas-microsoft-com:office:word'
  xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="UTF-8"/>
<title>Quotation ${q.number} — ${booking.customerName || 'Client'}</title>
<!--[if gte mso 9]><xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml><![endif]-->
<style>
  @page { size: A4; margin: 2cm 2.5cm; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; margin: 0; }
  table { border-collapse: collapse; }
  p { margin: 0; }
</style>
</head>
<body>

<!-- ===== COMPANY HEADER ===== -->
<table style="width:100%;margin-bottom:14pt">
  <tr>
    <td style="vertical-align:top;width:56%">
      <p style="font-size:17pt;font-weight:bold;color:#0a0a0a;margin-bottom:5pt">${COMPANY.name}</p>
      <p style="font-size:9pt;color:#555555;line-height:1.75">
        ${COMPANY.address}<br>
        ${COMPANY.suburb}<br>
        ${COMPANY.postal}<br>
        Tel: ${COMPANY.phone}<br>
        ${COMPANY.email}<br>
        Reg. No. ${COMPANY.regNo}
      </p>
    </td>
    <td style="vertical-align:top;text-align:right;width:44%">
      <p style="font-size:24pt;font-weight:bold;color:#C9A84C;letter-spacing:2.5pt;margin-bottom:6pt">QUOTATION</p>
      <p style="font-size:9.5pt;color:#555555;line-height:1.85">
        <b>Quotation #:</b>&nbsp; ${q.number}<br>
        <b>Issue Date:</b>&nbsp;&nbsp;&nbsp; ${issued}<br>
        <b>Valid Until:</b>&nbsp;&nbsp;&nbsp; ${validUntil}
      </p>
    </td>
  </tr>
</table>

<table style="width:100%;border-bottom:2.5pt solid #C9A84C;margin-bottom:14pt"><tr><td></td></tr></table>

<!-- ===== CLIENT / EVENT DETAILS ===== -->
<table style="width:100%;border:1pt solid #dddddd;border-collapse:collapse;margin-bottom:14pt">
  <tr>
    <td style="width:50%;padding:10pt 14pt;border-right:1pt solid #dddddd;vertical-align:top;background:#faf8f4">
      <p style="font-size:7.5pt;font-weight:bold;color:#C9A84C;letter-spacing:1.5pt;text-transform:uppercase;margin-bottom:7pt">Bill To</p>
      <p style="font-size:10.5pt;font-weight:bold;margin-bottom:3pt">${booking.customerName || '—'}</p>
      <p style="font-size:9.5pt;color:#444444;line-height:1.75">${booking.email || ''}<br>${booking.phone || ''}</p>
    </td>
    <td style="width:50%;padding:10pt 14pt;vertical-align:top;background:#faf8f4">
      <p style="font-size:7.5pt;font-weight:bold;color:#C9A84C;letter-spacing:1.5pt;text-transform:uppercase;margin-bottom:7pt">Event Details</p>
      <p style="font-size:9.5pt;color:#444444;line-height:1.75">
        <b>Event Date:</b>&nbsp; ${eventDate}<br>
        <b>Event Type:</b>&nbsp; ${booking.eventType || 'Not specified'}<br>
        <b>Reference:</b>&nbsp;&nbsp; ${booking.id}
      </p>
    </td>
  </tr>
</table>

<!-- ===== ITEMS TABLE ===== -->
<table style="width:100%;border-collapse:collapse;margin-bottom:0">
  <thead>
    <tr style="background:#0a0a0a">
      <th style="padding:8pt 10pt;text-align:left;font-size:8pt;color:#C9A84C;font-weight:bold;letter-spacing:1pt;width:46%">DESCRIPTION</th>
      <th style="padding:8pt 10pt;text-align:center;font-size:8pt;color:#C9A84C;font-weight:bold;letter-spacing:1pt;width:10%">QTY</th>
      <th style="padding:8pt 10pt;text-align:right;font-size:8pt;color:#C9A84C;font-weight:bold;letter-spacing:1pt;width:22%">RATE</th>
      <th style="padding:8pt 10pt;text-align:right;font-size:8pt;color:#C9A84C;font-weight:bold;letter-spacing:1pt;width:22%">AMOUNT</th>
    </tr>
  </thead>
  <tbody>${itemRows}
  </tbody>
</table>

<!-- ===== TOTALS ===== -->
<table style="width:100%;border-top:2pt solid #C9A84C;border-collapse:collapse;margin-bottom:16pt">
  <tr>
    <td style="width:55%">&nbsp;</td>
    <td style="width:45%">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:5pt 10pt;font-size:10pt;color:#555555;border-bottom:1pt solid #eeeeee">Subtotal</td>
          <td style="padding:5pt 10pt;font-size:10pt;text-align:right;border-bottom:1pt solid #eeeeee">${formatR(subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:5pt 10pt;font-size:10pt;color:#555555;border-bottom:1pt solid #eeeeee">Delivery &amp; Set up</td>
          <td style="padding:5pt 10pt;font-size:10pt;text-align:right;border-bottom:1pt solid #eeeeee">${formatR(delivery)}</td>
        </tr>
        <tr>
          <td style="padding:5pt 10pt;font-size:10pt;color:#555555;border-bottom:1pt solid #eeeeee">VAT</td>
          <td style="padding:5pt 10pt;font-size:10pt;text-align:right;border-bottom:1pt solid #eeeeee">${formatR(vat)}</td>
        </tr>
        <tr style="background:#0a0a0a">
          <td style="padding:9pt 10pt;font-size:12pt;font-weight:bold;color:#C9A84C">TOTAL</td>
          <td style="padding:9pt 10pt;font-size:12pt;font-weight:bold;color:#C9A84C;text-align:right">${formatR(total)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- ===== BANKING DETAILS ===== -->
<table style="width:100%;border:1pt solid #dddddd;border-collapse:collapse;margin-bottom:14pt">
  <tr>
    <td style="width:50%;padding:10pt 14pt;border-right:1pt solid #dddddd;vertical-align:top;background:#faf8f4">
      <p style="font-size:7.5pt;font-weight:bold;color:#C9A84C;letter-spacing:1.5pt;text-transform:uppercase;margin-bottom:7pt">Banking Details</p>
      <p style="font-size:9.5pt;color:#444444;line-height:1.9">
        <b>Bank:</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${COMPANY.bank}<br>
        <b>Account Holder:</b>&nbsp; ${COMPANY.accountHolder}<br>
        <b>Account Number:</b>&nbsp; ${COMPANY.accountNumber}<br>
        <b>Branch Code:</b>&nbsp;&nbsp;&nbsp;&nbsp; ${COMPANY.branchCode}
      </p>
    </td>
    <td style="width:50%;padding:10pt 14pt;vertical-align:top;background:#faf8f4">
      <p style="font-size:7.5pt;font-weight:bold;color:#C9A84C;letter-spacing:1.5pt;text-transform:uppercase;margin-bottom:7pt">Payment Reference</p>
      <p style="font-size:9.5pt;color:#555555;margin-bottom:7pt">Please use the following reference when making payment:</p>
      <p style="font-size:13pt;font-weight:bold;color:#C9A84C">${q.number} / ${(booking.customerName || '').split(' ')[0]}</p>
    </td>
  </tr>
</table>

<!-- ===== FOOTER ===== -->
<table style="width:100%;border-top:1pt solid #dddddd;margin-top:4pt"><tr>
  <td style="padding-top:10pt;text-align:center;font-size:9pt;color:#999999;line-height:1.7">
    This quotation is valid for 7 days from the date of issue.<br>
    For any queries please contact us at <b>${COMPANY.email}</b> or <b>${COMPANY.phone}</b>
  </td>
</tr></table>

</body>
</html>`;
  }

  // =================== CREATE BOOKING ===================
  function createBooking(bookingData) {
    const bookings = getBookings();
    const id = 'MR' + Date.now().toString(36).toUpperCase();
    const quoteNumber = nextQuoteNumber();

    const booking = {
      id,
      ...bookingData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      quotation: { number: quoteNumber }
    };

    // Calculate totals
    let subtotal = 0;
    (bookingData.items || []).forEach(({ key, qty }) => {
      const item = INVENTORY_MASTER[key];
      if (item) subtotal += item.cost * qty;
    });
    const deliveryFee = (typeof bookingData.deliveryFee === 'number') ? bookingData.deliveryFee : DELIVERY_FEE;
    booking.deliveryFee = deliveryFee;
    booking.totalCost = subtotal + deliveryFee;
    booking.subtotal = subtotal;

    bookings.push(booking);
    saveBookings(bookings);

    // Generate quotation text & HTML
    const { txt, total } = generateQuotationText(booking);
    const htmlQuote = generateQuotationHTML(booking);

    // Store HTML quote for admin panel printing
    const quotes = JSON.parse(localStorage.getItem('mirj_quotes') || '{}');
    quotes[id] = htmlQuote;
    localStorage.setItem('mirj_quotes', JSON.stringify(quotes));

    // Log Bob message
    logMessage({
      type: 'booking',
      subject: `New Enquiry — Quotation #${quoteNumber} for ${bookingData.customerName}`,
      body: `A new booking enquiry has been received.\n\nRef: ${id}  |  Quotation #: ${quoteNumber}\nCustomer: ${bookingData.customerName}\nPhone: ${bookingData.phone}\nEmail: ${bookingData.email}\nEvent Date: ${bookingData.eventDate}\nEvent Type: ${bookingData.eventType || 'Not specified'}\nItems: ${(bookingData.items||[]).map(i => `${i.qty}× ${i.key}`).join(', ')}\n\nSubtotal: R${subtotal.toLocaleString()}\nDelivery & Setup: R${deliveryFee.toLocaleString()}\nTOTAL: R${total.toLocaleString()}\n\nQuotation #${quoteNumber} has been generated. View & print it from the Admin Panel → Bookings tab.`
    });

    // Trigger owner email with full quotation in body
    sendOwnerEmail({
      subject: `[Mirj Rentals] New Enquiry — Quotation #${quoteNumber} — ${bookingData.customerName}`,
      body: `Hi,\n\nA new booking enquiry has been submitted via your website. Please find the quotation below.\n\nRef: ${id}\n\n${'='.repeat(72)}\n${txt}\n${'='.repeat(72)}\n\nTo confirm or decline this booking, please log in to your Admin Portal.\n\n— Bob (Inventory & Booking System)\n${COMPANY.email}`
    });

    return booking;
  }

  // =================== UPDATE BOOKING STATUS ===================
  function updateBookingStatus(id, status) {
    const bookings = getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    bookings[idx].status = status;
    bookings[idx].updatedAt = new Date().toISOString();
    saveBookings(bookings);
    logMessage({ type: 'info', subject: `Booking ${id} marked as ${status}`, body: `Booking ref ${id} status updated to: ${status.toUpperCase()}.` });
    return true;
  }

  // =================== GET BOOKINGS ===================
  function getBookingsByDate(date) {
    return getBookings().filter(b => b.eventDate === date);
  }
  function getAllBookings() {
    return getBookings().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // =================== INVENTORY REPORT ===================
  function getInventoryReport() {
    const bookings = getBookings().filter(b => b.status !== 'cancelled');
    const futureBooked = {};
    const now = new Date().toISOString().split('T')[0];
    bookings.filter(b => b.eventDate >= now).forEach(b => {
      (b.items || []).forEach(({ key, qty }) => {
        futureBooked[key] = (futureBooked[key] || 0) + qty;
      });
    });

    return Object.entries(INVENTORY_MASTER).map(([key, item]) => ({
      key,
      ...item,
      futureBooked: futureBooked[key] || 0,
      currentlyAvailable: item.total - (futureBooked[key] || 0)
    }));
  }

  // =================== BOB MESSAGES ===================
  function logMessage({ type = 'info', subject, body }) {
    const msgs = getMessages();
    msgs.unshift({ id: Date.now(), type, subject, body, timestamp: new Date().toISOString(), read: false });
    if (msgs.length > 100) msgs.pop();
    saveMessages(msgs);
    // Dispatch event for admin panel live update
    try { window.dispatchEvent(new CustomEvent('bob:message', { detail: { type, subject } })); } catch(e) {}
  }

  function getUnreadCount() {
    return getMessages().filter(m => !m.read).length;
  }

  function markAllRead() {
    const msgs = getMessages().map(m => ({ ...m, read: true }));
    saveMessages(msgs);
  }

  // =================== EMAIL OWNER ===================
  function sendOwnerEmail({ subject, body }) {
    const mailtoLink = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Store the mailto for the admin panel to open
    const pending = JSON.parse(localStorage.getItem('mirj_pending_emails') || '[]');
    pending.push({ subject, body, mailtoLink, timestamp: new Date().toISOString() });
    localStorage.setItem('mirj_pending_emails', JSON.stringify(pending));
  }

  // =================== QUOTE REQUESTS ===================
  function getQuoteRequests() {
    try { return JSON.parse(localStorage.getItem('mirj_quote_requests') || '[]'); }
    catch(e) { return []; }
  }

  function saveQuoteRequest(data) {
    const requests = getQuoteRequests();
    const id = 'QR' + Date.now();
    const request = {
      id,
      name:          data.name          || '',
      phone:         data.phone         || '',
      email:         data.email         || '',
      address:       data.address       || '',
      eventType:     data.eventType     || '',
      eventDate:     data.eventDate     || '',
      guestCount:    data.guestCount    || '',
      itemsInterest: data.itemsInterest || '',
      items:         data.items         || [],
      source:        data.source        || 'Website',
      status:        'pending',         // pending | quoted | declined
      createdAt:     new Date().toISOString()
    };
    requests.unshift(request);
    localStorage.setItem('mirj_quote_requests', JSON.stringify(requests));

    // Log Bob alert
    logMessage({
      type: 'quote_request',
      subject: `Quote Request — ${request.name || 'Unknown'} (${request.eventType || 'Event'}, ${request.eventDate || 'date TBD'})`,
      body: [
        '=== NEW QUOTE REQUEST ===',
        '',
        `Name:          ${request.name}`,
        `Phone:         ${request.phone}`,
        `Email:         ${request.email}`,
        `Address:       ${request.address}`,
        '',
        `Event Type:    ${request.eventType || 'Not specified'}`,
        `Event Date:    ${request.eventDate || 'Not specified'}`,
        `Guests:        ${request.guestCount || 'Not specified'}`,
        `Items Needed:  ${request.itemsInterest || 'Not specified'}`,
        '',
        `Source:        ${request.source}`,
        `Ref:           ${id}`,
        '',
        'Open Admin Panel → Quotes tab to build the formal quotation.'
      ].join('\n')
    });

    return request;
  }

  function updateQuoteRequest(id, updates) {
    const requests = getQuoteRequests();
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return false;
    Object.assign(requests[idx], updates, { updatedAt: new Date().toISOString() });
    localStorage.setItem('mirj_quote_requests', JSON.stringify(requests));
    return true;
  }

  /**
   * Convert a quote request into a proper booking + generate formal quotation.
   * @param {string} requestId   - The QR... id from mirj_quote_requests
   * @param {Array}  items       - [{ key, qty }] confirmed by admin
   * @returns {Object|null}      - The created booking object (contains .quotation)
   */
  function buildQuoteFromRequest(requestId, items, deliveryFee) {
    const requests = getQuoteRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return null;

    const bookingData = {
      customerName: req.name,
      phone:        req.phone,
      email:        req.email,
      address:      req.address,
      eventDate:    req.eventDate || new Date().toISOString().split('T')[0],
      eventType:    req.eventType || '',
      guestCount:   req.guestCount || '',
      items:        items
    };
    if (typeof deliveryFee === 'number') bookingData.deliveryFee = deliveryFee;

    const booking = createBooking(bookingData);

    // Mark the quote request as quoted
    updateQuoteRequest(requestId, { status: 'quoted', bookingId: booking.id });

    logMessage({
      type: 'info',
      subject: `Quotation #${booking.quotation.number} generated for ${req.name}`,
      body: `A formal quotation (Ref: ${booking.id}, #${booking.quotation.number}) has been generated from quote request ${requestId}.\n\nCustomer: ${req.name}\nEvent: ${req.eventType} on ${req.eventDate}\nTotal: R${booking.totalCost.toLocaleString()}`
    });

    return booking;
  }

  // =================== JANE AVAILABILITY HELPER ===================
  /**
   * Called by Jane to check a single item's availability.
   * Returns a user-facing status without exposing internal details.
   */
  function janeCheckItem(itemKey, date, qty = 1) {
    const result = checkAvailability(date, [{ key: itemKey, qty }]);
    return {
      ok: result.available,
      // Jane should never reveal stock numbers, only availability status
      message: result.available ? 'available' : 'unavailable'
    };
  }

  // =================== INIT ===================
  function init() {
    // Seed some demo messages if first time
    const msgs = getMessages();
    if (msgs.length === 0) {
      logMessage({ type: 'info', subject: 'Bob is online', body: 'Inventory management system initialised. All stock levels loaded. Monitoring for new bookings and availability conflicts.' });
    }
  }

  init();

  // =================== PUBLIC API ===================
  return {
    INVENTORY_MASTER,
    checkAvailability,
    createBooking,
    updateBookingStatus,
    getBookingsByDate,
    getAllBookings,
    getInventoryReport,
    getMessages,
    markAllRead,
    getUnreadCount,
    janeCheckItem,
    logMessage,
    sendOwnerEmail,
    generateQuotationHTML,
    generateQuotationDOC,
    saveQuoteRequest,
    getQuoteRequests,
    updateQuoteRequest,
    buildQuoteFromRequest,
    OWNER_EMAIL
  };

})();

// Make Bob globally available (but NOT on customer-facing UI — handled by jane.js)
window.Bob = Bob;
