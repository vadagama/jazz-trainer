import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useT } from '../landing.i18n';
import { AmaziliaWordmark } from '../components/HummingbirdMark';
import { LangToggle } from '../components/LangToggle';
import { BrowserFrame, PhotoCard, Reveal, NEON } from '../components/Shared';

/* Неоновые акценты по кругу — teal/amber/purple, те же тона, что и чипы секций в самом плеере. */
const NEON_ROTATION = [NEON.teal, NEON.amber, NEON.purple];

/* Порядок фото: саксофон, пианино, гитара. */
const SCENARIO_MEDIA = [
  '/landing/scenario-explore.jpg',
  '/landing/scenario-practice.jpg',
  '/landing/scenario-create.jpg',
];

export function Hero({ onWatchDemo }: { onWatchDemo: () => void }) {
  const t = useT();
  const scenarios = t('heroScenarios');

  return (
    <header className="relative overflow-hidden">
      {/* Фоновое свечение — движение крыльев (BRAND §6.4), плюс точечный фиолетовый акцент для эклектики */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 0%, rgba(13,115,119,0.28), transparent 70%), radial-gradient(50% 40% at 90% 10%, rgba(240,165,0,0.14), transparent 70%), radial-gradient(40% 35% at 60% 55%, rgba(192,132,252,0.08), transparent 70%)',
        }}
      />

      {/* Nav */}
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <AmaziliaWordmark />
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: 'var(--amz-text-dim)' }}>
            <a href="#features" className="transition-colors hover:text-white">
              {t('navFeatures')}
            </a>
            <a href="#how" className="transition-colors hover:text-white">
              {t('navHow')}
            </a>
            <a href="#sound" className="transition-colors hover:text-white">
              {t('navSound')}
            </a>
          </nav>
          <LangToggle />
          <Link
            to="/login"
            className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--amz-border-strong)', color: 'var(--amz-text)' }}
          >
            {t('signIn')}
          </Link>
        </div>
      </nav>

      {/* Hero content — одна колонка: слоган → кнопки → скриншот на всю ширину (форма как в референсе) */}
      <div className="relative mx-auto max-w-7xl px-6 pb-8 pt-10 lg:pt-16">
        <div className="max-w-3xl">
          <h1 className="amz-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--amz-text-dim)' }}>
            {t('heroSubtitle')}
          </p>
        </div>

        {/* CTA — аккуратные кнопки слева */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/catalog"
            className="amz-cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
            style={{ background: 'linear-gradient(135deg, var(--amz-cta-from), var(--amz-cta-to))' }}
          >
            {t('ctaTry')} →
          </Link>
          <button
            type="button"
            onClick={onWatchDemo}
            className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-base font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--amz-border-strong)', color: 'var(--amz-text)' }}
          >
            <Play className="size-4" fill="currentColor" />
            {t('ctaDemo')}
          </button>
        </div>

        {/* Визуал — скриншот каталога на всю ширину, без парения */}
        <Reveal className="mt-12">
          <BrowserFrame
            src="/landing/hero-catalog.png"
            alt="Amazilia — catalog"
            url="amazilia.app"
          />
        </Reveal>

        {/* Маленькая ссылка под скриншотом */}
        <div className="mt-4 text-center">
          <a
            href="#how"
            className="amz-mono text-xs tracking-wide transition-colors hover:text-white"
            style={{ color: 'var(--amz-text-dim)' }}
          >
            {t('navHow')} →
          </a>
        </div>
      </div>

      {/* Строка-таглайн + три сценария */}
      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20">
        <h2 className="amz-display text-center text-3xl font-bold sm:text-4xl">{t('heroTagline')}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {scenarios.map((s, i) => (
            <PhotoCard
              key={s.title}
              delay={i * 90}
              src={SCENARIO_MEDIA[i % SCENARIO_MEDIA.length]!}
              alt={s.title}
              accent={NEON_ROTATION[i % NEON_ROTATION.length]!}
              title={s.title}
              text={s.text}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
