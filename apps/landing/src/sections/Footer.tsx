import { useT } from '../landing.i18n';
import { AmaziliaWordmark } from '../components/HummingbirdMark';
import { LangToggle } from '../components/LangToggle';
import { studioUrl } from '../studiolink';

export function Footer() {
  const t = useT();
  const year = 2026;
  return (
    <footer style={{ background: 'var(--amz-bg-deep)', borderTop: '1px solid var(--amz-border)' }}>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <AmaziliaWordmark />
            <p className="mt-3 max-w-md text-sm" style={{ color: 'var(--amz-text-dim)' }}>
              {t('footerTagline')}
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--amz-text-dim)' }}>
              <a href="#features" className="transition-colors hover:text-white">
                {t('navFeatures')}
              </a>
              <a href="#how" className="transition-colors hover:text-white">
                {t('navHow')}
              </a>
              <a href="#sound" className="transition-colors hover:text-white">
                {t('navSound')}
              </a>
              <a href={studioUrl('/login')} className="transition-colors hover:text-white">
                {t('signIn')}
              </a>
            </nav>
            <LangToggle />
          </div>
        </div>
        <div
          className="mt-10 border-t pt-6 text-sm"
          style={{ borderColor: 'var(--amz-border)', color: 'var(--amz-text-dim)' }}
        >
          © {year} Amazilia. {t('footerRights')}
        </div>
      </div>
    </footer>
  );
}
