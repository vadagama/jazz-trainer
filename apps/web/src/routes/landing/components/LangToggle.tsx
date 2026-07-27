import { useLang } from '../landing.i18n';

/** Компактный переключатель RU / EN. */
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`inline-flex items-center rounded-full border p-0.5 text-xs font-medium ${className ?? ''}`}
      style={{ borderColor: 'var(--amz-border-strong)' }}
    >
      {(['en', 'ru'] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className="rounded-full px-2.5 py-1 tracking-wide transition-colors"
            style={{
              backgroundColor: active ? 'var(--amz-cta-from)' : 'transparent',
              color: active ? '#fff' : 'var(--amz-text-dim)',
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
