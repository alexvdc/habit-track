import { renderNav } from './components/nav.js';

const navEl = document.getElementById('nav');
const appEl = document.getElementById('app');

const routes = {
  '#/board': () => import('./pages/board.js').then(m => m.render(appEl)),
  '#/dashboard': () => import('./pages/dashboard.js').then(m => m.render(appEl)),
  '#/weekly': () => import('./pages/weekly.js').then(m => m.render(appEl)),
  '#/settings': () => import('./pages/settings.js').then(m => m.render(appEl))
};

function navigate() {
  const hash = window.location.hash || '#/board';
  if (!window.location.hash) window.location.hash = '#/board';
  renderNav(navEl);
  const loader = routes[hash];
  if (loader) {
    loader();
  } else {
    appEl.innerHTML = '<p>Page introuvable.</p>';
  }
}

window.addEventListener('hashchange', navigate);
navigate();
