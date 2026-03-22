// js/app.js — Router & bootstrap

import { renderNav } from './components/nav.js';
import { getSettings, updateSettings } from './store.js';

// Persist auto-detected theme from inline <script> on first visit
(function() {
  const settings = getSettings();
  if (settings.theme === 'teal') {
    const applied = document.documentElement.getAttribute('data-theme');
    if (applied && applied !== 'teal') {
      updateSettings({ theme: applied });
    }
  }
})();

const sidebarEl = document.getElementById('sidebar');
const appEl = document.getElementById('app');

const routes = {
  '#/board':     () => import('./pages/board.js').then(m => m.render(appEl)),
  '#/dashboard': () => import('./pages/dashboard.js').then(m => m.render(appEl)),
  '#/weekly':    () => import('./pages/weekly.js').then(m => m.render(appEl)),
  '#/settings':  () => import('./pages/settings.js').then(m => m.render(appEl)),
};

function navigate() {
  const hash = window.location.hash || '#/board';
  if (!window.location.hash) window.location.hash = '#/board';
  renderNav(sidebarEl);
  const loader = routes[hash];
  if (loader) {
    loader();
  } else {
    appEl.innerHTML = '<div class="page-header"><h1>Page introuvable</h1></div>';
  }
}

window.addEventListener('hashchange', navigate);
navigate();
