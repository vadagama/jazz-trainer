import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import LandingPage from './LandingPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LandingPage />
    <Analytics />
  </StrictMode>,
);
