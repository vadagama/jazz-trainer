import { useEffect, useState } from 'react';
import './landing.tokens.css';
import { LandingLangProvider } from './landing.i18n';
import { Hero } from './sections/Hero';
import { ForWhom } from './sections/ForWhom';
import { Features } from './sections/Features';
import { HowItWorks } from './sections/HowItWorks';
import { Sound } from './sections/Sound';
import { SignIn } from './sections/SignIn';
import { Footer } from './sections/Footer';
import { VideoModal } from './components/VideoModal';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap';

/** Подключает брендовые шрифты только для лендинга, чтобы не грузить их на остальных страницах. */
function useLandingFonts() {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const add = (rel: string, href: string, cross?: boolean) => {
      if (document.querySelector(`link[data-amz][href="${href}"]`)) return;
      const el = document.createElement('link');
      el.rel = rel;
      el.href = href;
      el.dataset.amz = 'true';
      if (cross) el.crossOrigin = 'anonymous';
      document.head.appendChild(el);
      links.push(el);
    };
    add('preconnect', 'https://fonts.googleapis.com');
    add('preconnect', 'https://fonts.gstatic.com', true);
    add('stylesheet', FONTS_HREF);
    return () => links.forEach((el) => el.remove());
  }, []);
}

export default function LandingPage() {
  useLandingFonts();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <LandingLangProvider>
      <div className="amz-landing">
        <Hero onWatchDemo={() => setDemoOpen(true)} />
        <ForWhom />
        <Features />
        <HowItWorks />
        <Sound />
        <SignIn />
        <Footer />
        <VideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      </div>
    </LandingLangProvider>
  );
}
