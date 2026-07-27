import { useLang, useT, type Lang } from '../landing.i18n';
import { BrowserFrame, Reveal, NEON } from '../components/Shared';

/* Неоновый акцент на каждую фичу по кругу — та же палитра, что и чипы секций в плеере. */
const FEATURE_ACCENTS = [NEON.teal, NEON.amber, NEON.purple, NEON.emerald, NEON.cyan, NEON.teal, NEON.amber];

interface Feature {
  img: string;
  url: string;
  ru: { badge: string; title: string; text: string };
  en: { badge: string; title: string; text: string };
}

/** Крупные фичи со скриншотами продукта (файлы кладутся в /public/landing/). */
const FEATURES: Feature[] = [
  {
    img: '/landing/feature-ensemble.png',
    url: 'amazilia.app/play',
    ru: {
      badge: 'Живой ансамбль',
      title: '12 инструментов — настоящие сэмплы, не MIDI',
      text: 'Барабаны, бас, фортепиано, Rhodes, гитара, вибрафон, орган, кларнет, перкуссия. Управляй составом и громкостью каждого инструмента.',
    },
    en: {
      badge: 'Live ensemble',
      title: '12 instruments — real samples, not MIDI',
      text: 'Drums, bass, piano, Rhodes, guitar, vibraphone, organ, clarinet, percussion. Control the lineup and volume of every instrument.',
    },
  },
  {
    img: '/landing/feature-styles.png',
    url: 'amazilia.app/settings',
    ru: {
      badge: '7 жанров музыки',
      title: 'Весь ансамбль перестраивается мгновенно',
      text: 'Swing, Bossa Nova, Funk, Latin, Ballad, Blues, Soul. Один клик меняет грув, бас, барабаны и гармонию — синхронно.',
    },
    en: {
      badge: '7 music genres',
      title: 'The whole band transforms instantly',
      text: 'Swing, Bossa Nova, Funk, Latin, Ballad, Blues, Soul. One click changes the groove, bass, drums and harmony — in sync.',
    },
  },
  {
    img: '/landing/feature-harmony.png',
    url: 'amazilia.app/compositions',
    ru: {
      badge: 'Твоя гармония',
      title: 'Вводи аккорды текстом или бери из каталога',
      text: 'Собери свою сетку в редакторе (| Cmaj7 | Dm7 G7 |) или выбери из сотен музыкальных стандартов. Секции, повторы, формы.',
    },
    en: {
      badge: 'Your harmony',
      title: 'Type chords or pick from the catalog',
      text: 'Build your own grid in the editor (| Cmaj7 | Dm7 G7 |) or choose from hundreds of standards. Sections, repeats, forms.',
    },
  },
  {
    img: '/landing/feature-player.png',
    url: 'amazilia.app/play/blue-bossa',
    ru: {
      badge: 'Плеер',
      title: 'Играй под сетку с подсветкой позиции',
      text: 'Play, loop, любой темп. Текущий такт подсвечивается — не потеряешься в форме. Раздельная громкость инструментов.',
    },
    en: {
      badge: 'Player',
      title: 'Play along with position highlighting',
      text: 'Play, loop, any tempo. The current bar is highlighted — never lose your place in the form. Per-instrument volume.',
    },
  },
  {
    img: '/landing/feature-theory.png',
    url: 'amazilia.app/theory',
    ru: {
      badge: 'Учись',
      title: 'Встроенная теория музыки',
      text: 'Лады, аккорды, импровизация, ритм, блюз, гармонические концепции. Каталог лекций с поиском — не нужно открывать YouTube.',
    },
    en: {
      badge: 'Learn',
      title: 'Built-in music theory',
      text: 'Modes, chords, improvisation, rhythm, blues, harmonic concepts. A searchable catalog of lectures — no need to open YouTube.',
    },
  },
  {
    img: '/landing/feature-practice.png',
    url: 'amazilia.app/practice-cards',
    ru: {
      badge: 'Проверяй',
      title: 'Упражнения и тренировка слуха',
      text: 'Ear training, ритмические паттерны, карточки-«телесуфлёр», квизы по аккордам и распознавание прогрессий на слух.',
    },
    en: {
      badge: 'Practice',
      title: 'Exercises and ear training',
      text: 'Ear training, rhythm patterns, teleprompter-style cards, chord quizzes and progression recognition by ear.',
    },
  },
  {
    img: '/landing/feature-midi.png',
    url: 'amazilia.app/play',
    ru: {
      badge: 'Играй',
      title: 'Подключи MIDI-клавиатуру',
      text: 'Играй на своём инструменте под живую «банду». Сервис оценивает точность твоей игры в реальном времени.',
    },
    en: {
      badge: 'Play',
      title: 'Connect a MIDI keyboard',
      text: 'Play your own instrument over a live “band”. Amazilia scores the accuracy of your playing in real time.',
    },
  },
];

function FeatureRow({ f, index }: { f: Feature; index: number }) {
  const { lang } = useLang();
  const c = f[lang as Lang];
  const flip = index % 2 === 1;
  const accent = FEATURE_ACCENTS[index % FEATURE_ACCENTS.length];
  return (
    <Reveal className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={flip ? 'lg:order-2' : ''}>
        <span
          className="amz-mono inline-block rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: `${accent}45`, background: `${accent}1a`, color: accent }}
        >
          {c.badge}
        </span>
        <h3 className="amz-display mt-4 text-2xl font-bold sm:text-3xl">{c.title}</h3>
        <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--amz-text-dim)' }}>
          {c.text}
        </p>
      </div>
      <div className={flip ? 'lg:order-1' : ''}>
        <BrowserFrame src={f.img} alt={c.title} url={f.url} />
      </div>
    </Reveal>
  );
}

export function Features() {
  const t = useT();
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="amz-display text-3xl font-bold sm:text-4xl">{t('featuresTitle')}</h2>
        <p className="mt-4 text-lg" style={{ color: 'var(--amz-text-dim)' }}>
          {t('featuresSubtitle')}
        </p>
      </Reveal>

      <div className="mt-16 space-y-20">
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.img} f={f} index={i} />
        ))}
      </div>

      {/* Выделенная карточка AI-ассистента — временно скрыта
      <Reveal className="mt-20">
        <div
          className="relative overflow-hidden rounded-3xl border p-10 text-center"
          style={{
            borderColor: 'var(--amz-border-strong)',
            background:
              'radial-gradient(80% 120% at 50% 0%, rgba(13,115,119,0.22), transparent 60%), var(--amz-surface)',
          }}
        >
          <span className="mx-auto flex size-14 items-center justify-center">
            <img src="/landing/logo.png" alt="" aria-hidden="true" style={{ height: 40, width: 'auto' }} />
          </span>
          <h3 className="amz-display mx-auto mt-5 max-w-2xl text-2xl font-bold sm:text-3xl">
            {lang === 'ru'
              ? 'AI-ассистент — твой музыкальный напарник'
              : 'AI assistant — your musical partner'}
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--amz-text-dim)' }}>
            {lang === 'ru'
              ? 'Опиши аранжировку словами — Amazilia создаст, объяснит и предложит варианты. Ты видишь каждое изменение и контролируешь результат. Не «чёрный ящик».'
              : 'Describe an arrangement in words — Amazilia creates, explains and suggests options. You see every change and stay in control. Not a black box.'}
          </p>
        </div>
      </Reveal>
      */}
    </section>
  );
}
