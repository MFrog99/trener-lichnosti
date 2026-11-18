import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { initCloud } from './lib/cloud';
import { isCapacitor, isElectron } from './lib/config';
import './styles.css';

initCloud();

// Офлайн-кэш сайта (только для веб-версии)
if ('serviceWorker' in navigator && location.protocol === 'https:' && !isElectron && !isCapacitor) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
