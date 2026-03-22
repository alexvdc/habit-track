// js/components/nav.js — Sidebar navigation

import { icon } from './icons.js';
import { loadData } from '../store.js';

const ROUTES = [
  { hash: '#/board',     label: 'Tableau',    iconName: 'grid',     badge: true },
  { hash: '#/dashboard', label: 'Dashboard',  iconName: 'barChart' },
  { hash: '#/weekly',    label: 'Réflexion',  iconName: 'edit' },
  { hash: '#/settings',  label: 'Réglages',   iconName: 'settings' },
];

export function renderNav(container) {
  const current = window.location.hash || '#/board';
  const data = loadData();
  const totalHabits = data.habits.length;

  container.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-mark">H</div>
      HabitTrack
    </div>

    <div class="sidebar-label">Navigation</div>
    <ul class="sidebar-nav">
      ${ROUTES.map(r => {
        const isActive = current === r.hash;
        const badgeHTML = r.badge ? `<span class="badge">${totalHabits}</span>` : '';
        return `
          <li>
            <a href="${r.hash}" class="sidebar-link${isActive ? ' active' : ''}">
              ${icon(r.iconName)}
              ${r.label}
              ${badgeHTML}
            </a>
          </li>`;
      }).join('')}
    </ul>

    <div class="sidebar-spacer"></div>

    <div class="sidebar-footer">
      <div class="sidebar-avatar">U</div>
      <div>
        <div class="sidebar-user-name">Utilisateur</div>
        <div class="sidebar-user-detail">Données locales</div>
      </div>
    </div>
  `;

  // Bottom nav (mobile)
  const bottomNav = document.getElementById('bottom-nav');
  if (bottomNav) {
    bottomNav.innerHTML = ROUTES.map(r => {
      const isActive = current === r.hash;
      return `
        <a href="${r.hash}" class="bnav-link${isActive ? ' active' : ''}"${isActive ? ' aria-current="page"' : ''}>
          ${icon(r.iconName)}
          <span class="bnav-label">${r.label}</span>
        </a>`;
    }).join('');
  }
}
