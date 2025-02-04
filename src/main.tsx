import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

import './index.css';

const rootElement: HTMLElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
