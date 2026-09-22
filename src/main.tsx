import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker, requestPersistentStorage } from '@infrastructure/pwa';
import './presentation/styles/tailwind.css';
import './presentation/styles/global.scss';

// The web fallback has to survive an offline gym and the browser's storage housekeeping.
registerServiceWorker();
void requestPersistentStorage();

const container = document.getElementById('root');
if (container === null) throw new Error('Root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
