import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './presentation/styles/tailwind.css';
import './presentation/styles/global.scss';

const container = document.getElementById('root');
if (container === null) throw new Error('Root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
