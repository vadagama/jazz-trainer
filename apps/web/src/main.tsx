import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';
import { queryClient } from './lib/queryClient.js';
import { ThemeProvider } from './components/layout/ThemeProvider.js';
// Фаза 1: инициализация плагинного хоста (сайд-эффект — загрузка builtin-плагинов)
import './shell/bootstrap.js';
// Фаза C: MIDI singleton setup (exposes window.__midiInputPort)
import { initMidi } from './shell/midiSetup.js';
// Audio singleton setup for solo instrument test sound
import { ensureAudioReady } from './shell/audioSetup.js';
import './index.css';

// Initialize MIDI on the first user gesture
// (browsers require user interaction for Web MIDI API access).
if (typeof document !== 'undefined') {
  const initOnGesture = () => {
    initMidi().catch(() => {});
  };
  document.addEventListener('pointerdown', initOnGesture, { once: true });
  document.addEventListener('keydown', initOnGesture, { once: true });
}

// Expose audio init for the Settings → MIDI tab test sound button
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ensureAudioReady = ensureAudioReady;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

// Suppress unavoidable Chrome internal IPC errors that occur during
// Vite HMR page reloads when Web Audio / Web MIDI nodes are torn down
// and recreated. These originate from Chrome's audio/midi service
// messaging layer (chrome.runtime.sendMessage internally), not from
// application code, and cannot be fixed at the JS level.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message ?? String(event.reason);
    if (msg.includes('Could not establish connection')) {
      event.preventDefault(); // suppress "Uncaught (in promise)" in console
    }
  });
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
