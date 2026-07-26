import { useT } from '../landing.i18n';
import { Reveal } from '../components/Shared';

export function Sound() {
  const t = useT();
  const styles = t('soundStyles');
  return (
    <section id="sound" className="scroll-mt-20">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <Reveal>
          <h2 className="amz-display text-3xl font-bold sm:text-4xl lg:text-5xl">{t('soundTitle')}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--amz-text-dim)' }}>
            {t('soundText')}
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-12">
          <p className="mb-5 text-sm font-medium tracking-[0.1em]" style={{ color: 'var(--amz-text-dim)' }}>
            {t('soundStylesNote')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {styles.map((s, i) => (
              <span
                key={s}
                className="rounded-full border px-5 py-2 text-base font-medium transition-transform hover:scale-105"
                style={{
                  borderColor: 'var(--amz-border-strong)',
                  background: i % 2 === 0 ? 'rgba(13,115,119,0.12)' : 'rgba(240,165,0,0.10)',
                  color: 'var(--amz-text)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
