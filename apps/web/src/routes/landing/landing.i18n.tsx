import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'ru' | 'en';

const STORAGE_KEY = 'amazilia-lang';

function detectDefaultLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'ru' || stored === 'en') return stored;
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LandingLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectDefaultLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setLang(lang === 'ru' ? 'en' : 'ru'), [lang, setLang]);

  return <LangContext.Provider value={{ lang, setLang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LandingLangProvider');
  return ctx;
}

/** Достаёт нужную строку/массив из словаря по текущему языку. */
export function useT(): <K extends keyof typeof dict>(key: K) => (typeof dict)[K][Lang] {
  const { lang } = useLang();
  return useCallback(<K extends keyof typeof dict>(key: K) => dict[key][lang], [lang]);
}

type Entry<T> = { ru: T; en: T };
function e<T>(ru: T, en: T): Entry<T> {
  return { ru, en };
}

export interface Card {
  title: string;
  text: string;
}

export const dict = {
  // — Header / nav —
  navFeatures: e('Возможности', 'Features'),
  navHow: e('Как это работает', 'How it works'),
  navSound: e('Звук', 'Sound'),
  signIn: e('Войти', 'Sign in'),

  // — Hero —
  heroTitle: e('Позволь своей музыке лететь', 'Let your music take flight'),
  heroSubtitle: e(
    'Учись импровизировать с виртуальным ансамблем, который подстраивается под твою гармонию, темп и стиль.',
    'Learn to improvise with a virtual band that adapts to your harmony, tempo, and style.',
  ),
  ctaTry: e('Попробовать бесплатно', 'Try it free'),
  ctaDemo: e('Смотреть демо', 'Watch demo'),
  heroTagline: e(
    'Создано для музыкантов, которые хотят практиковаться, исследовать и творить',
    'Built for musicians who want to practice, explore and create',
  ),
  heroScenarios: e<Card[]>(
    [
      {
        title: 'Практикуйся',
        text: 'Импровизируй поверх живого аккомпанемента, который подстраивается под твой темп и манеру игры.',
      },
      {
        title: 'Создавай',
        text: 'Собирай гармонии, формы и аранжировки — пиши аккорды текстом или используй редактор секций.',
      },
      {
        title: 'Исследуй',
        text: 'Пробуй новые стили, темпы и музыкальные идеи — переключайся между ними одним кликом.',
      },
    ],
    [
      {
        title: 'Practice',
        text: 'Improvise over a realistic accompaniment that listens and adapts to your tempo, feel and playing style in real time.',
      },
      {
        title: 'Create',
        text: 'Build harmonies, forms and arrangements — type chords as text or shape sections in the editor.',
      },
      {
        title: 'Explore',
        text: 'Try new styles, tempos and musical ideas — switch the groove instantly with a single click.',
      },
    ],
  ),

  // — For Whom —
  forWhomTitle: e('Кому это нужно', 'Who it’s for'),
  forWhomCards: e<Card[]>(
    [
      {
        title: 'Студент',
        text: 'Практикуйся с ансамблем, который не устаёт. Меняй стиль, темп и сложность — расти в своём темпе.',
      },
      {
        title: 'Преподаватель',
        text: 'Покажи ученику, как звучит ii–V–I в свинге и в боссе за 10 секунд.',
      },
      {
        title: 'Любитель',
        text: 'Играй под живую «группу» дома. Ничего не устанавливай — открой браузер и импровизируй.',
      },
      {
        title: 'Исследователь',
        text: 'Опиши аранжировку словами — Amazilia поймёт. AI-ассистент создаст, объяснит и предложит варианты.',
      },
    ],
    [
      {
        title: 'Student',
        text: 'Practice with a band that never gets tired. Change style, tempo and difficulty — grow at your own pace.',
      },
      {
        title: 'Teacher',
        text: 'Show a student how a ii–V–I sounds in swing and in bossa in 10 seconds.',
      },
      {
        title: 'Hobbyist',
        text: 'Play with a live “band” at home. Nothing to install — open your browser and improvise.',
      },
      {
        title: 'Explorer',
        text: 'Describe an arrangement in words — Amazilia understands. The AI assistant creates, explains and suggests.',
      },
    ],
  ),

  // — Features —
  featuresTitle: e('Что внутри', 'What’s inside'),
  featuresSubtitle: e(
    'Всё, что нужно для практики импровизации — в одном приложении.',
    'Everything you need to practice improvisation — in one app.',
  ),

  // — How It Works —
  howTitle: e('Как это работает', 'How it works'),
  howSteps: e<Card[]>(
    [
      { title: 'Опиши', text: 'Опиши аранжировку словами — или выбери сетку из каталога.' },
      { title: 'Настрой', text: 'Стиль, темп и состав ансамбля — или доверь это AI.' },
      { title: 'Слушай', text: 'Ансамбль играет живой аккомпанемент.' },
      { title: 'Играй', text: 'Импровизируй на своём инструменте под живую «банду».' },
    ],
    [
      { title: 'Describe', text: 'Describe an arrangement in words — or pick a grid from the catalog.' },
      { title: 'Tune', text: 'Style, tempo and ensemble — or let the AI handle it.' },
      { title: 'Listen', text: 'The band plays a live accompaniment.' },
      { title: 'Play', text: 'Improvise on your instrument over a live “band”.' },
    ],
  ),

  // — Sound —
  soundTitle: e('Звук, в который влюбляешься', 'A sound you fall in love with'),
  soundText: e(
    'Мы используем сэмплы акустических инструментов. Несколько слоёв громкости на каждую ноту — от тихого касания до яркого акцента. Звук, который вдохновляет играть.',
    'We use samples of real acoustic instruments. Multiple velocity layers per note — from a soft touch to a bright accent. A sound that inspires you to play.',
  ),
  soundStyles: e(
    ['Swing', 'Bossa Nova', 'Funk', 'Latin', 'Ballad', 'Blues', 'Soul'],
    ['Swing', 'Bossa Nova', 'Funk', 'Latin', 'Ballad', 'Blues', 'Soul'],
  ),
  soundStylesNote: e('7 стилей — один клик меняет весь ансамбль', '7 styles — one click transforms the whole band'),

  // — Sign In —
  signInTitle: e('Начни за секунды', 'Start in seconds'),
  signInText: e(
    'Каталог и плеер доступны сразу — без регистрации. Вход добавляет личный каталог, настройки и сохранение прогресса.',
    'The catalog and player are available right away — no sign-up needed. Signing in adds your personal catalog, settings and saved progress.',
  ),
  tryWithoutAccount: e('Попробовать без регистрации', 'Try without an account'),

  // — Demo modal —
  demoModalTitle: e('Демо Amazilia', 'Amazilia demo'),
  demoModalSoon: e(
    'Видео-демо скоро появится. А пока — попробуй сам:',
    'A video demo is coming soon. Meanwhile — try it yourself:',
  ),
  close: e('Закрыть', 'Close'),

  // — Footer —
  footerTagline: e(
    'Amazilia — Music Improvisation Trainer. Let your music take flight.',
    'Amazilia — Music Improvisation Trainer. Let your music take flight.',
  ),
  footerRights: e('Все права защищены.', 'All rights reserved.'),
} as const;
