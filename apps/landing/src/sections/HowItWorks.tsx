import { useT } from '../landing.i18n';
import { Reveal } from '../components/Shared';

export function HowItWorks() {
  const t = useT();
  const steps = t('howSteps');
  return (
    <section id="how" className="scroll-mt-20" style={{ background: 'var(--amz-bg-deep)' }}>
      <div className="mx-auto max-w-7xl px-6 py-20">
        <Reveal>
          <h2 className="amz-display text-center text-3xl font-bold sm:text-4xl">{t('howTitle')}</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal
              key={s.title}
              delay={i * 90}
              className="relative rounded-2xl border p-6"
              style={{ borderColor: 'var(--amz-border)', background: 'var(--amz-surface)' }}
            >
              <span
                className="amz-display flex size-10 items-center justify-center rounded-xl text-lg font-bold"
                style={{ background: 'var(--amz-cta-from)', color: '#fff' }}
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--amz-text-dim)' }}>
                {s.text}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
