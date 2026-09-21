import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure any benign [vite] logs from Vite HMR client are silenced
if (typeof window !== 'undefined') {
  const origErr = console.error;
  console.error = (...args: unknown[]) => {
    const isVite = args.some(
      (a) => typeof a === 'string' && (a.includes('[vite]') || a.includes('websocket'))
    );
    if (isVite) return;
    origErr.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
