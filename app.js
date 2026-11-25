// ====== الإعدادات ======
const AI_API_KEY = ''; 
const AI_MODEL = 'llama-3.1-8b-instant';
const AI_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ====== البيانات ======
const VOCAB = [
  { en: 'Hello', ar: 'مرحبًا', ex: 'Hello, how are you?' },
  { en: 'Thank you', ar: 'شكرًا', ex: 'Thank you for your help.' },
  { en: 'Good morning', ar: 'صباح الخير', ex: 'Good morning, teacher.' },
  { en: 'Apple', ar: 'تفاحة', ex: 'I eat an apple.' },
  { en: 'Book', ar: 'كتاب', ex: 'This is my book.' },
  { en: 'Water', ar: 'ماء', ex: 'I drink water.' },
  { en: 'Family', ar: 'عائلة', ex: 'I love my family.' },
  { en: 'Friend', ar: 'صديق', ex: 'She is my friend.' },
  { en: 'Teacher', ar: 'معلمة', ex: 'She is a teacher.' },
  { en: 'School', ar: 'مدرسة', ex: 'I go to school.' },
  { en: 'Beautiful', ar: 'جميل', ex: 'What a beautiful day!' },
  { en: 'Happy', ar: 'سعيد', ex: 'I am happy today.' }
];

const LEVELS = {
  1: { title: 'المستوى 1: المبتدئ', lessons: ['الحروف A-Z', 'الأرقام 1-20', 'التحيات', 'الألوان', 'أفراد الأسرة'] },
  2: { title: 'المستوى 2: تحسين النطق', lessons: ['نطق الحروف', 'نطق الكلمات', 'الجمل والعبارات', 'قواعد: الأزمنة', 'قواعد: حروف الجر'] },
  3: { title: 'المستوى 3: المحادثة', lessons: ['التعارف', 'في المطعم', 'في المطار', 'التسوق', 'في العمل'] }
};

// ====== الحالة ======
let state = JSON.parse(localStorage.getItem('learnchat_state') || '{"lessons":[],"words":[],"level":1}');
function saveState() { localStorage.setItem('learnchat_state', JSON.stringify(state)); updateStats(); }

// ====== التنقل ======
function go(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  window.scrollTo(0,0);
}

// ====== الصوت: نطق ======
function speak(text, lang = 'ar-SA') {
  if (!('speechSynthesis' in window)) { alert('النطق غير مدعوم'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = 0.9;
  speechSynthesis.speak(u);
}

// ====== الصوت: استماع ======
let recognition = null;
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('التعرف على الصوت غير مدعوم في هذا المتصفح'); return; }
  if (recognition) recognition.stop();
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  const mic = document.querySelector('.mic-btn');
  mic.classList.add('recording');
  recognition.onresult = (e) => {
    mic.classList.remove('recording');
    sendMessage(e.results[0][0].transcript);
  };
  recognition.onerror = () => mic.classList.remove('recording');
  recognition.onend = () => mic.classList.remove('recording');
  recognition.start();
}

// ====== المحادثة ======
function addMsg(text, cls) {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

async function sendMessage(text) {
  if (!text.trim()) return;
  addMsg(text, 'user');
  document.getElementById('chat-input').value = '';
  const typing = addMsg('إكرام تكتب...', 'bot typing');

  let reply;
  if (AI_API_KEY) {
    try {
      const res = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: 'أنت إكرام، معلمة لغة إنجليزية لطيفة وأنيقة. تشرحين بالعربية والإنجليزية وتصححين الأخطاء بأسلوب مبسط.' },
            { role: 'user', content: text }
          ]
        })
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || 'عذرًا، حدث خطأ.';
    } catch (e) { reply = 'تعذر الاتصال بالذكاء الاصطناعي.'; }
  } else {
    reply = getLocalReply(text);
  }

  typing.remove();
  addMsg(reply, 'bot');
  speak(reply);
}

function sendText() {
  sendMessage(document.getElementById('chat-input').value);
}

function getLocalReply(t) {
  const s = t.toLowerCase();
  if (/hello|hi|مرحبا/.test(s)) return 'Hello! كيف حالك اليوم؟';
  if (/how are you|كيف حالك/.test(s)) return 'I am fine, thank you! وأنت؟';
  if (/name|اسم/.test(s)) return 'اسمي إكرام، معلمتك.';
  if (/apple|تفاح/.test(s)) return 'Apple تعني تفاحة. Example: I eat an apple.';
  if (/\?|؟/.test(s)) return 'سؤال جيد! دعيني أشرح: ' + t;
  return 'أحسنت! كرري بعدي: ' + t;
}

// ====== المفردات ======
function renderVocab() {
  const list = document.getElementById('vocab-list');
  if (!list) return;
  list.innerHTML = '';
  VOCAB.forEach((v, i) => {
    const div = document.createElement('div');
    div.className = 'vocab-item';
    div.innerHTML = `<div class="en">${v.en}</div><div class="ar">${v.ar}</div><div class="ex">${v.ex}</div>`;
    div.onclick = () => {
      speak(v.en, 'en-US');
      if (!state.words.includes(v.en)) { state.words.push(v.en); saveState(); }
    };
    list.appendChild(div);
  });
}

// ====== المستويات ======
function openLevel(n) {
  const lv = LEVELS[n];
  document.getElementById('level-title').textContent = lv.title;
  const content = document.getElementById('level-content');
  content.innerHTML = '';
  lv.lessons.forEach((lesson, i) => {
    const id = `L${n}-${i}`;
    const div = document.createElement('div');
    div.className = 'lesson-item' + (state.lessons.includes(id) ? ' done' : '');
    div.innerHTML = `📘 ${lesson}`;
    div.onclick = () => {
      if (!state.lessons.includes(id)) { state.lessons.push(id); saveState(); }
      speak(lesson);
      div.classList.add('done');
      addMsg('لنبدأ الدرس: ' + lesson, 'bot');
      go('chat');
      closeLevel();
    };
    content.appendChild(div);
  });
  document.getElementById('level-modal').classList.remove('hidden');
}
function closeLevel() { document.getElementById('level-modal').classList.add('hidden'); }

// ====== الإحصائيات ======
function updateStats() {
  const totalLessons = 15;
  const pct = Math.round((state.lessons.length / totalLessons) * 100);
  ['stat-progress','profile-progress'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = pct + '%'; });
  ['stat-lessons','profile-lessons'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = state.lessons.length; });
  ['stat-words','profile-words'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = state.words.length; });
}

function resetProgress() {
  if (confirm('هل تريدين إعادة تعيين كل التقدم؟')) {
    state = { lessons: [], words: [], level: 1 };
    saveState(); renderVocab(); alert('تمت إعادة التعيين');
  }
}

// ====== التهيئة ======
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if(splash) {
        splash.style.opacity = '0';
        setTimeout(() => {
          splash.classList.add('hidden');
          document.getElementById('app').classList.remove('hidden');
        }, 500);
    }
  }, 1500);

  renderVocab();
  updateStats();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});

// ====== كود التثبيت التلقائي ======
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  setTimeout(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        deferredPrompt = null;
      });
    }
  }, 2000);
});
