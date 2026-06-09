// ===== MOBILE MENU =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

// ===== CHAT WIDGET =====
const chatWidget = document.getElementById('chatWidget');
const chatBubble = document.getElementById('chatBubble');
const chatClose  = document.getElementById('chatClose');
const chatNotif  = document.getElementById('chatNotif');
const chatMessages = document.getElementById('chatMessages');
const quickReplies = document.getElementById('quickReplies');

function toggleChat() {
  chatWidget.classList.toggle('open');
  if (chatWidget.classList.contains('open')) {
    chatNotif.style.display = 'none';
    document.getElementById('chatInput').focus();
  }
}

chatClose.addEventListener('click', (e) => {
  e.stopPropagation();
  chatWidget.classList.remove('open');
});

// Jane's response logic
const responses = {
  "what rentals do you offer?": "We offer tents, tables & chairs, inflatables (bounce houses, water slides!), photo booths, party décor, and tableware. What are you interested in? 🎊",
  "how much does it cost?": "Pricing depends on the item and rental duration! Our bounce houses start at $150/day, tents from $200, and chairs from $2/each. Want a custom quote? Just fill out the form below! 💰",
  "how do i book?": "Super easy! Just fill out the booking form on our website and we'll get back to you within 24 hours with a custom quote. Or keep chatting with me! 📅",
  "do you deliver?": "Yes! We offer free delivery within 25 miles, and we handle full setup AND teardown — you just show up and party! 🚚🎉",
  default: [
    "Great question! Let me connect you with our team for more details. You can also fill out the booking form above! 🎉",
    "I love your enthusiasm! For detailed info on that, fill out our booking form and our team will reach out within 24 hours! 🩷",
    "That's what I'm here for! Our team would love to help plan your perfect event. Use the booking form and we'll be in touch! 💙",
    "Ooh fun! For specifics, I'd recommend filling out our booking form so we can tailor everything to your event! 🎊"
  ]
};

let defaultIdx = 0;

function appendMessage(text, isUser) {
  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${isUser ? 'user-msg' : 'bot-msg'}`;

  if (!isUser) {
    const avatar = document.createElement('span');
    avatar.className = 'msg-avatar';
    avatar.textContent = '👩‍🦰';
    wrap.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = text;
  wrap.appendChild(bubble);

  chatMessages.insertBefore(wrap, quickReplies);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getJaneResponse(msg) {
  const lower = msg.toLowerCase().trim();
  if (responses[lower]) return responses[lower];
  // partial matches
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) return responses["how much does it cost?"];
  if (lower.includes('book') || lower.includes('reserv') || lower.includes('schedule')) return responses["how do i book?"];
  if (lower.includes('deliver') || lower.includes('setup') || lower.includes('set up')) return responses["do you deliver?"];
  if (lower.includes('rent') || lower.includes('offer') || lower.includes('item') || lower.includes('what do')) return responses["what rentals do you offer?"];
  if (lower.includes('tent')) return "Our tents are perfect for outdoor events! We have canopy tents, frame tents, and pole tents in various sizes. Need to know more? 🏕️";
  if (lower.includes('bounce') || lower.includes('inflat')) return "Our inflatables are the life of the party! We have bounce houses, combo units, water slides, and obstacle courses. Kids AND adults love them! 🎠";
  if (lower.includes('photo')) return "Our photo booths come with fun props included and print instant copies! A crowd favorite at every event 📸✨";
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) return "Hey hey hey! 👋 I'm Jane, your party planning pal! How can I help make your event amazing? 🎉";
  if (lower.includes('thank')) return "You're so welcome! Can't wait to help make your event incredible! 🩷🎊";

  const arr = responses.default;
  const reply = arr[defaultIdx % arr.length];
  defaultIdx++;
  return reply;
}

function sendQuick(text) {
  appendMessage(text, true);
  quickReplies.style.display = 'none';
  setTimeout(() => {
    appendMessage(getJaneResponse(text), false);
  }, 600);
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendMessage(text, true);
  quickReplies.style.display = 'none';
  setTimeout(() => {
    appendMessage(getJaneResponse(text), false);
  }, 700);
}

// ===== FORM SUBMIT =====
function handleFormSubmit(e) {
  e.preventDefault();
  document.getElementById('form-success').classList.remove('hidden');
  e.target.reset();
}

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.service-card, .step, .testimonial-card, .gallery-item').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});
