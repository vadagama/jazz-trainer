import { Link } from 'react-router-dom';
import { useT } from '../landing.i18n';
import { Reveal } from '../components/Shared';

export function SignIn() {
  const t = useT();
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-3xl border px-6 py-16 text-center"
          style={{
            borderColor: 'var(--amz-border-strong)',
            background:
              'radial-gradient(70% 120% at 50% 0%, rgba(147,51,234,0.22), transparent 60%), var(--amz-surface)',
          }}
        >
          <img
            src="/landing/logo.png"
            alt=""
            aria-hidden="true"
            className="amz-float mx-auto block"
            style={{ height: 48, width: 'auto' }}
          />
          <h2 className="amz-display mx-auto mt-6 max-w-2xl text-3xl font-bold sm:text-4xl">
            {t('signInTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--amz-text-dim)' }}>
            {t('signInText')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, var(--amz-cta-from), var(--amz-cta-to))' }}
            >
              {t('tryWithoutAccount')} →
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
