import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const isBenignError = (err: any) => {
    const str = String(err?.message || err?.reason || err?.stack || err || '').toLowerCase();
    return (
      str.includes('aborterror') ||
      str.includes('aborted') ||
      str.includes('signal is aborted') ||
      str.includes('failed to fetch') ||
      str.includes('cancelled')
    );
  };

  window.addEventListener(
    'unhandledrejection',
    (e) => {
      if (isBenignError(e.reason)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (e) => {
      if (isBenignError(e.error) || isBenignError(e.message)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(<App />);
