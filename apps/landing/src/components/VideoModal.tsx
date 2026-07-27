import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useT } from '../landing.i18n';
import { studioUrl } from '../studiolink';

/**
 * Модальное окно «Watch demo».
 * Впиши URL встраивания (YouTube/Vimeo embed) в DEMO_EMBED_URL — появится плеер.
 * Пока URL пустой — показывается дружелюбная заглушка со ссылкой на плеер.
 */
const DEMO_EMBED_URL = '';

export function VideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,10,14,0.82)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('demoModalTitle')}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--amz-border-strong)', background: 'var(--amz-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ color: 'var(--amz-text)' }}
        >
          <X className="size-5" />
        </button>

        {DEMO_EMBED_URL ? (
          <div className="aspect-video w-full">
            <iframe
              src={DEMO_EMBED_URL}
              title={t('demoModalTitle')}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-col items-center px-8 py-14 text-center">
            <h3 className="amz-display text-2xl font-bold">{t('demoModalTitle')}</h3>
            <p className="mt-3 max-w-md" style={{ color: 'var(--amz-text-dim)' }}>
              {t('demoModalSoon')}
            </p>
            <a
              href={studioUrl('/')}
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, var(--amz-cta-from), var(--amz-cta-to))' }}
            >
              {t('ctaTry')} →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
