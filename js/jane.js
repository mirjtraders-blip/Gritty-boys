/**
 * JANE — Mirj Rentals Senior Event Consultant & EventMaster Pro AI
 * Jane is a world-class event planning and logistics specialist with 25+ years of experience.
 * She designs layouts, calculates capacities, recommends packages, and processes bookings.
 * Jane silently coordinates with Bob (inventory) and never exposes stock details to customers.
 */

const Jane = (() => {

  // =================== CONVERSATION STATE ===================
  let state = {
    phase: 'greeting',      // greeting | inquire_event | inquire_date | inquire_items | collecting_details | confirm | done
    customerName: null,
    customerPhone: null,
    customerEmail: null,
    eventDate: null,
    eventType: null,
    guestCount: null,
    venueDimensions: null,  // { width, length, area }
    eventStyle: null,       // 'seated_dining' | 'cocktail' | 'theatre' | 'mixed'
    items: [],              // [{ key, qty }]
    quoteTotal: 0,
    awaitingField: null,
    lastContext: null,
    leadCollected: false,   // true once contact info has been captured & submitted
    pendingLead: {},        // stores partial contact info before submission
    exchangeCount: 0,       // tracks number of conversation exchanges
    leadPromptShown: false, // prevents duplicate lead prompts
    customerAddress: null,  // physical address of event venue
    collectingFor: null,    // 'quote' | 'callback' | 'booking'
    itemsInterest: null,    // freeform items description collected during quote flow
    lastSuggestion: null,   // last item(s) Jane recommended — confirmed with "yes"
    lastCategory: null,     // last category shown (chairs/tables/tents) for context
    history: []             // recent [role, text] pairs for context window
  };

  // =================== SPATIAL INTELLIGENCE ENGINE ===================
  // Square metres required per guest by event style (industry standards)
  const SPATIAL = {
    area: {
      seated_dining:  1.5,   // Round tables, chairs, walkways
      seated_banquet: 1.2,   // Trestle tables, tighter layout
      cocktail:       0.8,   // Standing with high tables
      theatre:        0.6,   // Rows of chairs only
      dance_floor:    0.4,   // Per dancing guest
    },
    clearance: {
      table_to_table:  1.5,
      chair_pull:      0.6,
      service_lane:    1.2,
      main_walkway:    1.8,
      emergency_exit:  2.0,
      stage_front:     3.0,
      buffet_queue:    2.5,
    }
  };

  // =================== TENT / STRUCTURE CAPACITY ===================
  const TENT_CAPACITY = {
    "2x2 Gazebo":         { area: 4,   seated: 6,   standing: 8,   ideal: 'bar station, gift table, registration point, small display' },
    "3x3 Gazebo":         { area: 9,   seated: 10,  standing: 15,  ideal: 'intimate dining corner, catering station, small VIP area' },
    "3x6 Gazebo":         { area: 18,  seated: 20,  standing: 30,  ideal: 'buffet zone, DJ setup, VIP lounge, small gathering of 20' },
    "3x9 Cabana":         { area: 27,  seated: 30,  standing: 50,  ideal: 'elegant seated dining, picnic-style events, cocktail lounge' },
    "Stretch Tent 6x9":   { area: 54,  seated: 40,  standing: 70,  ideal: 'garden weddings, cocktail parties, corporate sundowners' },
    "Stretch Tent 6x12":  { area: 72,  seated: 60,  standing: 90,  ideal: 'medium weddings, gala dinners, large garden parties' },
    "Marquee 6x9":        { area: 54,  seated: 54,  standing: 90,  ideal: 'fully enclosed medium events, corporate dinners, 50th birthdays' },
    "Marquee 6x12":       { area: 72,  seated: 80,  standing: 120, ideal: 'large weddings, gala events, exhibitions, conferences' },
  };

  // =================== EVENT PROFILES ===================
  const EVENT_PROFILES = {
    wedding: {
      style: 'seated_dining', chairsPerGuest: 1, tableSize: 8,
      extras: ['Backdrop Arcs', 'Magazine Photobooth', 'Step Display'],
      tips: [
        'Allow a 1.8m central aisle for the bridal entrance',
        'Position the cake table visible from all seats — it\'s a focal point',
        'Place the photo booth near natural light for the best shots',
        'Stage/podium should face the majority of seating',
      ],
      setupTime: 5, staff: 5,
    },
    birthday: {
      style: 'mixed', chairsPerGuest: 0.8, tableSize: 8,
      extras: ['Balloon Setup', 'Step Display', 'Backdrop Arcs'],
      tips: [
        'Cluster seating by age group — adults near the bar, kids near activities',
        'Keep the dance floor central to encourage participation',
        'Make the dessert table the visual centrepiece of the venue',
      ],
      setupTime: 3, staff: 3,
    },
    corporate: {
      style: 'mixed', chairsPerGuest: 1, tableSize: 8,
      extras: ['Stage Platform 2x2', 'Backdrop Arcs'],
      tips: [
        'Stage should face the majority of seating with 3m clearance',
        'Registration table at the entrance — first impression matters',
        'Create a dedicated networking zone near the refreshment station',
        'Ensure brand/signage visibility from all vantage points',
      ],
      setupTime: 4, staff: 4,
    },
    cocktail: {
      style: 'cocktail', chairsPerGuest: 0.4, tableSize: 0,
      extras: ['Magazine Photobooth', 'Balloon Setup'],
      tips: [
        'Place high tables every 4–5 guests to encourage natural clustering',
        'Wide walkways (2m+) promote mingling and guest flow',
        'Distribute catering stations evenly to prevent congestion',
      ],
      setupTime: 2, staff: 2,
    },
    'baby shower': {
      style: 'seated_dining', chairsPerGuest: 1, tableSize: 6,
      extras: ['Step Display', 'Food Pedestals', 'Backdrop Arcs'],
      tips: [
        'Intimate round seating creates the best social atmosphere',
        'Gift table near the entrance — easy for arriving guests',
        'Dessert and cake table as the visual focal point',
      ],
      setupTime: 2.5, staff: 2,
    },
    graduation: {
      style: 'mixed', chairsPerGuest: 1, tableSize: 8,
      extras: ['Stage Platform 2x2', 'Backdrop Arcs', 'Magazine Photobooth'],
      tips: [
        'A stage is essential for speeches and the all-important photo moment',
        'Photo backdrop generates the most shared content from the event',
        'Allow standing ovation space (1m clearance) in front of the first row',
      ],
      setupTime: 3, staff: 3,
    },
    'engagement': {
      style: 'cocktail', chairsPerGuest: 0.6, tableSize: 6,
      extras: ['Backdrop Arcs', 'Balloon Setup', 'Magazine Photobooth'],
      tips: [
        'Cocktail-style promotes mingling and creates an intimate buzz',
        'A backdrop arc for photos is a must — guests will want to capture the moment',
        'Keep the champagne/drinks station highly visible and accessible',
      ],
      setupTime: 2.5, staff: 2,
    },
  };

  // =================== PACKAGE PRESETS BY GUEST COUNT ===================
  const PACKAGES = [
    {
      label: 'Intimate Gathering',    range: [1, 25],
      tent: '3x3 Gazebo',             tents: 1,
      chairs: 25, chairType: 'White Foldable Chairs',
      description: 'Perfect for garden teas, intimate celebrations, small bridal showers, and family functions.',
      upsell: ['Step Display', 'Food Pedestals', 'Backdrop Arcs'],
    },
    {
      label: 'Small Celebration',     range: [26, 50],
      tent: '3x6 Gazebo',             tents: 1,
      chairs: 50, chairType: 'White Foldable Chairs',
      description: 'Ideal for birthday parties, baby showers, engagement sundowners, and small corporate lunches.',
      upsell: ['Magazine Photobooth', 'Balloon Setup', 'Backdrop Arcs'],
    },
    {
      label: 'Medium Function',       range: [51, 80],
      tent: '3x9 Cabana',             tents: 1,
      chairs: 80, chairType: 'White Foldable Chairs',
      description: 'Great for elegant garden parties, milestone birthdays, medium weddings, and corporate braais.',
      upsell: ['Stage Platform 2x2', 'Magazine Photobooth', 'Backdrop Arcs'],
    },
    {
      label: 'Large Event',           range: [81, 120],
      tent: 'Marquee 6x9',            tents: 1,
      chairs: 100, chairType: 'White Foldable Chairs',
      description: 'Suited for weddings, 21st birthdays, corporate dinners, and larger family celebrations.',
      upsell: ['Stage Platform 2x2', 'Backdrop Arcs', 'Magazine Photobooth'],
    },
    {
      label: 'Grand Celebration',     range: [121, 999],
      tent: 'Marquee 6x12',           tents: 1,
      chairs: 150, chairType: 'White Foldable Chairs',
      description: 'Grand weddings, gala dinners, conferences, exhibitions, and large corporate functions.',
      upsell: ['Stage Platform 2x2', 'Stage Platform 1x1', 'Magazine Photobooth', 'Backdrop Arcs'],
    },
  ];

  // =================== PRODUCT KNOWLEDGE BASE ===================
  const productKeywords = {
    "3x6 Gazebo":            ["3x6","3 by 6","3x6 gazebo","large gazebo","big gazebo"],
    "3x3 Gazebo":            ["3x3","3 by 3","3x3 gazebo","medium gazebo"],
    "2x2 Gazebo":            ["2x2","2 by 2","small gazebo","2x2 gazebo"],
    "3x9 Cabana":            ["cabana","3x9","cabin","cabana tent"],
    "Stretch Tent 6x9":      ["stretch tent","stretch 6x9","stretch 9"],
    "Stretch Tent 6x12":     ["stretch 6x12","stretch 12","large stretch"],
    "Marquee 6x9":           ["marquee","marquee 6x9","marquee 9"],
    "Marquee 6x12":          ["marquee 6x12","marquee 12","large marquee"],
    "Black Stackable Chairs":["stackable","black stackable","cheap chair","stackable chair"],
    "Black Foldable Chairs": ["black foldable","black fold","black chair","black foldable chair"],
    "Tiffany Chairs":        ["tiffany","tiffany chair","tiffany chairs","chiavari","chiavari chair","fancy chair","tifany","tiffney","tifney","tiffnay","tifnay"],
    "White Foldable Chairs": ["white chair","white foldable","foldable chair","white fold","plastic chair","white plastic chair"],
    "White 4-Seater Benches":["bench","benches","white bench","4 seater bench","4-seater bench"],
    "Cocktail Chairs":       ["cocktail chair","cocktail chairs","bar stool","bar stools","barstool","bartstool","high stool","high chair","cocktail seat"],
    "Stage Platform 2x2":    ["stage","2x2 stage","platform","stage platform","staging","podium"],
    "Stage Platform 1x1":    ["1x1 stage","small stage","small platform","1x1 platform"],
    "Magazine Photobooth":   ["photobooth","photo booth","magazine booth","booth","photo booth","photobooth hire","mag booth"],
    "Backdrop Arcs":         ["backdrop","arch","arc","balloon arch","floral arch","backdrop arc","flower arch"],
    "Balloon Setup":         ["balloon","balloons","balloon setup","balloon decor","balloon decoration"],
    "Display Table":         ["display table","gift table","signing table","registration table","display tbl","cake table","gift table"],
    "Cocktail Tables":       ["cocktail table","cocktail tables","high table","high tables","standing table","poseur table","tall table","cocktail tbl"],
    "Foldable Tables":       ["foldable table","foldable tables","folding table","folding tables","trestle","trestle table","fold table","foldable tbl","rectangular table"],
    "Round Tables":          ["round table","round tables","circular table","round tbl","round dining","banquet table"],
    "Step Display":          ["step display","cake stand","cake table","cake display","step stand","cake stand hire","step display stand"],
    "Food Pedestals":        ["food pedestal","food pedestals","table riser","table risers","table rise","food riser","food risers","pedestal","pedestals","food display","serving stand","riser","stand riser","display riser"],
    "Pyramid Stand":         ["pyramid","pyramid stand","display pyramid","pyramid display"],
    "Chair Cover (B/W)":     ["chair cover","cover","chair covers","chair wrap"],
  };

  const PRICING = window.Bob ? window.Bob.INVENTORY_MASTER : {};

  // =================== RESPONSE TEMPLATES ===================
  const greetings = [
    "Good day! Welcome to Mirj Rentals. I'm Jane — your personal event consultant and planning specialist. I can design a layout for your venue, calculate exactly what you need for any guest count, and put together a quote in minutes. What are we planning today? 🥂",
    "Hello and welcome! I'm Jane from Mirj Rentals. With years of experience in event design, spatial planning, and logistics, I help clients create truly flawless occasions. Tell me — what's the event, and how many guests are we expecting?",
    "Welcome to Mirj Rentals! I'm Jane — senior event consultant. I can help you design the perfect layout, recommend the right equipment for your guest count, calculate seating capacity, and get you a full quote in minutes. What are we celebrating? 🎉"
  ];

  const unavailableResponses = [
    "I sincerely apologise — that particular item isn't available for your chosen date. I'd love to explore alternatives or find another date that works beautifully for you. Shall I suggest similar options?",
    "My apologies — it seems that item is fully committed on that date. Your event deserves our full dedication. Shall we look at an alternative or a different date?",
    "I'm so sorry, that item is unavailable for that date. At Mirj Rentals we never double-book — your event is always our priority. Can I suggest an alternative arrangement?"
  ];

  const confirmations = [
    "Wonderful! Your enquiry has been successfully submitted. Our team will review everything and get back to you within 24 hours with a full confirmation. You're in very good hands!",
    "Excellent! I've passed your details to our team. You'll receive a personalised response within 24 hours. We look forward to making your event extraordinary!",
    "Perfect — your booking request is in! Our team will reach out shortly to confirm all details and provide your final invoice. Thank you for choosing Mirj Rentals!"
  ];

  // =================== CORE HELPERS ===================
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmt(n) { return `R${Number(n).toLocaleString('en-ZA')}`; }

  function parseDate(str) {
    const clean = str.trim();
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      d = new Date(clean);
    } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(clean)) {
      const p = clean.split(/[\/\-]/);
      d = new Date(`${p[2]}-${p[1]}-${p[0]}`);
    } else { d = new Date(clean); }
    if (isNaN(d.getTime())) return null;
    if (d < new Date()) return null;
    return d.toISOString().split('T')[0];
  }

  // =================== NLP UTILITIES ===================

  /** Written numbers → digits */
  const NUM_WORDS = {
    'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,
    'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,'fourteen':14,
    'fifteen':15,'sixteen':16,'seventeen':17,'eighteen':18,'nineteen':19,
    'twenty':20,'thirty':30,'forty':40,'fifty':50,'sixty':60,'seventy':70,
    'eighty':80,'ninety':90,'a hundred':100,'hundred':100
  };
  function normalizeNumbers(str) {
    // compound: "twenty five" → "25"
    let s = str.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[- ](one|two|three|four|five|six|seven|eight|nine)\b/gi,
      (_, t, o) => String((NUM_WORDS[t.toLowerCase()]||0) + (NUM_WORDS[o.toLowerCase()]||0)));
    // single words
    s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi,
      m => String(NUM_WORDS[m.toLowerCase()] || m));
    return s;
  }

  /** Known common typos and informal spellings → canonical form */
  const TYPO_MAP = [
    [/\btiffnay\b/gi,'tiffany'],[/\btifany\b/gi,'tiffany'],[/\btifanny\b/gi,'tiffany'],
    [/\btiffney\b/gi,'tiffany'],[/\btifney\b/gi,'tiffany'],[/\btifnay\b/gi,'tiffany'],
    [/\bchiaverie\b/gi,'chiavari'],[/\bchivari\b/gi,'chiavari'],
    [/\btabel\b/gi,'table'],[/\btables\b/gi,'tables'],[/\btaable\b/gi,'table'],
    [/\bchari\b/gi,'chair'],[/\bcahir\b/gi,'chair'],[/\bchiar\b/gi,'chair'],
    [/\bchairs\b/gi,'chairs'],
    [/\bfoldible\b/gi,'foldable'],[/\bfoldeable\b/gi,'foldable'],
    [/\bmarqee\b/gi,'marquee'],[/\bmarque\b/gi,'marquee'],
    [/\bgazibo\b/gi,'gazebo'],[/\bgazeebo\b/gi,'gazebo'],[/\bgaezbo\b/gi,'gazebo'],
    [/\bphoot?o?booth\b/gi,'photobooth'],[/\bphoto[ -]?booth\b/gi,'photobooth'],
    [/\bbakcrop\b/gi,'backdrop'],[/\bbackrop\b/gi,'backdrop'],
    [/\bpiramid\b/gi,'pyramid'],[/\bpyramid\b/gi,'pyramid'],
    [/\bstraech\b/gi,'stretch'],[/\bstrech\b/gi,'stretch'],
    [/\bbensh\b/gi,'bench'],[/\bstoolz\b/gi,'stools'],
    [/\bgive me\b/gi,'add'],[/\bi want\b/gi,'add'],[/\bi need\b/gi,'add'],
    [/\bplease add\b/gi,'add'],[/\bcan i get\b/gi,'add'],[/\bcan i have\b/gi,'add'],
    [/\blet me have\b/gi,'add'],[/\badd on\b/gi,'add'],
    [/\bmove on\b/gi,'done'],[/\blets go\b/gi,'done'],[/\blet'?s go\b/gi,'done'],
    [/\ball good\b/gi,'done'],[/\bready\b/gi,'done'],
    [/\bthat will do\b/gi,'done'],[/\bthat'?s it\b/gi,'done'],
    [/\bgo ahead\b/gi,'done'],[/\bproceed\b/gi,'done'],
  ];
  function correctTypos(msg) {
    let s = msg;
    for (const [re, fix] of TYPO_MAP) s = s.replace(re, fix);
    return s;
  }

  /** Levenshtein distance between two strings */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = [];
    for (let i = 0; i <= m; i++) { dp[i] = [i]; for (let j = 1; j <= n; j++) dp[i][j] = 0; }
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
  }

  /** Fuzzy single-word match — returns product key or null */
  function fuzzyWordMatch(word) {
    if (word.length < 4) return null;
    let best = null, bestDist = Math.floor(word.length * 0.4);
    for (const [key, kws] of Object.entries(productKeywords)) {
      for (const kw of kws) {
        for (const kwWord of kw.split(/\s+/)) {
          if (kwWord.length < 4) continue;
          const d = levenshtein(word, kwWord);
          if (d < bestDist) { bestDist = d; best = key; }
        }
      }
    }
    return best;
  }

  /** Smart product detection: exact → typo-corrected exact → fuzzy */
  function detectProduct(msg) {
    const lower = msg.toLowerCase();
    // 1. Exact substring match
    for (const [key, kws] of Object.entries(productKeywords)) {
      if (kws.some(kw => lower.includes(kw))) return key;
    }
    // 2. Typo-corrected exact
    const corrected = correctTypos(lower);
    for (const [key, kws] of Object.entries(productKeywords)) {
      if (kws.some(kw => corrected.includes(kw))) return key;
    }
    // 3. Word-level fuzzy
    for (const word of corrected.split(/\s+/)) {
      const match = fuzzyWordMatch(word);
      if (match) return match;
    }
    return null;
  }

  /** Extract ALL product+qty pairs from a single message (multi-item NLP) */
  function parseAllItems(msg) {
    const corrected = correctTypos(msg);
    const normalized = normalizeNumbers(corrected.toLowerCase());
    const results = [];

    // Split into segments by comma, semicolon, "and", "as well as", "plus", "&"
    const segments = normalized.split(/[,;]|\s+and\s+|\s+as well as\s+|\s+plus\s+|\s+&\s+/);

    for (const rawSeg of segments) {
      const seg = rawSeg.trim();
      if (!seg) continue;

      let productKey = null;

      // Exact match in this segment
      for (const [key, kws] of Object.entries(productKeywords)) {
        if (kws.some(kw => seg.includes(kw))) { productKey = key; break; }
      }

      // Fuzzy fallback
      if (!productKey) {
        for (const word of seg.split(/\s+/)) {
          if (word.length >= 4) {
            const m = fuzzyWordMatch(word);
            if (m) { productKey = m; break; }
          }
        }
      }

      if (!productKey) continue;

      // Extract quantity: look for number before or after product keyword
      const qtyMatch = seg.match(/(\d+)/);
      const qty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1])) : 1;

      if (!results.find(r => r.key === productKey)) {
        results.push({ key: productKey, qty });
      }
    }

    // Deduplicate and merge quantities
    const merged = [];
    for (const r of results) {
      const ex = merged.find(m => m.key === r.key);
      if (ex) ex.qty = Math.max(ex.qty, r.qty);
      else merged.push({ ...r });
    }
    return merged;
  }

  function extractQty(str) {
    // Check for "X x product", "Xx product", or standalone number
    const patterns = [
      /(\d+)\s*[x×]/i,   // "20x chairs"
      /\badd\s+(\d+)/i,  // "add 20 chairs"
      /(\d+)/            // any number
    ];
    const normalized = normalizeNumbers(str);
    for (const p of patterns) {
      const m = normalized.match(p);
      if (m) return Math.max(1, parseInt(m[1]));
    }
    return 1;
  }

  function parseGuestCount(msg) {
    const patterns = [
      /(\d+)\s*(guests?|people|persons?|pax|attendees?|attending|expected)/i,
      /for\s+(\d+)\s*(guests?|people|pax)/i,
      /expecting\s+(\d+)/i,
      /about\s+(\d+)\s*(guests?|people)/i,
      /around\s+(\d+)\s*(guests?|people)/i,
      /(\d+)\s*-\s*(\d+)\s*(guests?|people)/i,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return parseInt(m[1]);
    }
    return null;
  }

  function parseVenueDimensions(msg) {
    const m = msg.match(/(\d+)\s*[xX×]\s*(\d+)\s*(m|metre|meter)?/i);
    if (m) {
      const w = parseInt(m[1]), l = parseInt(m[2]);
      return { width: w, length: l, area: w * l };
    }
    return null;
  }

  function detectProduct(msg) {
    const lower = msg.toLowerCase();
    for (const [key, kws] of Object.entries(productKeywords)) {
      if (kws.some(kw => lower.includes(kw))) return key;
    }
    return null;
  }

  function extractEventType(msg) {
    const types = ['wedding','birthday','corporate','baby shower','engagement','graduation',
      'anniversary','function','conference','party','ceremony','celebration',
      'christening','matric','farewell','gala','cocktail'];
    const lower = msg.toLowerCase();
    return types.find(t => lower.includes(t)) || null;
  }

  function getPackage(guests) {
    return PACKAGES.find(p => guests >= p.range[0] && guests <= p.range[1]) || PACKAGES[PACKAGES.length - 1];
  }

  function bestTentForGuests(guests, isSeated = true) {
    const entries = Object.entries(TENT_CAPACITY);
    return entries.find(([, d]) => (isSeated ? d.seated : d.standing) >= guests) || entries[entries.length - 1];
  }

  function buildQuoteSummary() {
    if (!state.items.length) return "No items selected yet.";
    let total = 0;
    const lines = state.items.map(({ key, qty }) => {
      const item = PRICING[key];
      if (!item) return `  • ${qty}× ${key}`;
      const sub = item.cost * qty;
      total += sub;
      return `  • ${qty}× ${key} @ ${fmt(item.cost)} ${item.unit} = ${fmt(sub)}`;
    });
    state.quoteTotal = total;
    return lines.join('\n') + `\n\n  **Estimated Total: ${fmt(total)}** (excl. delivery)`;
  }

  // =================== LEAD CAPTURE ENGINE ===================

  /**
   * Extracts contact information from a user message.
   * Returns an object with any found fields: name, phone, email, address.
   */
  function detectContactInfo(msg) {
    const found = {};

    // Email (highest precision — detect first)
    const emailMatch = msg.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) found.email = emailMatch[0];

    // South African phone numbers: 0XX XXX XXXX, 0XXXXXXXXX, +27XXXXXXXXX, (+27)...
    const phoneMatch = msg.match(/(?:\+27|0027|\(?\+?27\)?)[\s\-]?(?:\(0\)[\s\-]?)?[1-9]\d[\s\-]?\d{3}[\s\-]?\d{4}|0[1-9]\d[\s\-]?\d{3}[\s\-]?\d{4}/);
    if (phoneMatch) found.phone = phoneMatch[0].replace(/\s/g, ' ').trim();

    // Address (contains street type words OR place names OR starts with a number)
    const addressKeywords = /\b(road|street|str|ave|avenue|drive|close|crescent|place|estate|johannesburg|jozi|gauteng|pretoria|cape town|sandton|midrand|centurion|soweto|fourways|randburg|roodepoort|kempton|benoni|boksburg|krugersdorp)\b/i;
    const numberStreetPattern = /\b\d+\s+[A-Z][a-z]{2,}/;
    if (addressKeywords.test(msg) || numberStreetPattern.test(msg)) {
      // Extract the address as the segment of the message most likely to be an address
      const addrMatch = msg.match(/\d+\s+[\w\s,]+(?:road|street|str|ave|avenue|drive|close|crescent|place|estate)/i)
                     || msg.match(/[\w\s,]+(?:road|street|str|ave|avenue|drive|close|crescent|place|estate)[\w\s,]*/i)
                     || msg.match(/(?:johannesburg|jozi|gauteng|pretoria|cape town|sandton|midrand|centurion|soweto|fourways|randburg|roodepoort)[\w\s,]*/i);
      if (addrMatch) found.address = addrMatch[0].trim();
    }

    // Name: 2+ capitalised words, not matching other patterns, not pure numbers/emails/phones
    // Only try to extract name if we haven't already found an email at the same location
    const cleanMsg = msg.replace(emailMatch ? emailMatch[0] : '', '')
                        .replace(phoneMatch ? phoneMatch[0] : '', '')
                        .replace(found.address || '', '');
    const nameMatch = cleanMsg.match(/\b([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,}){1,3})\b/);
    if (nameMatch) found.name = nameMatch[1].trim();

    return found;
  }

  /**
   * Returns true if a message contains enough contact info to be a lead submission.
   * Requires at least a name + phone, or name + email, or phone + email.
   */
  function hasContactInfo(info) {
    const fields = Object.keys(info).filter(k => info[k]);
    return (info.name && info.phone) || (info.name && info.email) || (info.phone && info.email) || fields.length >= 2;
  }

  /**
   * Builds the lead prompt message to append to substantive responses.
   */
  function buildLeadPrompt() {
    return `\n\n---\nTo get you a formal quote, I just need a few quick details — what's your **name**, **phone number**, **email address**, and the **venue/physical address** of your event?`;
  }

  /**
   * Submits the collected lead: opens mailto, saves to localStorage, confirms to user.
   */
  function submitLead(info, productsMentioned) {
    // Merge with pending lead
    const lead = { ...state.pendingLead, ...info };
    if (state.guestCount) lead.guestCount = state.guestCount;
    if (state.eventType) lead.eventType = state.eventType;
    if (productsMentioned) lead.productsMentioned = productsMentioned;
    lead.timestamp = new Date().toISOString();
    lead.source = 'Jane Chat Widget';

    // Save to localStorage
    const leads = (() => { try { return JSON.parse(localStorage.getItem('mirj_leads') || '[]'); } catch(e) { return []; } })();
    leads.push(lead);
    localStorage.setItem('mirj_leads', JSON.stringify(leads));

    // Build mailto body
    const bodyLines = [
      `New Event Enquiry via Jane (Chat Widget)`,
      ``,
      `Name:          ${lead.name || 'Not provided'}`,
      `Phone:         ${lead.phone || 'Not provided'}`,
      `Email:         ${lead.email || 'Not provided'}`,
      `Event Address: ${lead.address || 'Not provided'}`,
      `Event Type:    ${lead.eventType || 'Not specified'}`,
      `Guest Count:   ${lead.guestCount ? lead.guestCount + ' guests' : 'Not specified'}`,
      `Products Mentioned: ${(lead.productsMentioned && lead.productsMentioned.length) ? lead.productsMentioned.join(', ') : 'General enquiry'}`,
      ``,
      `Submitted: ${new Date(lead.timestamp).toLocaleString('en-ZA')}`,
      `Source: ${lead.source}`
    ];

    const subjectName = lead.name || 'Website Lead';
    const subject = `New Event Enquiry — ${subjectName}`;
    const body = bodyLines.join('\n');

    // Send via EmailJS — NO mailto popup
    if (window.MirjEmail) {
      MirjEmail.send({
        subject:     `[Mirj Rentals] ${subject}`,
        type:        'Chat Enquiry (Jane)',
        name:        lead.name        || '',
        phone:       lead.phone       || '',
        from_email:  lead.email       || '',
        address:     lead.address     || '',
        event_date:  state.eventDate  || '',
        event_type:  lead.eventType   || state.eventType || '',
        guests:      lead.guestCount  ? String(lead.guestCount) : '',
        items:       (lead.productsMentioned || []).join(', '),
        message:     ''
      });
    }

    // Mark lead as collected
    state.leadCollected = true;
    state.customerName = lead.name || state.customerName;
    state.customerPhone = lead.phone || state.customerPhone;
    state.customerEmail = lead.email || state.customerEmail;

    const firstName = (lead.name || 'there').split(' ')[0];
    return `Perfect, ${firstName}! I've sent your details through to the Mirj Rentals team. They'll be in touch within **24 hours** with a personalised quote. Is there anything else I can help you with?`;
  }

  /**
   * Checks whether a lead prompt should be appended to a response.
   * Triggers after substantive advice responses when lead not yet collected.
   */
  function shouldPromptForLead() {
    if (state.leadCollected || state.leadPromptShown) return false;
    if (state.phase === 'collecting_details' || state.phase === 'confirm' || state.phase === 'done') return false;
    return (state.guestCount !== null) || (state.exchangeCount >= 3);
  }

  // =================== PLANNING INTENT DETECTOR ===================
  function detectIntent(msg) {
    const m = msg.toLowerCase();
    if (/(\d+)\s*(guests?|people|persons?|pax|attending)/i.test(msg) ||
        /for\s+(\d+)\s*(guests?|people)/i.test(msg) ||
        /expecting\s+(\d+)/i.test(msg)) return 'guest_count';
    if (/(\d+)\s*[xX×]\s*(\d+)/i.test(msg) &&
        /m\b|metre|meter|venue|space|area|size/i.test(msg)) return 'venue_size';
    if (/\b(layout|floor.?plan|set.?up|arrange|design my|plan my|plan the)\b/i.test(msg)) return 'layout_request';
    if (/how many\s*(chair|table|tent|gazebo|seat|bench)/i.test(msg)) return 'quantity_advice';
    if (/(which|what size|best)\s*(tent|gazebo|marquee|structure|canopy)/i.test(msg)) return 'tent_advice';
    if (/(fit|seat|hold|accommodate|host|capacity)\b.*\d/i.test(msg) ||
        /how many.*(fit|seat|accommodate|hold)/i.test(msg)) return 'capacity_check';
    if (/\b(recommend|suggest|what do (i|we) need|best (package|setup|for)|what should i (get|hire|use))\b/i.test(msg)) return 'recommendation';
    return null;
  }

  // =================== EVENTMASTER RESPONSE FUNCTIONS ===================

  /**
   * Responds when a guest count is detected — full analysis report
   */
  function respondGuestCount(msg) {
    const guests = parseGuestCount(msg);
    if (!guests) return null;
    state.guestCount = guests;

    const eventType = extractEventType(msg) || state.eventType;
    if (eventType && !state.eventType) state.eventType = eventType;

    const profile = EVENT_PROFILES[eventType] || EVENT_PROFILES['birthday'];
    const pkg = getPackage(guests);
    const isSeated = profile.style !== 'cocktail';
    const [tentName, tentData] = bestTentForGuests(guests, isSeated);
    const requiredArea = Math.ceil(guests * SPATIAL.area[profile.style]);
    const tablesNeeded = profile.tableSize ? Math.ceil(guests / profile.tableSize) : 0;
    const chairsNeeded = Math.ceil(guests * profile.chairsPerGuest);
    const tentPrice = PRICING[tentName];

    let r = `**📊 EventMaster Analysis — ${guests} Guests**\n`;
    if (eventType) r += `*${eventType.charAt(0).toUpperCase() + eventType.slice(1)}*\n`;
    r += `${'─'.repeat(36)}\n\n`;

    r += `**🏕️ Recommended Structure:**\n`;
    r += `  • **${tentName}** — ${tentData.ideal}\n`;
    r += `  • Capacity: ${tentData.seated} seated / ${tentData.standing} standing\n`;
    if (tentPrice) r += `  • Price: ${fmt(tentPrice.cost)} ${tentPrice.unit}\n`;
    r += `  • Area required: ~${requiredArea}m²\n\n`;

    r += `**🪑 Seating:**\n`;
    r += `  • **${chairsNeeded} chairs** minimum\n`;
    if (tablesNeeded) r += `  • **~${tablesNeeded} tables** (${profile.tableSize}-seater rounds)\n`;
    r += `\n`;

    if (profile.extras?.length) {
      r += `**✨ Recommended Additions:**\n`;
      profile.extras.forEach(e => {
        const item = PRICING[e];
        if (item) r += `  • ${e} — ${fmt(item.cost)} ${item.unit}\n`;
      });
      r += `\n`;
    }

    if (profile.tips?.length) {
      r += `**💡 Planning Tips:**\n`;
      profile.tips.slice(0, 2).forEach(t => r += `  • ${t}\n`);
      r += `\n`;
    }

    r += `**📦 Package: ${pkg.label}** — ${pkg.description}\n\n`;
    r += `Want a **full layout plan**, or shall I start building a **quote** for your ${eventType || 'event'}?`;

    if (state.phase === 'greeting' || state.phase === 'inquire_event') state.phase = 'inquire_date';
    // Store last suggestion so customer can say "yes" to confirm
    state.lastSuggestion = [{ key: tentName, qty: 1 }];
    return r;
  }

  /**
   * Generates a structured event layout plan
   */
  function respondLayoutRequest(msg) {
    const guests = parseGuestCount(msg) || state.guestCount;
    const eventType = extractEventType(msg) || state.eventType || 'function';
    const venue = parseVenueDimensions(msg) || state.venueDimensions;

    if (!guests && !venue) {
      return "I'd love to design a layout for you! To create an accurate plan, could you share:\n\n• **How many guests** are you expecting?\n• **Venue size** if known (e.g. 15×20m)\n• **Event type** (wedding, birthday, corporate, etc.)";
    }

    if (guests) state.guestCount = guests;
    if (eventType) state.eventType = eventType;
    if (venue) state.venueDimensions = venue;

    const gc = guests || 60;
    const profile = EVENT_PROFILES[eventType] || EVENT_PROFILES['birthday'];
    const isSeated = profile.style !== 'cocktail';
    const [tentName, tentData] = bestTentForGuests(gc, isSeated);
    const tablesNeeded = profile.tableSize ? Math.ceil(gc / profile.tableSize) : 0;
    const chairsNeeded = Math.ceil(gc * profile.chairsPerGuest);
    const requiredArea = Math.ceil(gc * SPATIAL.area[profile.style]);
    const staffNeeded = Math.max(2, Math.ceil(gc / 30));
    const setupTime = profile.setupTime || 3;

    // Comfort score
    const cap = isSeated ? tentData.seated : tentData.standing;
    const comfortScore = Math.min(98, Math.round(80 + ((cap - gc) / Math.max(cap, 1)) * 25));

    const evtDisplay = eventType.charAt(0).toUpperCase() + eventType.slice(1);

    let layout = `**📐 EventMaster Layout Plan**\n`;
    layout += `*${evtDisplay} · ${gc} Guests · ${tentName}*\n`;
    layout += `${'─'.repeat(36)}\n\n`;

    layout += `**🗺️ Recommended Zone Layout:**\n`;
    layout += `  🔵 **Entrance** — Welcome table, registration, signage\n`;
    if (eventType === 'wedding' || eventType === 'engagement') {
      layout += `  ⬜ **Ceremony Aisle** — 1.8m wide, central walkway\n`;
    }
    layout += `  🟡 **Dining Zone** — ${tablesNeeded || '6–8'} tables, 1.5m spacing between tables\n`;
    if (isSeated) {
      layout += `  🔴 **Buffet/Service** — Side wall, 2 lanes minimum, 2.5m queue clearance\n`;
    }
    if (profile.extras?.includes('Stage Platform 2x2')) {
      layout += `  🎤 **Stage/Podium** — Front-facing, 3m clearance from front row\n`;
    }
    if (['wedding','birthday','baby shower','graduation'].includes(eventType)) {
      layout += `  🎂 **Focal Point** — Cake/dessert display, visible from all seats\n`;
    }
    layout += `  📸 **Photo Area** — Natural light side, backdrop arc ideal here\n`;
    layout += `  🚶 **Main Walkways** — 1.8m minimum throughout\n`;
    if (gc > 60) layout += `  🚪 **Emergency Access** — 2m clear on all perimeter sides\n`;
    layout += `\n`;

    layout += `**📏 Spacing Standards Applied:**\n`;
    layout += `  • Table-to-table: 1.5m (chair clearance + service lane)\n`;
    layout += `  • Chair pull: 0.6m from table edge to walkway\n`;
    layout += `  • Service lanes: 1.2m minimum\n`;
    layout += `  • Main walkway: 1.8m\n\n`;

    layout += `**📋 Equipment Required:**\n`;
    layout += `  • 1× ${tentName}\n`;
    layout += `  • ${chairsNeeded} chairs (minimum)\n`;
    if (tablesNeeded) layout += `  • ~${tablesNeeded} tables\n`;
    if (profile.extras?.length) layout += `  • Suggested décor: ${profile.extras.slice(0, 3).join(', ')}\n`;
    layout += `\n`;

    layout += `**📊 EventMaster Score:**\n`;
    layout += `  • Comfort score: **${comfortScore}%** ✅\n`;
    layout += `  • Estimated setup time: ~${setupTime} hrs\n`;
    layout += `  • Staff recommended: ${staffNeeded} people\n`;
    if (venue) layout += `  • Venue utilisation: ~${Math.round((requiredArea / venue.area) * 100)}% of ${venue.area}m²\n`;
    layout += `\n`;

    // Risk alerts
    if (gc > cap * 0.95) {
      layout += `**⚠️ Space Alert:** You're very close to capacity for this structure. I'd recommend upgrading to the next size for guest comfort.\n\n`;
    }
    if (gc > 80 && tablesNeeded > 8) {
      layout += `**⚠️ Buffet Tip:** With ${tablesNeeded} tables, ensure the buffet has 2+ service lanes to prevent queue congestion.\n\n`;
    }

    if (profile.tips?.length) {
      layout += `**💡 Jane's Tips for your ${evtDisplay}:**\n`;
      profile.tips.slice(0, 2).forEach(t => layout += `  • ${t}\n`);
      layout += `\n`;
    }

    layout += `Shall I build a full **quote based on this layout**, or would you like to adjust anything?`;
    return layout;
  }

  /**
   * Calculates how many guests fit in a space, or gives tent capacity breakdown
   */
  function respondCapacityQuery(msg) {
    const venue = parseVenueDimensions(msg) || state.venueDimensions;
    const product = detectProduct(msg);

    if (product && TENT_CAPACITY[product]) {
      const d = TENT_CAPACITY[product];
      const p = PRICING[product];
      return `**${product} — Capacity Breakdown:**\n\n• Seated dining: **${d.seated} guests**\n• Standing/cocktail: **${d.standing} guests**\n• Floor area: ${d.area}m²\n• Best suited for: ${d.ideal}\n${p ? `• Price: ${fmt(p.cost)} ${p.unit}` : ''}\n\nWould you like a layout plan or a quote for this structure?`;
    }

    if (venue) {
      state.venueDimensions = venue;
      const seated   = Math.floor(venue.area / SPATIAL.area.seated_dining);
      const cocktail = Math.floor(venue.area / SPATIAL.area.cocktail);
      const theatre  = Math.floor(venue.area / SPATIAL.area.theatre);
      return `**📐 Venue Capacity — ${venue.width}×${venue.length}m (${venue.area}m²)**\n\n• Seated dining (round tables): **${seated} guests**\n• Cocktail / standing: **${cocktail} guests**\n• Theatre-style (rows of chairs): **${theatre} guests**\n\n*These are comfortable occupancy figures with proper walkways. Maximum safe standing capacity: ~${Math.floor(venue.area / 0.5)} people.*\n\nWould you like me to design a layout plan for this space?`;
    }

    return "I can calculate capacity for any space or structure. Could you share the **venue dimensions** (e.g. 15×20m), or the **tent/structure** you're asking about?";
  }

  /**
   * Recommends a full package for a given guest count and event type
   */
  function respondRecommendation(msg) {
    const guests = parseGuestCount(msg) || state.guestCount;
    const eventType = extractEventType(msg) || state.eventType;

    if (!guests) {
      return "I'd love to recommend the perfect setup! How many guests are you expecting? That's my key starting point for building the ideal package. 😊";
    }

    state.guestCount = guests;
    if (eventType && !state.eventType) state.eventType = eventType;

    const pkg = getPackage(guests);
    const profile = EVENT_PROFILES[eventType] || EVENT_PROFILES['birthday'];
    const chairsNeeded = Math.ceil(guests * (profile.chairsPerGuest || 1));
    const tablesNeeded = profile.tableSize ? Math.ceil(guests / profile.tableSize) : Math.ceil(guests / 8);
    const [tentName, tentData] = bestTentForGuests(guests, profile.style !== 'cocktail');
    const tentPrice = PRICING[tentName];
    const chairPrice = PRICING[pkg.chairType];

    let cost = 300; // delivery base
    if (tentPrice) cost += tentPrice.cost;
    if (chairPrice) cost += chairPrice.cost * chairsNeeded;

    let r = `**🎪 Recommended Package: ${pkg.label}**\n`;
    r += `*${guests} guests${eventType ? ` · ${eventType}` : ''}*\n`;
    r += `${'─'.repeat(36)}\n\n`;

    r += `**Essential Items:**\n`;
    r += `  • **1× ${tentName}** — ${tentData.ideal}\n`;
    r += `  • **${chairsNeeded}× ${pkg.chairType}** — ${fmt(PRICING[pkg.chairType]?.cost || 15)} per chair\n`;
    r += `  • **~${tablesNeeded} tables** for dining\n\n`;

    if (pkg.upsell?.length) {
      r += `**✨ Suggested Add-ons:**\n`;
      pkg.upsell.forEach(item => {
        const p = PRICING[item];
        if (p) r += `  • ${item} — ${fmt(p.cost)} ${p.unit}\n`;
      });
      r += `\n`;
    }

    r += `**💰 Estimated Starting Price:**\n`;
    r += `  From **${fmt(cost)}** (tent + ${chairsNeeded} chairs + delivery)\n\n`;
    r += `*${pkg.description}*\n\n`;
    r += `Want a **full layout plan**, a **detailed quote**, or both?`;

    if (state.phase === 'greeting') state.phase = 'inquire_date';
    state.lastSuggestion = [{ key: tentName, qty: 1 }, { key: pkg.chairType, qty: chairsNeeded }];
    return r;
  }

  /**
   * Recommends the best tent options for a given guest count
   */
  function respondTentAdvice(msg) {
    const guests = parseGuestCount(msg) || state.guestCount;
    const eventType = extractEventType(msg) || state.eventType;
    const isSeated = eventType !== 'cocktail';

    if (!guests) {
      return "To recommend the right tent, I just need your **guest count**. How many people are you expecting?";
    }

    const options = Object.entries(TENT_CAPACITY)
      .filter(([, d]) => (isSeated ? d.seated : d.standing) >= guests)
      .slice(0, 3);

    if (!options.length) {
      return `For **${guests} guests** I'd recommend our **Marquee 6×12** as the primary structure, potentially with additional gazebos for overflow or service zones. Would you like me to design a full multi-structure layout?`;
    }

    const [bestName, bestData] = options[0];
    const bestCap = isSeated ? bestData.seated : bestData.standing;
    const buffer = Math.round(((bestCap - guests) / guests) * 100);

    let r = `**🏕️ Tent Options — ${guests} Guests**\n\n`;
    options.forEach(([name, data], i) => {
      const p = PRICING[name];
      const cap = isSeated ? data.seated : data.standing;
      const icons = ['⭐ Best fit', '✅ Good option', '💡 Alternative'];
      r += `**${icons[i]}: ${name}**\n`;
      r += `  • Capacity: ${data.seated} seated / ${data.standing} standing\n`;
      r += `  • Area: ${data.area}m²\n`;
      r += `  • Best for: ${data.ideal}\n`;
      if (p) r += `  • Price: ${fmt(p.cost)} ${p.unit}\n`;
      r += `\n`;
    });

    r += `💡 *My recommendation: **${bestName}** — gives you a **${buffer}% comfort buffer** above your guest count.*\n\n`;
    r += `Shall I add this to a quote, or would you like a full layout plan first?`;
    state.lastSuggestion = [{ key: bestName, qty: 1 }];
    return r;
  }

  /**
   * Calculates exact quantities for chairs, tables, or tents
   */
  function respondQuantityAdvice(msg) {
    const guests = parseGuestCount(msg) || state.guestCount;

    if (/chair|seat/i.test(msg)) {
      if (!guests) return "For chair quantities I need the guest count. How many guests are you expecting?";
      const dining   = guests;
      const cocktail = Math.ceil(guests * 0.5);
      const buffer   = guests + Math.ceil(guests * 0.1);
      return `**🪑 Chair Requirements — ${guests} Guests:**\n\n• Seated dining event: **${dining} chairs** (1 per guest)\n• Cocktail/mixed event: **${cocktail} chairs** (~50% seated)\n• Recommended with 10% buffer: **${buffer} chairs**\n\n**Available at Mirj Rentals:**\n• Tiffany Chairs — R20/chair\n• White Foldable — R15/chair\n• Black Foldable — R15/chair\n• Black Stackable — R7/chair\n\nWhich style suits your event best?`;
    }
    if (/table/i.test(msg)) {
      if (!guests) return "For table quantities I need your guest count. How many guests are expected?";
      const r8 = Math.ceil(guests / 8);
      const r6 = Math.ceil(guests / 6);
      return `**🪵 Table Requirements — ${guests} Guests:**\n\n• 8-seater round tables: **${r8} tables**\n• 6-seater round tables: **${r6} tables**\n• Buffet/service trestle tables: **2–3 minimum**\n\n*Add 1 extra table as buffer for gifts, cake, or extra seating.*`;
    }
    if (/gazebo|tent|marquee|structure/i.test(msg)) return respondTentAdvice(msg);

    return "Happy to help with quantities! Are you asking about **chairs**, **tables**, or **tents**? And how many guests are you expecting?";
  }

  // =================== MAIN RESPONSE ENGINE ===================
  async function getResponse(userMsg) {
    const msg = userMsg.toLowerCase().trim();
    const original = userMsg.trim();

    // Increment exchange counter
    state.exchangeCount = (state.exchangeCount || 0) + 1;

    // Track conversation history (last 6 exchanges for context)
    state.history = state.history || [];
    state.history.push({ role: 'user', text: original });
    if (state.history.length > 12) state.history.splice(0, 2);

    // Always capture context from any message
    const gc = parseGuestCount(original);
    if (gc) state.guestCount = gc;
    const et = extractEventType(original);
    if (et && !state.eventType) state.eventType = et;
    const vd = parseVenueDimensions(original);
    if (vd) state.venueDimensions = vd;

    // Smart item addition from ANY phase — if customer says "add X" or "I want X items"
    // and we're not in a detail-collecting flow, switch to/stay in inquire_items
    const corrected = correctTypos(normalizeNumbers(msg));
    const isAddRequest = /\badd\b/i.test(corrected) && detectProduct(corrected);
    if (isAddRequest && state.phase !== 'collecting_details' && state.phase !== 'confirm' && state.phase !== 'done') {
      state.phase = 'inquire_items';
    }

    // ─── Lead capture: check for contact info in every message ───
    if (!state.leadCollected && state.phase !== 'collecting_details' && state.phase !== 'confirm') {
      const contactInfo = detectContactInfo(original);
      if (hasContactInfo(contactInfo)) {
        // Merge with any previously captured partial info
        const merged = { ...state.pendingLead, ...contactInfo };
        // Build products mentioned list from items + any detected product in this session
        const productsMentioned = state.items.map(i => i.key);
        const detectedProd = detectProduct(original);
        if (detectedProd && !productsMentioned.includes(detectedProd)) productsMentioned.push(detectedProd);
        return submitLead(merged, productsMentioned);
      }
      // Store partial info found so far
      const partial = detectContactInfo(original);
      if (partial.name) state.pendingLead.name = partial.name;
      if (partial.phone) state.pendingLead.phone = partial.phone;
      if (partial.email) state.pendingLead.email = partial.email;
      if (partial.address) state.pendingLead.address = partial.address;
    }

    // ─── Universal shortcuts ─────────────────────────────────────
    if (/\b(hi|hello|hey|howzit)\b/.test(msg) && msg.length < 25) {
      state.phase = 'greeting';
    }
    if (/\b(price|pricing|how much|rate|rates|cost)\b/.test(msg) && !/layout|plan|guest/.test(msg)) {
      const resp = respondPricing(msg);
      if (shouldPromptForLead()) { state.leadPromptShown = true; return resp + buildLeadPrompt(); }
      return resp;
    }
    if (/\b(quote|quotation)\b/.test(msg) && !/layout|plan/.test(msg)) {
      // Parse any items mentioned IN the same quote message ("quote for 20 tiffany chairs, 5 tables")
      const inlineItems = parseAllItems(original);
      for (const { key, qty } of inlineItems) {
        if (PRICING[key]) addItem(key, qty);
      }
      if (state.items.length > 0) return transitionToDetails('quote');
      // Start quote collection — ask event details first, then contact info
      state.phase = 'collecting_details';
      state.collectingFor = 'quote';
      if (!state.eventType) {
        state.awaitingField = 'event_type';
        return "I'd love to put together a personalised quote for you! Let's start with your event details.\n\nWhat **type of event** are you planning? _(e.g. Wedding, Birthday, Corporate Function, Graduation…)_";
      } else if (!state.eventDate) {
        state.awaitingField = 'event_date';
        return `Let me prepare a quote for your **${state.eventType}**! What **date** is the event? _(e.g. 15 August 2025)_`;
      } else if (!state.guestCount) {
        state.awaitingField = 'guest_count';
        return "Almost there! How many **guests** are you expecting?";
      } else {
        state.awaitingField = 'items_interest';
        return "What **equipment or items** are you looking to hire? _(e.g. stretch tent, 100 chairs, photobooth, stage, food stands…)_";
      }
    }
    if (/\b(call.?back|call me back|call me|phone me|ring me|contact me back)\b/i.test(msg)) {
      state.phase = 'collecting_details';
      state.awaitingField = 'name';
      state.collectingFor = 'callback';
      return "Of course! I'll arrange for our team to call you back as soon as possible. May I start with your **full name**?";
    }
    if (/\b(book|booking|hire|rent|reserve|enqui[re])\b/.test(msg) && !/\?/.test(msg)) {
      if (!state.eventDate) { state.phase = 'inquire_date'; return "Let's get your booking started! What date is your event?"; }
    }

    // ─── EventMaster Planning Intelligence ───────────────────────
    const intent = detectIntent(original);
    if (intent === 'layout_request') {
      const resp = respondLayoutRequest(original);
      if (shouldPromptForLead()) { state.leadPromptShown = true; return resp + buildLeadPrompt(); }
      return resp;
    }
    if (intent === 'capacity_check' || intent === 'venue_size') {
      return respondCapacityQuery(original);
    }
    if (intent === 'recommendation') {
      const resp = respondRecommendation(original);
      if (shouldPromptForLead()) { state.leadPromptShown = true; return resp + buildLeadPrompt(); }
      return resp;
    }
    if (intent === 'tent_advice') {
      const resp = respondTentAdvice(original);
      if (shouldPromptForLead()) { state.leadPromptShown = true; return resp + buildLeadPrompt(); }
      return resp;
    }
    if (intent === 'quantity_advice') {
      const resp = respondQuantityAdvice(original);
      if (shouldPromptForLead()) { state.leadPromptShown = true; return resp + buildLeadPrompt(); }
      return resp;
    }
    if (intent === 'guest_count') {
      const resp = respondGuestCount(original);
      if (resp) {
        if (shouldPromptForLead()) { state.leadPromptShown = true; return resp + buildLeadPrompt(); }
        return resp;
      }
    }

    // ─── Booking flow state machine ──────────────────────────────
    switch (state.phase) {

      case 'greeting':
        state.phase = 'inquire_event';
        return rand(greetings);

      case 'inquire_event': {
        state.eventType = extractEventType(msg) || msg;
        state.phase = 'inquire_date';
        return `How wonderful${state.eventType ? ` — a ${state.eventType}` : ''}! That sounds like it will be a beautiful occasion. What date are you planning for your event?`;
      }

      case 'inquire_date': {
        const date = parseDate(userMsg);
        if (!date) return "Could you share the date in DD/MM/YYYY format? For example: 15/06/2026.";
        state.eventDate = date;
        const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        state.phase = 'inquire_items';
        return state.guestCount
          ? `${displayDate} — perfect! For **${state.guestCount} guests**, I'd suggest starting with a **${getPackage(state.guestCount).tent}**. Would you like to add that, or shall I build a full package recommendation?`
          : `${displayDate} — wonderful! Now, what items are you looking to hire? Share your guest count and I can recommend exactly what you'll need! 😊`;
      }

      case 'inquire_items': {
        // ── Typo-correct and normalize ──────────────────────────────
        const correctedMsg = correctTypos(normalizeNumbers(msg));
        const correctedOriginal = correctTypos(normalizeNumbers(original));

        // ── "Yes" confirmation of last suggestion ───────────────────
        if (/^\s*(yes|yeah|yep|sure|ok|okay|definitely|please|yup|add that|add it|add them|sounds good|great|perfect|that one|that works)\s*[!.]*\s*$/i.test(original.trim())) {
          if (state.lastSuggestion?.length) {
            const added = [];
            for (const { key, qty } of state.lastSuggestion) {
              if (PRICING[key]) { await handleItemRequest(key, qty); added.push(`${qty}× ${key}`); }
            }
            state.lastSuggestion = null;
            const summary = state.items.length ? `\n\n📋 **Your cart so far:**\n${buildQuoteSummary()}` : '';
            return `Added ${added.join(' & ')}! ✅${summary}\n\nWhat else would you like to add? Or say **"done"** when you're ready for your quote.`;
          }
          return "Sure! What would you like to add? Tell me the item and quantity — or just say **'done'** to proceed with your quote.";
        }

        // ── "Done / move on / proceed" ───────────────────────────────
        if (/\b(that'?s? all|done|nothing else|no more|proceed|continue|enough|done now|all done|move on|ready|proceed|let'?s go|all good|that'?s it|go ahead)\b/i.test(correctedMsg)) {
          return state.items.length ? transitionToDetails() : "Let me know which items you'd like — or just tell me your guest count and I'll recommend a full package!";
        }

        // ── Multi-item message ("20 chairs, 5 tables, 1 gazebo") ─────
        const allItems = parseAllItems(correctedOriginal);
        if (allItems.length > 1) {
          const added = [];
          const unavailable = [];
          for (const { key, qty } of allItems) {
            if (!PRICING[key]) continue;
            if (state.eventDate && window.Bob) {
              const check = window.Bob.janeCheckItem(key, state.eventDate, qty);
              if (!check.ok) { unavailable.push(key); continue; }
            }
            addItem(key, qty);
            added.push(`${qty}× ${key} — ${fmt(PRICING[key].cost)} ${PRICING[key].unit}`);
          }
          state.lastSuggestion = null;
          let resp = '';
          if (added.length) resp += `✅ Added to your cart:\n${added.map(a => `  • ${a}`).join('\n')}\n\n`;
          if (unavailable.length) resp += `⚠️ Unavailable on your date: ${unavailable.join(', ')}\n\n`;
          if (state.items.length) resp += `**Cart total so far: ${fmt(state.items.reduce((s, i) => s + (PRICING[i.key]?.cost||0)*i.qty, 0))}** (excl. delivery)\n\n`;
          resp += `Anything else to add? Or say **"done"** to proceed with your quote. 😊`;
          return resp;
        }

        // ── Single product detection (with typo correction + fuzzy) ─
        const product = detectProduct(correctedMsg) || detectProduct(correctedOriginal);
        if (product) {
          state.lastCategory = PRICING[product]?.category || null;
          return await handleItemRequest(product, extractQty(correctedOriginal));
        }

        // ── Category help requests ("chairs", "tables", "tents") ─────
        if (/chair|seat|bench|stool/i.test(correctedMsg)) { state.lastCategory = 'chairs'; return respondItemsHelp('chair'); }
        if (/table/i.test(correctedMsg)) { state.lastCategory = 'tables'; return respondItemsHelp('table'); }
        if (/tent|gazebo|marquee|cabana|shelter|canopy/i.test(correctedMsg)) { state.lastCategory = 'tents'; return respondItemsHelp('tent'); }
        if (/photo|booth|stage|backdrop|balloon/i.test(correctedMsg)) return respondItemsHelp('photo');
        if (/food|cake|riser|pyramid|stand|display/i.test(correctedMsg)) return respondItemsHelp('food stand');

        // ── "Only X" / "just X" constraint ──────────────────────────
        if (/\b(only|just|only want|just want|only need|just need)\b/i.test(correctedMsg)) {
          const p2 = detectProduct(correctedMsg.replace(/only|just|want|need/g, ''));
          if (p2) return await handleItemRequest(p2, extractQty(correctedOriginal));
        }

        // ── Show current cart if asked ───────────────────────────────
        if (/\b(cart|my order|what have i|what.?s in|my selection|my items)\b/i.test(correctedMsg)) {
          return state.items.length
            ? `📋 **Your current selections:**\n\n${buildQuoteSummary()}\n\nWould you like to add anything else? Or say **"done"** to get your formal quote.`
            : "Your cart is empty. Tell me what you'd like to hire and I'll add it!";
        }

        return respondItemsHelp(correctedMsg);
      }

      case 'collecting_details':
        return collectDetails(msg, original);

      case 'confirm': {
        if (/\b(yes|confirm|correct|right|proceed|book it|please|go ahead|sure)\b/.test(msg)) return await submitBooking();
        if (/\b(no|change|edit|different|adjust)\b/.test(msg)) {
          state.phase = 'inquire_items';
          return "Of course! Which items would you like to adjust?";
        }
        return "Please reply **'yes'** to confirm your booking enquiry, or **'no'** if you'd like to make changes.";
      }

      case 'done':
        return "Is there anything else I can help with? I'm always happy to design a layout, calculate capacity, or put together another quote! 😊";

      default:
        state.phase = 'greeting';
        return rand(greetings);
    }
  }

  // =================== ITEM HANDLER ===================
  async function handleItemRequest(productKey, qty) {
    const item = PRICING[productKey];
    if (!item) return "Could you clarify which item you're looking for? I can help with tents, chairs, stages, photo booths, and décor.";

    if (productKey === "Balloon Setup") {
      addItem(productKey, qty);
      return "Balloon setups are completely bespoke — our décor specialist will create something spectacular and provide a custom quote. I've noted this in your booking. Anything else to add?";
    }

    if (state.eventDate && window.Bob) {
      const check = window.Bob.janeCheckItem(productKey, state.eventDate, qty);
      if (!check.ok) return rand(unavailableResponses) + "\n\n" + getSimilarItems(productKey);
    }

    addItem(productKey, qty);
    const sub = item.cost * qty;
    const cartTotal = state.items.reduce((s, i) => s + (PRICING[i.key]?.cost||0)*i.qty, 0);
    const cartLine = cartTotal > sub ? `\n💰 **Cart total: ${fmt(cartTotal)}** (excl. delivery)` : '';
    const suggestionLine = suggestRelated(productKey);
    return `✅ Added **${qty}× ${productKey}** — ${fmt(item.cost)} ${item.unit}${qty > 1 ? ` (subtotal: ${fmt(sub)})` : ''}.${cartLine}${suggestionLine}\n\nAnything else to add? Or say **"done"** to proceed with your quote.`;
  }

  function addItem(key, qty) {
    const ex = state.items.find(i => i.key === key);
    if (ex) ex.qty += qty;
    else state.items.push({ key, qty });
  }

  function getSimilarItems(key) {
    const item = PRICING[key];
    if (!item) return '';
    const similar = Object.entries(PRICING)
      .filter(([k, v]) => v.category === item.category && k !== key)
      .slice(0, 2)
      .map(([k, v]) => `${k} at ${fmt(v.cost)} ${v.unit}`)
      .join(' or ');
    return similar ? `You might consider: ${similar}.` : '';
  }

  /** Suggest natural complements after an item is added */
  function suggestRelated(key) {
    const CAT = PRICING[key]?.category;
    const suggestions = {
      chairs: { hint: 'chairs', suggest: 'Would you like to add **tables** to match?' },
      tents:  { hint: 'tent',   suggest: 'Would you like to add **chairs and tables** to complete the setup?' },
      food:   { hint: 'food display', suggest: 'Would you like to add any **chairs or tables**?' },
      photobooth: { hint: 'photo', suggest: 'A **Backdrop Arc** looks great with a photo booth — would you like to add one?' },
    };
    if (!CAT || !suggestions[CAT]) return '';
    // Only suggest if the complementary category isn't already in cart
    const cartCats = state.items.map(i => PRICING[i.key]?.category).filter(Boolean);
    if (CAT === 'chairs' && !cartCats.includes('tents')) return '\n💡 *Don\'t forget a tent or gazebo for shade and shelter!*';
    if (CAT === 'tents' && !cartCats.includes('chairs')) return '\n💡 *You\'ll also need chairs and tables — shall I add those?*';
    return '';
  }

  function transitionToDetails(purpose) {
    const summary = buildQuoteSummary();
    state.phase = 'collecting_details';
    state.collectingFor = purpose || 'booking';

    if (purpose === 'quote') {
      // Ask any missing event details first, then contact info
      if (!state.eventType) {
        state.awaitingField = 'event_type';
        return `Here's a summary of your selections:\n\n${summary}\n\nTo prepare your formal quote, I need a few more details. What **type of event** are you planning? _(e.g. Wedding, Birthday, Corporate…)_`;
      }
      if (!state.eventDate) {
        state.awaitingField = 'event_date';
        return `Here's a summary of your selections:\n\n${summary}\n\nWhat **date** is your event?`;
      }
      if (!state.guestCount) {
        state.awaitingField = 'guest_count';
        return `Here's a summary of your selections:\n\n${summary}\n\nHow many **guests** are attending?`;
      }
      // All event details known — go straight to contact info
      state.awaitingField = 'name';
      return `Here's a summary of your selections:\n\n${summary}\n\nTo send you the formal quotation, I just need your contact details. May I start with your **full name**?`;
    }

    state.awaitingField = 'name';
    return `Here's a summary of your selections:\n\n${summary}\n\nTo finalise your booking request, I just need a few quick details. May I start with your **full name**?`;
  }

  function collectDetails(msg, original) {
    switch (state.awaitingField) {

      /* ── Quote-specific fields (asked before contact info) ── */
      case 'event_type':
        state.eventType = original.trim();
        state.awaitingField = 'event_date';
        return `Great — a **${state.eventType}**! What **date** is your event? _(e.g. 20 September 2025)_`;

      case 'event_date': {
        const raw = original.trim();
        // Accept ISO dates and natural language (pass through; parse later if needed)
        const parsed = parseDateStr(raw);
        if (!parsed) return "I couldn't quite catch that date — could you use a format like **20 September 2025** or **2025-09-20**?";
        state.eventDate = parsed;
        state.awaitingField = 'guest_count';
        return `Noted — **${fmtDateStr(parsed)}**! And approximately how many **guests** are you expecting?`;
      }

      case 'guest_count': {
        const gc = parseInt(original.replace(/[^\d]/g, ''), 10);
        if (isNaN(gc) || gc < 1) return "Could you give me an approximate **number of guests**? (e.g. 80)";
        state.guestCount = gc;
        state.awaitingField = 'items_interest';
        return buildItemsMenu(gc);
      }

      case 'items_interest': {
        state.itemsInterest = original.trim();
        // Build a recommended package based on guest count + items interest
        const estimate = buildQuoteEstimate(state.guestCount, state.itemsInterest);
        state.awaitingField = 'name';
        return estimate + `\n\nTo prepare your formal quotation, I just need your contact details.\n\nMay I have your **full name**?`;
      }

      /* ── Contact details ── */
      case 'name':
        state.customerName = original.trim();
        state.awaitingField = 'phone';
        return `Thank you, ${state.customerName.split(' ')[0]}! What is the best **phone number** to reach you on?`;

      case 'phone':
        state.customerPhone = original.trim();
        state.awaitingField = 'email';
        return "And your **email address** please?";

      case 'email':
        if (!/\S+@\S+\.\S+/.test(original.trim())) return "Could you double-check that email address? It doesn't look quite right.";
        state.customerEmail = original.trim();
        state.awaitingField = 'address';
        return "Almost done! Lastly, what is the **physical address** of the event venue?";

      case 'address':
        state.customerAddress = original.trim();
        state.awaitingField = null;
        if (state.collectingFor === 'quote' || state.collectingFor === 'callback') {
          state.phase = 'done';
          return submitLeadEmail();
        }
        state.phase = 'confirm';
        return buildConfirmationMessage();

      default:
        state.phase = 'confirm';
        return buildConfirmationMessage();
    }
  }

  /* ── Date string helpers used in collectDetails ── */
  function parseDateStr(str) {
    // Try ISO format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
    // Try natural language via Date constructor
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return null;
  }
  function fmtDateStr(iso) {
    try {
      return new Date(iso + 'T12:00:00').toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' });
    } catch(e) { return iso; }
  }

  /* ── Show a guided menu of hireable items with prices ── */
  function buildItemsMenu(guestCount) {
    const g = guestCount || 0;
    // Suggest the most relevant tent for the guest count
    let tentSuggestion = '';
    if      (g <= 20)  tentSuggestion = '**3×9 Cabana** (R1 400) — seats up to 30';
    else if (g <= 40)  tentSuggestion = '**Stretch Tent 6×9** (R1 800) — seats ~40';
    else if (g <= 80)  tentSuggestion = '**Stretch Tent 6×12** (R2 500) — seats ~80';
    else if (g <= 120) tentSuggestion = '**Marquee 6×9** (R2 500) — seats ~80, or **Marquee 6×12** (R3 500) for up to 120';
    else               tentSuggestion = '**Marquee 6×12** (R3 500) — or multiple structures for large events';

    const chairsPerGuest = g > 0 ? `${g} × ` : '';
    return `**${g} guests** — great! Here's what we offer. Just tell me what you'd like (you can mix and match):\n\n` +
      `🏕️ **Tents & Gazebos**\n` +
      `• 2×2 Gazebo — R250 each\n` +
      `• 3×3 Gazebo — R400 each\n` +
      `• 3×6 Gazebo — R600\n` +
      `• 3×9 Cabana — R1 400\n` +
      `• Stretch Tent 6×9 — R1 800\n` +
      `• Stretch Tent 6×12 — R2 500\n` +
      `• Marquee 6×9 — R2 500 | 6×12 — R3 500\n` +
      `_→ For ${g} guests I'd suggest: ${tentSuggestion}_\n\n` +
      `🪑 **Chairs & Seating**\n` +
      `• Black Stackable Chairs — R7 each\n` +
      `• Black Foldable Chairs — R15 each\n` +
      `• White Foldable Chairs — R15 each\n` +
      `• White 4-Seater Benches — R40 each\n` +
      `• Cocktail Chairs (bar stools) — R30 each\n` +
      `• Chair Covers (B/W) — R5 each\n` +
      `_→ ${g} white chairs = R${(g * 15).toLocaleString()}_\n\n` +
      `🪑🍽️ **Tables**\n` +
      `• Round Tables — R80 each _(tablecloth included, seats 8–10)_\n` +
      `• Foldable Tables — R60 each _(tablecloth included, seats 6–8)_\n` +
      `• Cocktail Tables — R80 each _(standing/high tables)_\n` +
      `• Display Table — R150 each _(gift/cake/signing table)_\n` +
      (g > 0 ? `_→ ${Math.ceil(g/8)} round tables for ${g} guests = R${(Math.ceil(g/8) * 80).toLocaleString()}_\n\n` : `\n`) +
      `📸 **Stage & Photo**\n` +
      `• Magazine Photobooth — R2 000\n` +
      `• Stage Platform 2×2 — R250 | 1×1 — R200\n` +
      `• Backdrop Arcs — R150 each\n` +
      `• Balloon Setup — custom quote\n\n` +
      `🍰 **Food & Décor Stands**\n` +
      `• Step Display — R50 | Pyramid Stand — R50 (R90 for 2)\n` +
      `• Food Pedestals — R50 each (R120 for 3)\n\n` +
      `What would you like to include in your quote? _(e.g. "Stretch Tent 6×12, 80 Tiffany chairs, 10 round tables, photobooth" or just describe your vision)_`;
  }

  /* ── Build a price estimate summary from interest + guest count ── */
  function buildQuoteEstimate(guestCount, itemsText) {
    const g = guestCount || 0;
    const txt = (itemsText || '').toLowerCase();
    let lines = [];
    let subtotal = 0;

    const add = (label, cost) => { lines.push(`  • ${label}: **R${cost.toLocaleString()}**`); subtotal += cost; };

    // Detect items from freeform description
    if (/stretch.*12|marquee.*12|6.{0,3}12/i.test(txt)) { add('Stretch/Marquee 6×12', 3500); }
    else if (/stretch.*9|marquee.*9|6.{0,3}9/i.test(txt)) { add('Stretch Tent / Marquee 6×9', 2500); }
    else if (/cabana|3.{0,3}9/i.test(txt)) { add('3×9 Cabana', 1400); }
    else if (/marquee/i.test(txt)) { add('Marquee 6×12', 3500); }
    else if (/stretch/i.test(txt)) { add('Stretch Tent 6×9', 1800); }
    else if (/gazebo.*3.{0,3}6|3.{0,3}6.*gazebo/i.test(txt)) { add('3×6 Gazebo', 600); }
    else if (/gazebo.*3.{0,3}3|3.{0,3}3.*gazebo/i.test(txt)) { add('3×3 Gazebo', 400); }
    else if (/gazebo/i.test(txt)) { add('3×9 Cabana (recommended)', 1400); }
    else if (/tent/i.test(txt)) { add('Stretch Tent 6×9 (recommended)', 1800); }

    // Tables
    const roundTblMatch = txt.match(/(\d+)\s*(?:round\s*table|round\s*tbl)/i);
    const roundTblQty = roundTblMatch ? parseInt(roundTblMatch[1]) : (/round.?table/i.test(txt) && g > 0 ? Math.ceil(g/8) : 0);
    if (roundTblQty > 0) add(`${roundTblQty}× Round Tables (tablecloth incl.)`, roundTblQty * 80);

    const foldTblMatch = txt.match(/(\d+)\s*(?:foldable|folding|trestle)\s*table/i);
    const foldTblQty = foldTblMatch ? parseInt(foldTblMatch[1]) : (/(?:foldable|folding|trestle).?table/i.test(txt) && g > 0 ? Math.ceil(g/7) : 0);
    if (foldTblQty > 0) add(`${foldTblQty}× Foldable Tables (tablecloth incl.)`, foldTblQty * 60);

    const cocktailTblMatch = txt.match(/(\d+)\s*(?:cocktail|high|poseur)\s*table/i);
    const cocktailTblQty = cocktailTblMatch ? parseInt(cocktailTblMatch[1]) : (/cocktail.?table|high.?table/i.test(txt) && g > 0 ? Math.ceil(g/5) : 0);
    if (cocktailTblQty > 0) add(`${cocktailTblQty}× Cocktail Tables`, cocktailTblQty * 80);

    const displayTblMatch = txt.match(/(\d+)\s*(?:display|gift|signing|registration)\s*table/i);
    const displayTblQty = displayTblMatch ? parseInt(displayTblMatch[1]) : (/(?:display|gift|signing)\s*table/i.test(txt) ? 1 : 0);
    if (displayTblQty > 0) add(`${displayTblQty}× Display Table`, displayTblQty * 150);

    if (/photobooth|photo.?booth|magazine/i.test(txt)) add('Magazine Photobooth', 2000);
    if (/backdrop|arch/i.test(txt)) add('Backdrop Arcs ×2', 300);
    if (/stage.*2.{0,3}2|2.{0,3}2.*stage/i.test(txt)) add('Stage Platform 2×2', 250);
    else if (/stage/i.test(txt)) add('Stage Platform 1×1', 200);
    if (/balloon/i.test(txt)) lines.push('  • Balloon Setup: **custom quote**');
    if (/cake.*stand|step.*display/i.test(txt)) add('Step Display', 50);
    if (/riser|pedestal|food.*stand|food.*riser/i.test(txt)) add('Food Pedestals', 50);

    // Cocktail Chairs / Bar Stools
    const cocktailChairMatch = txt.match(/(\d+)\s*(?:cocktail\s*chair|bar\s*stool|barstool|high\s*stool)/i);
    const cocktailChairQty = cocktailChairMatch ? parseInt(cocktailChairMatch[1]) : (/cocktail.?chair|bar.?stool/i.test(txt) && g > 0 ? g : 0);
    if (cocktailChairQty > 0) add(`${cocktailChairQty}× Cocktail Chairs`, cocktailChairQty * 30);

    // Chairs
    const chairMatch = txt.match(/(\d+)\s*(?:white|black|fold|stack|chair)/i);
    const chairQty = chairMatch ? parseInt(chairMatch[1]) : (g > 0 && /chair|seat/i.test(txt) && !/cocktail|bar.?stool/i.test(txt) ? g : 0);
    if (chairQty > 0) {
      const isWhite = /white/i.test(txt) || !/black|stack/i.test(txt);
      const cost = chairQty * 15;
      add(`${chairQty}× ${isWhite ? 'White' : 'Black'} Foldable Chairs`, cost);
    }
    if (/cover/i.test(txt) && g > 0) add(`${g}× Chair Covers`, g * 5);

    const DELIVERY = 300;

    if (!lines.length) {
      return `✅ Got it — I've noted your requirements. Our team will prepare a detailed quotation based on your needs.`;
    }

    return `✅ Based on what you've described, here's an **estimated quote** for your ${state.eventType || 'event'} on ${fmtDateStr(state.eventDate || '')} for ${g} guests:\n\n${lines.join('\n')}\n  • Delivery & Setup: **R${DELIVERY.toLocaleString()}**\n\n**Estimated Total: R${(subtotal + DELIVERY).toLocaleString()}**\n_Prices are per event. Final quote confirmed by our team._`;
  }

  /**
   * Submits a quote request or callback request lead via email through Bob.
   * Called after all 4 contact fields (name, phone, email, address) are collected.
   */
  function submitLeadEmail() {
    const isCallback = state.collectingFor === 'callback';
    const subjectName = state.customerName || 'Website Lead';
    const subject = isCallback
      ? `Callback Request — ${subjectName}`
      : `Quote Request — ${subjectName}`;

    const bodyLines = [
      isCallback ? '=== CALLBACK REQUEST via Jane (Chat Widget) ===' : '=== QUOTE REQUEST via Jane (Chat Widget) ===',
      '',
      `Name:             ${state.customerName || 'Not provided'}`,
      `Phone:            ${state.customerPhone || 'Not provided'}`,
      `Email:            ${state.customerEmail || 'Not provided'}`,
      `Physical Address: ${state.customerAddress || 'Not provided'}`,
      '',
      `Event Type:       ${state.eventType || 'Not specified'}`,
      `Event Date:       ${state.eventDate || 'Not specified'}`,
      `Guest Count:      ${state.guestCount ? state.guestCount + ' guests' : 'Not specified'}`,
      `Items Interest:   ${state.itemsInterest || (state.items.length > 0 ? state.items.map(i => `${i.qty}× ${i.key}`).join(', ') : 'Not specified')}`,
      '',
      `Submitted: ${new Date().toLocaleString('en-ZA')}`,
      `Source: Jane Chat Widget — mirjrentals`
    ];
    const body = bodyLines.join('\n');

    // Save to localStorage leads
    const leads = (() => { try { return JSON.parse(localStorage.getItem('mirj_leads') || '[]'); } catch(e) { return []; } })();
    leads.push({ name: state.customerName, phone: state.customerPhone, email: state.customerEmail, address: state.customerAddress, eventType: state.eventType, eventDate: state.eventDate, guestCount: state.guestCount, itemsInterest: state.itemsInterest, purpose: state.collectingFor, timestamp: new Date().toISOString() });
    localStorage.setItem('mirj_leads', JSON.stringify(leads));

    // ── Save structured quote request to Bob (shows in admin Quotes tab) ──
    if (window.Bob && !isCallback) {
      window.Bob.saveQuoteRequest({
        name:          state.customerName  || '',
        phone:         state.customerPhone || '',
        email:         state.customerEmail || '',
        address:       state.customerAddress || '',
        eventType:     state.eventType     || '',
        eventDate:     state.eventDate     || '',
        guestCount:    state.guestCount    || '',
        itemsInterest: state.itemsInterest || (state.items.length > 0 ? state.items.map(i => `${i.qty}× ${i.key}`).join(', ') : ''),
        items:         state.items         || [],
        source:        'Jane Chat'
      });
    }

    // Send via Bob (logs message) + send via EmailJS
    if (window.Bob) {
      window.Bob.sendOwnerEmail({ subject, body });
      if (!window.Bob.saveQuoteRequest) {   // fallback log if saveQuoteRequest not available
        window.Bob.logMessage({ type: isCallback ? 'callback' : 'quote_request', subject, body });
      }
    }

    // Send via EmailJS (real delivery to inbox) — fallback to mailto: if not configured
    if (window.MirjEmail) {
      MirjEmail.send({
        subject:     `[Mirj Rentals] ${subject}`,
        type:        isCallback ? 'Callback Request (Jane Chat)' : 'Quote Request (Jane Chat)',
        name:        state.customerName   || '',
        phone:       state.customerPhone  || '',
        from_email:  state.customerEmail  || '',
        address:     state.customerAddress|| '',
        event_date:  state.eventDate      || '',
        event_type:  state.eventType      || '',
        guests:      state.guestCount ? String(state.guestCount) : '',
        items:       state.itemsInterest  || (state.items || []).map(i => `${i.qty}× ${i.key}`).join(', ') || '',
        message:     ''
      });
    } else {
      // Last-resort fallback — navigate (no popup) if EmailJS not loaded
      const mailtoUrl = `mailto:mirjtraders@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    }

    state.leadCollected = true;
    const firstName = (state.customerName || 'there').split(' ')[0];

    if (isCallback) {
      return `Thank you, ${firstName}! 📞 Your callback request has been sent to the Mirj Rentals team. They'll call you on **${state.customerPhone}** as soon as possible.\n\nIs there anything else I can help you with in the meantime?`;
    }
    return `Thank you, ${firstName}! ✅ Your quote request has been sent to the Mirj Rentals team. They'll prepare a personalised quote and get back to you at **${state.customerEmail}** within **24 hours**.\n\nIs there anything else I can help you with?`;
  }

  function buildConfirmationMessage() {
    const displayDate = state.eventDate
      ? new Date(state.eventDate + 'T12:00:00').toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
      : 'TBD';
    const summary = buildQuoteSummary();
    return `Here is your booking summary:\n\n📋 **Name:** ${state.customerName}\n📞 **Phone:** ${state.customerPhone}\n✉️ **Email:** ${state.customerEmail}\n📍 **Event Address:** ${state.customerAddress || 'Not provided'}\n📅 **Event Date:** ${displayDate}\n🎪 **Event Type:** ${state.eventType || 'Not specified'}\n👥 **Guests:** ${state.guestCount || 'Not specified'}\n\n${summary}\n\nShall I go ahead and submit this enquiry? Our team will contact you within 24 hours to confirm and finalise. (Reply **'yes'** to confirm)`;
  }

  async function submitBooking() {
    if (!window.Bob) { state.phase = 'done'; return rand(confirmations); }
    const booking = window.Bob.createBooking({
      customerName: state.customerName,
      phone:        state.customerPhone,
      email:        state.customerEmail,
      address:      state.customerAddress,
      eventDate:    state.eventDate,
      eventType:    state.eventType,
      guestCount:   state.guestCount,
      items:        state.items
    });
    state.phase = 'done';
    window.Bob.logMessage({
      type: 'booking',
      subject: `Jane submitted enquiry — ${state.customerName} (${state.guestCount || '?'} guests)`,
      body: `Jane submitted a new booking enquiry.\n\nRef: ${booking.id}\nCustomer: ${state.customerName}\nPhone: ${state.customerPhone}\nEmail: ${state.customerEmail}\nEvent Address: ${state.customerAddress || 'Not provided'}\nDate: ${state.eventDate}\nEvent: ${state.eventType || '—'}\nGuests: ${state.guestCount || 'Not specified'}\nItems: ${state.items.map(i => `${i.qty}× ${i.key}`).join(', ')}\nEstimated Total: R${booking.totalCost?.toLocaleString() || '0'}`
    });
    return rand(confirmations) + `\n\nYour reference number is **${booking.id}**. Please keep this for your records.`;
  }

  function respondPricing(msg) {
    const product = detectProduct(msg);
    if (product) {
      const item = PRICING[product];
      if (item) {
        const td = TENT_CAPACITY[product];
        let r = `**${product}** is priced at **${fmt(item.cost)}** ${item.unit}.`;
        if (td) r += `\n\n• Capacity: ${td.seated} seated / ${td.standing} standing\n• Best for: ${td.ideal}`;
        r += `\n\nDelivery and collection available — enquire for rates. Would you like to add this to a quote?`;
        return r;
      }
    }
    return `Here's a quick pricing overview:\n\n**Tents & Structures:**\n  • Gazebos: R250–R600/day\n  • Cabana 3×9: R1,400/day\n  • Stretch Tents: R1,800–R2,500/day\n  • Marquees: R2,500–R3,500/day\n\n**Seating:**\n  • Tiffany Chairs: R20 each/day\n  • Foldable Chairs: R15 each/day\n  • Cocktail Chairs: R30 each/day\n  • Stackable: R7 each/day\n\n**Tables:**\n  • Round Tables: R80/day _(tablecloth incl.)_\n  • Foldable Tables: R60/day _(tablecloth incl.)_\n  • Cocktail Tables: R80/day\n  • Display Tables: R150/day\n\n**Entertainment & Décor:**\n  • Magazine Photo Booth: R2,000/day\n  • Stage Platforms: R200–R250/day\n  • Backdrop Arcs: R150 each/day\n\nAll prices are per day. Delivery + setup: R300.\n\nTell me your guest count and I'll build a full personalised quote! 😊`;
  }

  function respondItemsHelp(msg) {
    if (/tent|canopy|cover|shelter/.test(msg)) {
      return state.guestCount ? respondTentAdvice(msg) : "We offer Gazebos (2×2 at R250, 3×3 at R400, 3×6 at R600/day), Cabanas (3×9 at R1,400), Stretch Tents (from R1,800), and Marquees (from R2,500). How many guests are you expecting? I'll recommend the perfect size!";
    }
    if (/chair|seat|bench/.test(msg)) {
      const gc = state.guestCount;
      return `**Our seating options:**\n• Tiffany Chairs (Chiavari) — R20/chair ⭐\n• White Foldable chairs — R15/chair\n• Black Foldable chairs — R15/chair\n• Black Stackable chairs — R7/chair\n• White 4-Seater Benches — R40/bench\n• Cocktail Chairs (bar stools) — R30/chair\n\n${gc ? `For **${gc} guests** I'd recommend **${gc} chairs** minimum.` : 'How many guests are you expecting?'}`;
    }
    if (/photo|booth|backdrop|arch|stage/.test(msg)) {
      return "**Entertainment & Décor:**\n• Magazine Photo Booth — R2,000/day ⭐\n• Backdrop Arcs — R150/arch per day\n• Stage Platform 2×2 — R250/day\n• Stage Platform 1×1 — R200/day\n• Balloon Setup — Custom quote\n\nWhich would suit your event best?";
    }
    if (/table/.test(msg)) {
      const gc = state.guestCount;
      return `**Our table options:**\n• Round Tables — R80/day _(tablecloth included, seats 8–10)_ ⭐ Wedding Favourite\n• Foldable Tables — R60/day _(tablecloth included, seats 6–8)_\n• Cocktail Tables — R80/day _(standing/high tables)_\n• Display Tables — R150/day _(gift, cake, signing tables)_\n\n${gc ? `For **${gc} guests** I'd recommend **${Math.ceil(gc/8)} round tables** (R${(Math.ceil(gc/8)*80).toLocaleString()}) or **${Math.ceil(gc/7)} foldable tables** (R${(Math.ceil(gc/7)*60).toLocaleString()}).` : 'How many guests are you expecting? I\'ll recommend the right number!'}\n\nAll tables come clean and inspected. Round & foldable tables include a white tablecloth.`;
    }
    if (/cake|food|stand|pedestal|pyramid/.test(msg)) {
      return "**Display & Presentation:**\n• Step Display — R50/day\n• Food Pedestals — R50 each (R120 for 3)/day\n• Pyramid Stands — R50 each (R90 for 2)/day\n\nWhat type of event are we styling?";
    }
    // Smarter fallback — show relevant menu based on last category or give brief overview
    if (state.lastCategory === 'chairs') return respondItemsHelp('chair');
    if (state.lastCategory === 'tables') return respondItemsHelp('table');
    if (state.lastCategory === 'tents') return respondItemsHelp('tent');
    return `Here's what we have — just tell me what you'd like and how many:\n\n🏕️ **Tents** — Gazebos (R250–R600), Cabana, Stretch Tents, Marquees\n🪑 **Chairs** — Tiffany (R20), Foldable (R15), Stackable (R7), Cocktail bar stools (R30)\n🪵 **Tables** — Round (R80), Foldable (R60), Cocktail (R80), Display (R150)\n📸 **Entertainment** — Photo Booth (R2 000), Stages, Backdrop Arcs\n🍰 **Displays** — Step Display, Food Pedestals, Pyramid Stands\n\nYou can say things like: _"20 Tiffany chairs"_, _"5 round tables"_, or _"1 stretch tent and 60 chairs"_`;
  }

  // =================== PUBLIC API ===================
  return {
    getResponse,
    reset() {
      state = { phase: 'greeting', customerName: null, customerPhone: null, customerEmail: null, customerAddress: null, eventDate: null, eventType: null, guestCount: null, venueDimensions: null, eventStyle: null, items: [], quoteTotal: 0, awaitingField: null, lastContext: null, leadCollected: false, pendingLead: {}, exchangeCount: 0, leadPromptShown: false, collectingFor: null, lastSuggestion: null, lastCategory: null, history: [], itemsInterest: null };
    },
    getState() { return { ...state }; }
  };

})();

// =================== CHAT UI CONTROLLER ===================
document.addEventListener('DOMContentLoaded', () => {
  const launcher   = document.getElementById('chatLauncher');
  const chatWindow = document.getElementById('chatWindow');
  const chatClose  = document.getElementById('chatClose');
  const bubbleBtn  = document.getElementById('chatBubbleBtn');
  const messagesEl = document.getElementById('janeMessages');
  const quickBtns  = document.getElementById('janeQuickBtns');
  const inputEl    = document.getElementById('janeInput');
  const sendBtn    = document.getElementById('janeSendBtn');

  if (!launcher) return;

  let isOpen = false;
  let initialised = false;

  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    if (isOpen && !initialised) {
      initialised = true;
      setTimeout(() => addBotMessage(getGreeting()), 400);
    }
    if (isOpen && inputEl) inputEl.focus();
  }

  function getGreeting() {
    const h = new Date().getHours();
    const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    return `Good ${tod}! I'm Jane, your event planning consultant at Mirj Rentals. I can design a layout for your venue, calculate exactly what you need for your guest count, and build a quote in minutes. What are we planning? 🥂`;
  }

  bubbleBtn?.addEventListener('click', toggleChat);
  chatClose?.addEventListener('click', toggleChat);

  async function sendMessage() {
    const text = inputEl?.value?.trim();
    if (!text) return;
    inputEl.value = '';
    if (quickBtns) quickBtns.style.display = 'none';
    addUserMessage(text);
    showTyping();
    const delay = 700 + Math.random() * 700;
    setTimeout(async () => {
      removeTyping();
      const response = await Jane.getResponse(text);
      addBotMessage(response);
    }, delay);
  }

  function addBotMessage(text) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg bot-msg';
    wrap.innerHTML = `<div class="msg-ava">J</div><div class="msg-bubble">${formatMsg(text)}</div>`;
    messagesEl?.appendChild(wrap);
    scrollBottom();
  }
  function addUserMessage(text) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg user-msg';
    wrap.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
    messagesEl?.appendChild(wrap);
    scrollBottom();
  }
  function showTyping() {
    const t = document.createElement('div');
    t.className = 'chat-msg bot-msg'; t.id = 'janeTyping';
    t.innerHTML = `<div class="msg-ava">J</div><div class="chat-typing"><span></span><span></span><span></span></div>`;
    messagesEl?.appendChild(t);
    scrollBottom();
  }
  function removeTyping()  { document.getElementById('janeTyping')?.remove(); }
  function scrollBottom()  { if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight; }

  function formatMsg(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  sendBtn?.addEventListener('click', sendMessage);
  inputEl?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  document.querySelectorAll('.jane-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      if (inputEl) { inputEl.value = btn.dataset.msg; sendMessage(); }
    });
  });
});
