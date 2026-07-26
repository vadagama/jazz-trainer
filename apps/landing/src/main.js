/* Amazilia landing — hero flock, scroll reveal, style demo, EN/RU i18n */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   0. i18n — EN/RU dictionary + switcher
   ============================================================ */

const I18N = {
  en: {
    'meta.title': 'Amazilia — Music Improvisation Trainer',
    'meta.description':
      'Amazilia — Music Improvisation Trainer. Learn to improvise with a virtual band that adapts to your harmony, tempo, and style. Powered by AI.',
    'nav.features': 'Features',
    'nav.how': 'How it works',
    'nav.sound': 'Sound',
    'nav.compare': 'Why Amazilia',
    'nav.signin': 'Sign in',
    'hero.badge': 'Browser-based · Free to start · No install',
    'hero.h1': 'Let your music<br /><span class="text-flight">take flight.</span>',
    'hero.sub': 'Learn to improvise with a virtual band that adapts to your harmony, tempo, and style. Powered by AI.',
    'hero.p1': 'Live sound',
    'hero.p2': '7 styles',
    'hero.p3': 'AI assistant',
    'hero.demo': 'Watch demo',
    'cta.tryfree': 'Try it free',
    'forwhom.h2': 'Made for how you play',
    'forwhom.sub': 'One band, four kinds of musicians. Which one is you?',
    'forwhom.s1t': 'The student',
    'forwhom.s1d': 'Practice with a band that never gets tired. Change style, tempo, and difficulty — grow at your own pace.',
    'forwhom.s2t': 'The teacher',
    'forwhom.s2d': 'Show a student how ii–V–I sounds in swing and in bossa — in ten seconds, not ten minutes.',
    'forwhom.s3t': 'The hobbyist',
    'forwhom.s3d': 'Play with a live band at home. Nothing to install — open the browser and improvise.',
    'forwhom.s4t': 'The explorer',
    'forwhom.s4d': 'Describe an arrangement in words — Amazilia understands. AI creates, explains, and suggests variations.',
    'features.h2': 'Everything inside one bandstand',
    'features.sub': 'A living ensemble, an AI partner, and a full practice ecosystem — in one browser tab.',
    'features.f1t': 'A live band',
    'features.f1d': '12 instruments: drums, upright bass, grand piano, Rhodes, guitar, vibraphone, organ, clarinet, percussion. Real stereo samples — never MIDI.',
    'features.f2t': '7 styles — 1 click',
    'features.f2d': 'Swing, Bossa Nova, Funk, Latin, Ballad, Blues, Soul. One click and the entire ensemble rearranges itself instantly.',
    'features.f3t': 'AI assistant',
    'features.f3d': 'Describe an arrangement in words. AI creates, edits, and explains it — you see every change and control the result.',
    'features.f4t': 'Your harmony',
    'features.f4d': 'Type chords as text — <span class="font-mono text-[13px] text-ink/90">| Cmaj7 | Dm7 G7 |</span> — or pick from a catalog of hundreds of standards.',
    'features.f5t': 'Controlled density',
    'features.f5d': 'Solo piano? Just bass and drums? A full quintet? Set how thick the band sounds — in seconds.',
    'features.f6t': 'Learn & check',
    'features.f6d': 'Music theory, ear training, rhythm drills, and quizzes — a full practice ecosystem inside the service.',
    'features.f7t': 'Play your own instrument',
    'features.f7d': 'Plug in a MIDI keyboard and Amazilia scores the accuracy of your playing in real time.',
    'how.h2': 'From idea to jam in four moves',
    'how.1t': 'Describe',
    'how.1d': 'Tell Amazilia the arrangement you want in plain words — or pick a grid from the catalog.',
    'how.2t': 'Tune',
    'how.2d': 'Set the style, tempo, and band lineup — or let the AI choose for you.',
    'how.3t': 'Listen',
    'how.3d': 'The ensemble plays a living accompaniment built from real instrument samples.',
    'how.4t': 'Play',
    'how.4d': 'Improvise on your instrument over the band. It adapts — you fly.',
    'sound.h2': 'Sound you fall in love with',
    'sound.p1':
      "We recorded real acoustic instruments — every note at several dynamics, from a soft touch to a bright accent. Drums breathe with human timing. Bass walks like a bassist walks. It's the sound that makes you want to play.",
    'sound.p2': 'Switch the style and listen to the idea, not the file: the same four bars, rearranged live by the whole band.',
    'sound.note': 'Visual demo — the real band plays in the app',
    'compare.h2': 'Why Amazilia',
    'compare.sub': "Backing tracks and MIDI accompaniments had their decade. Here's what's different.",
    'compare.c1t': 'Web, not desktop.',
    'compare.c1d': 'Nothing to install — it runs where your browser runs.',
    'compare.c2t': 'Real samples, not MIDI.',
    'compare.c2d': "Sound that doesn't hurt your ears.",
    'compare.c3t': 'Band density under your control.',
    'compare.c3d': 'From light comping to a full rhythm section.',
    'compare.c4t': 'An AI assistant, not a black box.',
    'compare.c4d': 'You review every change — the final call is yours.',
    'compare.c5t': 'Theory and exercises built in.',
    'compare.c5d': 'No need to open YouTube mid-practice.',
    'compare.c6t': 'Free to start.',
    'compare.c6d': 'The catalog and player are open — play right away.',
    'signin.h2': 'Start playing in seconds',
    'signin.sub': "No passwords — we'll email you a magic link.",
    'signin.placeholder': 'you@example.com',
    'signin.continue': 'Continue',
    'signin.or': 'or',
    'signin.note': 'Just looking around? The catalog and the player work without an account.',
    'cta.h2': 'Ready to <span class="text-flight">take flight?</span>',
    'cta.p': 'Open the player, pick a standard, and improvise over a real band — free, right now.',
    'footer.about': 'About',
    'footer.features': 'Features',
    'footer.blog': 'Blog',
    'footer.roadmap': 'Roadmap',
    'footer.community': 'Community',
    'footer.copy': 'Amazilia — Music Improvisation Trainer. Let your music take flight.',
  },
  ru: {
    'meta.title': 'Amazilia — тренажёр музыкальной импровизации',
    'meta.description':
      'Amazilia — тренажёр музыкальной импровизации. Учись импровизировать с виртуальным ансамблем, который подстраивается под твою гармонию, темп и стиль. С AI-ассистентом.',
    'nav.features': 'Возможности',
    'nav.how': 'Как это работает',
    'nav.sound': 'Звук',
    'nav.compare': 'Почему Amazilia',
    'nav.signin': 'Войти',
    'hero.badge': 'В браузере · Бесплатный старт · Без установки',
    'hero.h1': 'Позволь своей музыке<br /><span class="text-flight">взлететь.</span>',
    'hero.sub': 'Учись импровизировать с виртуальным ансамблем, который подстраивается под твою гармонию, темп и стиль. С AI-ассистентом.',
    'hero.p1': 'Живой звук',
    'hero.p2': '7 стилей',
    'hero.p3': 'AI-ассистент',
    'hero.demo': 'Смотреть демо',
    'cta.tryfree': 'Попробовать бесплатно',
    'forwhom.h2': 'Создано для твоей игры',
    'forwhom.sub': 'Один ансамбль — четыре типа музыкантов. Кто из них ты?',
    'forwhom.s1t': 'Студент',
    'forwhom.s1d': 'Практикуйся с ансамблем, который не устаёт. Меняй стиль, темп и сложность — расти в своём темпе.',
    'forwhom.s2t': 'Преподаватель',
    'forwhom.s2d': 'Покажи ученику, как звучит ii–V–I в свинге и в боссе — за десять секунд, а не за десять минут.',
    'forwhom.s3t': 'Любитель',
    'forwhom.s3d': 'Играй под живую «банду» дома. Ничего не устанавливай — открой браузер и импровизируй.',
    'forwhom.s4t': 'Исследователь',
    'forwhom.s4d': 'Опиши аранжировку словами — Amazilia поймёт. AI создаст, объяснит и предложит варианты.',
    'features.h2': 'Всё — в одном сервисе',
    'features.sub': 'Живой ансамбль, AI-напарник и полная экосистема практики — в одной вкладке браузера.',
    'features.f1t': 'Живой ансамбль',
    'features.f1d': '12 инструментов: барабаны, контрабас, фортепиано, Rhodes, гитара, вибрафон, орган, кларнет, перкуссия. Настоящие стерео-сэмплы — никакого MIDI.',
    'features.f2t': '7 стилей — 1 клик',
    'features.f2d': 'Swing, Bossa Nova, Funk, Latin, Ballad, Blues, Soul. Один клик — и весь ансамбль мгновенно перестраивается.',
    'features.f3t': 'AI-ассистент',
    'features.f3d': 'Опиши аранжировку словами. AI создаст, исправит и объяснит её — ты видишь каждое изменение и контролируешь результат.',
    'features.f4t': 'Твоя гармония',
    'features.f4d': 'Вводи аккорды текстом — <span class="font-mono text-[13px] text-ink/90">| Cmaj7 | Dm7 G7 |</span> — или выбирай из каталога сотен стандартов.',
    'features.f5t': 'Управляемая плотность',
    'features.f5d': 'Соло-фортепиано? Только бас и барабаны? Полный квинтет? Настраиваешь плотность звучания за секунды.',
    'features.f6t': 'Учись и проверяй',
    'features.f6d': 'Теория музыки, тренировка слуха, ритмические упражнения и квизы — полная экосистема практики внутри сервиса.',
    'features.f7t': 'Играй на своём инструменте',
    'features.f7d': 'Подключи MIDI-клавиатуру — и Amazilia оценит точность твоей игры в реальном времени.',
    'how.h2': 'От идеи до джема — четыре шага',
    'how.1t': 'Опиши',
    'how.1d': 'Расскажи Amazilia, какую аранжировку хочешь, простыми словами — или выбери сетку из каталога.',
    'how.2t': 'Настрой',
    'how.2d': 'Выбери стиль, темп и состав ансамбля — или доверь это AI.',
    'how.3t': 'Слушай',
    'how.3d': 'Ансамбль играет живой аккомпанемент из настоящих сэмплов инструментов.',
    'how.4t': 'Играй',
    'how.4d': 'Импровизируй на своём инструменте под «банду». Она подстраивается — ты летишь.',
    'sound.h2': 'Звук, в который влюбляешься',
    'sound.p1':
      'Мы записали настоящие акустические инструменты — каждую ноту в нескольких динамиках, от тихого касания до яркого акцента. Барабаны дышат человеческим таймингом. Бас идёт, как идёт басист. Это звук, который вдохновляет играть.',
    'sound.p2': 'Переключи стиль и слушай идею, а не файл: те же четыре такта, перестроенные живьём всем ансамблем.',
    'sound.note': 'Визуальное демо — настоящий ансамбль играет в приложении',
    'compare.h2': 'Почему Amazilia',
    'compare.sub': 'Минусовки и MIDI-аккомпанемент отжили своё десятилетие. Вот чем мы отличаемся.',
    'compare.c1t': 'Веб, а не десктоп.',
    'compare.c1d': 'Ничего не нужно устанавливать — работает там, где работает браузер.',
    'compare.c2t': 'Живые сэмплы, а не MIDI.',
    'compare.c2d': 'Звук, который не режет ухо.',
    'compare.c3t': 'Плотность ансамбля — под твоим контролем.',
    'compare.c3d': 'От лёгкого компинга до полной ритм-секции.',
    'compare.c4t': 'AI-ассистент, а не «чёрный ящик».',
    'compare.c4d': 'Ты проверяешь каждое изменение — финальное решение за тобой.',
    'compare.c5t': 'Теория и упражнения внутри.',
    'compare.c5d': 'Не нужно открывать YouTube посреди практики.',
    'compare.c6t': 'Бесплатный старт.',
    'compare.c6d': 'Каталог и плеер открыты — играй сразу.',
    'signin.h2': 'Начни играть за секунды',
    'signin.sub': 'Без паролей — мы отправим магическую ссылку на почту.',
    'signin.placeholder': 'you@example.com',
    'signin.continue': 'Продолжить',
    'signin.or': 'или',
    'signin.note': 'Просто смотришь? Каталог и плеер работают без аккаунта.',
    'cta.h2': 'Готов <span class="text-flight">взлететь?</span>',
    'cta.p': 'Открой плеер, выбери стандарт и импровизируй под настоящий ансамбль — бесплатно, прямо сейчас.',
    'footer.about': 'О сервисе',
    'footer.features': 'Возможности',
    'footer.blog': 'Блог',
    'footer.roadmap': 'Роадмап',
    'footer.community': 'Сообщество',
    'footer.copy': 'Amazilia — Music Improvisation Trainer. Позволь своей музыке взлететь.',
  },
};

let currentLang = 'en';
const langListeners = [];

function applyLang(lang) {
  currentLang = I18N[lang] ? lang : 'en';
  const dict = I18N[currentLang];

  document.documentElement.lang = currentLang;
  document.title = dict['meta.title'];
  document.querySelector('meta[name="description"]')?.setAttribute('content', dict['meta.description']);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = dict[el.dataset.i18n];
    if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const v = dict[el.dataset.i18nHtml];
    if (v !== undefined) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const v = dict[el.dataset.i18nPlaceholder];
    if (v !== undefined) el.setAttribute('placeholder', v);
  });

  document.querySelectorAll('.lang-btn').forEach((b) => {
    const active = b.dataset.lang === currentLang;
    b.classList.toggle('bg-amber/15', active);
    b.classList.toggle('text-amber', active);
    b.classList.toggle('text-mist', !active);
    b.setAttribute('aria-pressed', String(active));
  });

  try {
    localStorage.setItem('amz-lang', currentLang);
  } catch {
    /* private mode — language just won't persist */
  }
  langListeners.forEach((fn) => fn(currentLang));
}

function initI18n() {
  let saved = null;
  try {
    saved = localStorage.getItem('amz-lang');
  } catch {
    /* ignore */
  }
  const browserLang = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  applyLang(saved || browserLang);

  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.addEventListener('click', () => applyLang(b.dataset.lang));
  });
}

/* ============================================================
   1. Hummingbird flock
   A small flock of geometric hummingbirds: sine-wave wing flap,
   a slow lissajous attractor keeping them inside the hero,
   separation between neighbours, and the cursor acting as a
   predator — birds flee with squared-distance falloff.
   ============================================================ */

const TEAL = [20, 160, 165]; // #14A0A5
const AMBER = [240, 165, 0]; // #F0A500

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpColor(t) {
  const c = [lerp(TEAL[0], AMBER[0], t), lerp(TEAL[1], AMBER[1], t), lerp(TEAL[2], AMBER[2], t)];
  return c.map(Math.round);
}
function rgba(c, a) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/* Pre-render each bird as 3 wing-frame sprites — the draw loop
   then only does translate/rotate/drawImage at 60fps. */
function makeSprites(colorT) {
  const body = lerpColor(colorT * 0.75);
  const frames = [-0.85, 0, 0.85]; // wing rotation per frame
  return frames.map((wingAngle) => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.translate(32, 32);

    // tail fan
    g.fillStyle = rgba(body, 0.75);
    g.beginPath();
    g.moveTo(-10, -2);
    g.lineTo(-27, -8);
    g.lineTo(-23, 0);
    g.lineTo(-27, 8);
    g.lineTo(-10, 2);
    g.closePath();
    g.fill();

    // body
    g.fillStyle = rgba(body, 0.95);
    g.beginPath();
    g.ellipse(0, 0, 12, 4.4, 0, 0, Math.PI * 2);
    g.fill();

    // head
    g.beginPath();
    g.arc(10, -2, 3.6, 0, Math.PI * 2);
    g.fill();

    // wing (rotates around the shoulder with the flap angle)
    g.save();
    g.translate(2, -2);
    g.rotate(wingAngle);
    g.fillStyle = rgba(body, 0.6);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(9, -17, 23, -19);
    g.quadraticCurveTo(14, -5, 3, 3);
    g.closePath();
    g.fill();
    g.restore();

    // amber beak + throat — the hummingbird's signature
    g.fillStyle = rgba(AMBER, 0.95);
    g.beginPath();
    g.moveTo(12, -3.4);
    g.lineTo(31, -1.8);
    g.lineTo(12, -0.8);
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(7.5, 0.8, 1.7, 0, Math.PI * 2);
    g.fill();

    return c;
  });
}

function initFlock() {
  const canvas = document.getElementById('flock');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let birds = [];
  let running = false;
  let raf = 0;
  let last = 0;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    seed();
  }

  function seed() {
    const count = W < 640 ? 8 : 16;
    birds = [];
    for (let i = 0; i < count; i++) {
      const colorT = count === 1 ? 0 : i / (count - 1);
      birds.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.8,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        scale: 0.55 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        flapFreq: 16 + Math.random() * 9,
        wander: Math.random() * Math.PI * 2,
        sprites: makeSprites(colorT),
      });
    }
  }

  function step(t, dt) {
    // slow lissajous attractor — the flock's "garden"
    const ax = W * 0.5 + Math.cos(t * 0.11) * W * 0.3;
    const ay = H * 0.42 + Math.sin(t * 0.17) * H * 0.24;

    for (const b of birds) {
      let fx = 0;
      let fy = 0;

      // seek the attractor
      const dx = ax - b.x;
      const dy = ay - b.y;
      const d = Math.hypot(dx, dy) || 1;
      fx += (dx / d) * 26;
      fy += (dy / d) * 26;

      // wander — no two birds move alike
      fx += Math.cos(t * 0.9 + b.wander) * 20;
      fy += Math.sin(t * 1.25 + b.wander) * 20;

      // predator: the cursor. Flee within 150px, squared falloff.
      const mdx = b.x - mouse.x;
      const mdy = b.y - mouse.y;
      const md2 = mdx * mdx + mdy * mdy;
      if (md2 < 150 * 150 && md2 > 0.01) {
        const md = Math.sqrt(md2);
        const f = 26000 / md2;
        fx += (mdx / md) * f * 60;
        fy += (mdy / md) * f * 60;
      }

      b.vx += fx * dt;
      b.vy += fy * dt;
    }

    // separation between neighbours
    for (let i = 0; i < birds.length; i++) {
      for (let j = i + 1; j < birds.length; j++) {
        const a = birds[i];
        const b = birds[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 60 * 60 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (2200 / d2) * 60 * dt;
          const ux = (dx / d) * f;
          const uy = (dy / d) * f;
          a.vx += ux;
          a.vy += uy;
          b.vx -= ux;
          b.vy -= uy;
        }
      }
    }

    for (const b of birds) {
      // speed limit — fast but weightless
      const max = 95 * (0.75 + b.scale * 0.5);
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > max) {
        b.vx = (b.vx / sp) * max;
        b.vy = (b.vy / sp) * max;
      } else if (sp < 42 && sp > 0.01) {
        b.vx = (b.vx / sp) * 42;
        b.vy = (b.vy / sp) * 42;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // soft bounds — steer back, never teleport
      const m = 50;
      if (b.x < m) b.vx += (m - b.x) * 3 * dt;
      if (b.x > W - m) b.vx -= (b.x - (W - m)) * 3 * dt;
      if (b.y < m) b.vy += (m - b.y) * 3 * dt;
      if (b.y > H - m) b.vy -= (b.y - (H - m)) * 3 * dt;
    }
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // faint sound waves along the bottom — three detuned sines
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const base = H - 26 - i * 16;
      for (let x = 0; x <= W; x += 6) {
        const y =
          base +
          Math.sin(x * 0.012 + t * (0.6 + i * 0.22) + i * 2) * (7 - i * 1.5) +
          Math.sin(x * 0.031 - t * 0.9) * 2.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(20,160,165,${0.09 - i * 0.025})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const b of birds) {
      const flap = Math.sin(t * b.flapFreq + b.phase);
      const frame = flap > 0.35 ? 2 : flap < -0.35 ? 0 : 1;
      const sprite = b.sprites[frame];
      const size = 64 * b.scale;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function frame(ts) {
    if (!running) return;
    const t = ts / 1000;
    const dt = Math.min(t - last || 0.016, 0.05); // delta capped for stability
    last = t;
    step(t, dt);
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || prefersReduced) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // only burn frames while the hero is on screen
  new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.isIntersecting ? start() : stop()));
  }).observe(hero);

  window.addEventListener('resize', resize);
  resize();

  if (prefersReduced) {
    // one static frame, no loop
    draw(1.7);
  }
  canvas.classList.add('is-live');
}

/* ============================================================
   2. Scroll reveal — same timing family as the entrance:
   0.4s cubic-bezier(.39,.575,.565,1), staggered by --d.
   ============================================================ */

function initReveal() {
  const items = document.querySelectorAll('.scroll-reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  items.forEach((el) => io.observe(el));
}

/* ============================================================
   3. Style switcher — one grid, four arrangements.
   Bars are pure CSS animation; JS swaps the pattern per style.
   ============================================================ */

const INSTRUMENTS = [
  { name: 'Drums', color: '#F0A500' },
  { name: 'Bass', color: '#14A0A5' },
  { name: 'Piano', color: '#EAECEE' },
  { name: 'Rhodes', color: '#2ECC71' },
  { name: 'Guitar', color: '#8899AA' },
];

const STEPS = 16;

const STYLES = {
  swing: {
    caption: {
      en: 'Ride cymbal pulse, walking bass on every beat, piano comping on the offbeats.',
      ru: 'Пульсация ride-тарелки, walking bass на каждую долю, компинг фортепиано на слабые доли.',
    },
    rows: {
      Drums: { dur: 0.42, bars: [0.95, 0.3, 0.6, 0.35, 0.95, 0.3, 0.6, 0.35, 0.95, 0.3, 0.6, 0.35, 0.95, 0.3, 0.7, 0.4] },
      Bass: { dur: 0.55, bars: [1, 0.7, 0.75, 0.7, 0.95, 0.7, 0.75, 0.7, 1, 0.7, 0.75, 0.7, 0.95, 0.72, 0.78, 0.7] },
      Piano: { dur: 0.5, bars: [0.15, 0.85, 0.15, 0.2, 0.15, 0.85, 0.15, 0.9, 0.15, 0.85, 0.15, 0.2, 0.15, 0.9, 0.15, 0.85] },
      Rhodes: { dur: 0.95, bars: [0.6, 0.35, 0.2, 0.15, 0.55, 0.3, 0.18, 0.15, 0.6, 0.35, 0.2, 0.15, 0.55, 0.3, 0.2, 0.15] },
      Guitar: { dur: 0.5, bars: [0.8, 0.25, 0.8, 0.25, 0.8, 0.25, 0.8, 0.25, 0.8, 0.25, 0.8, 0.25, 0.8, 0.25, 0.85, 0.3] },
    },
  },
  bossa: {
    caption: {
      en: 'Light Brazilian groove — syncopated guitar pattern, dotted bass, airy harmony.',
      ru: 'Лёгкий бразильский грув — синкопированный гитарный паттерн, пунктирный бас, воздушная гармония.',
    },
    rows: {
      Drums: { dur: 0.45, bars: [0.8, 0.3, 0.5, 0.3, 0.6, 0.3, 0.8, 0.3, 0.8, 0.3, 0.5, 0.3, 0.6, 0.35, 0.8, 0.3] },
      Bass: { dur: 0.62, bars: [1, 0.35, 0.35, 0.9, 0.35, 1, 0.35, 0.35, 0.9, 0.35, 0.35, 1, 0.35, 0.9, 0.35, 0.35] },
      Piano: { dur: 0.55, bars: [0.3, 0.7, 0.3, 0.75, 0.3, 0.3, 0.7, 0.3, 0.75, 0.3, 0.7, 0.3, 0.3, 0.75, 0.3, 0.7] },
      Rhodes: { dur: 1.1, bars: [0.5, 0.3, 0.25, 0.2, 0.55, 0.3, 0.22, 0.18, 0.5, 0.32, 0.25, 0.2, 0.58, 0.3, 0.22, 0.18] },
      Guitar: { dur: 0.48, bars: [0.85, 0.3, 0.7, 0.3, 0.85, 0.3, 0.7, 0.5, 0.85, 0.3, 0.7, 0.3, 0.85, 0.5, 0.7, 0.3] },
    },
  },
  funk: {
    caption: {
      en: 'Dense and syncopated — slap-style bass accents, chop comping, everything locks.',
      ru: 'Плотно и синкопированно — акценты баса в духе slap, chop-компинг, всё сходится в замок.',
    },
    rows: {
      Drums: { dur: 0.32, bars: [1, 0.4, 0.7, 0.4, 0.9, 0.45, 0.75, 0.5, 1, 0.4, 0.7, 0.55, 0.9, 0.5, 0.8, 0.6] },
      Bass: { dur: 0.36, bars: [1, 0.3, 0.85, 0.3, 0.4, 0.9, 0.3, 0.8, 0.3, 1, 0.35, 0.85, 0.3, 0.5, 0.9, 0.4] },
      Piano: { dur: 0.34, bars: [0.7, 0.2, 0.2, 0.75, 0.2, 0.7, 0.2, 0.2, 0.75, 0.2, 0.7, 0.2, 0.2, 0.8, 0.2, 0.7] },
      Rhodes: { dur: 0.5, bars: [0.55, 0.25, 0.6, 0.25, 0.5, 0.3, 0.62, 0.25, 0.55, 0.25, 0.6, 0.3, 0.5, 0.28, 0.65, 0.3] },
      Guitar: { dur: 0.3, bars: [0.85, 0.35, 0.9, 0.3, 0.8, 0.4, 0.9, 0.35, 0.85, 0.3, 0.9, 0.4, 0.8, 0.35, 0.95, 0.45] },
    },
  },
  ballad: {
    caption: {
      en: 'Sparse two-feel bass, soft pads, plenty of air — room for your melody to sing.',
      ru: 'Разреженный двухдольный бас, мягкие пэды, много воздуха — есть место, где спеть твоей мелодии.',
    },
    rows: {
      Drums: { dur: 0.95, bars: [0.55, 0.15, 0.2, 0.15, 0.5, 0.15, 0.25, 0.15, 0.55, 0.15, 0.2, 0.15, 0.5, 0.18, 0.3, 0.2] },
      Bass: { dur: 1.1, bars: [0.95, 0.2, 0.2, 0.2, 0.85, 0.2, 0.2, 0.2, 0.95, 0.2, 0.2, 0.2, 0.85, 0.2, 0.25, 0.2] },
      Piano: { dur: 0.9, bars: [0.7, 0.25, 0.3, 0.25, 0.2, 0.65, 0.25, 0.3, 0.7, 0.25, 0.3, 0.2, 0.25, 0.68, 0.25, 0.3] },
      Rhodes: { dur: 1.3, bars: [0.85, 0.6, 0.45, 0.35, 0.8, 0.58, 0.42, 0.32, 0.85, 0.6, 0.45, 0.35, 0.82, 0.6, 0.45, 0.35] },
      Guitar: { dur: 1.0, bars: [0.4, 0.15, 0.5, 0.15, 0.38, 0.15, 0.52, 0.15, 0.4, 0.15, 0.5, 0.18, 0.38, 0.15, 0.55, 0.2] },
    },
  },
};

function initStyleDemo() {
  const rowsEl = document.getElementById('band-rows');
  const captionEl = document.getElementById('style-caption');
  const buttons = document.querySelectorAll('.style-btn');
  if (!rowsEl || !captionEl || !buttons.length) return;

  let currentStyle = 'swing';

  // build the five instrument rows once
  const barEls = {};
  for (const inst of INSTRUMENTS) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';

    const label = document.createElement('span');
    label.className = 'w-14 shrink-0 text-right text-[11px] font-medium tracking-wide text-mist uppercase';
    label.textContent = inst.name;
    row.appendChild(label);

    const track = document.createElement('div');
    track.className = 'flex h-10 flex-1 items-end gap-[3px]';
    barEls[inst.name] = [];
    for (let i = 0; i < STEPS; i++) {
      const bar = document.createElement('span');
      bar.className = 'eq-bar flex-1';
      bar.style.backgroundColor = inst.color;
      bar.style.opacity = '0.85';
      bar.style.height = '100%';
      track.appendChild(bar);
      barEls[inst.name].push(bar);
    }
    row.appendChild(track);
    rowsEl.appendChild(row);
  }

  function apply(styleKey) {
    currentStyle = styleKey;
    const style = STYLES[styleKey];
    captionEl.textContent = style.caption[currentLang] || style.caption.en;
    for (const inst of INSTRUMENTS) {
      const row = style.rows[inst.name];
      barEls[inst.name].forEach((bar, i) => {
        bar.style.setProperty('--hi', String(row.bars[i]));
        bar.style.setProperty('--lo', String(Math.max(0.08, row.bars[i] * 0.25)));
        bar.style.setProperty('--dur', `${row.dur}s`);
        bar.style.setProperty('--d', `${(i % 4) * row.dur * 0.24}s`);
      });
    }
    buttons.forEach((b) => {
      const active = b.dataset.style === styleKey;
      b.setAttribute('aria-selected', String(active));
      b.classList.toggle('border-amber', active);
      b.classList.toggle('text-amber', active);
      b.classList.toggle('bg-amber/10', active);
      b.classList.toggle('border-line', !active);
      b.classList.toggle('text-ink', !active);
    });
  }

  // re-render the caption when the language flips
  langListeners.push(() => apply(currentStyle));

  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.style)));
  apply('swing');
}

initI18n();
initFlock();
initReveal();
initStyleDemo();
