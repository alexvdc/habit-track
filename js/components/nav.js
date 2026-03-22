const ROUTES = [
  { hash: '#/board', label: 'Tableau', icon: '◫' },
  { hash: '#/dashboard', label: 'Dashboard', icon: '◩' },
  { hash: '#/weekly', label: 'Réflexion', icon: '◪' },
  { hash: '#/settings', label: 'Réglages', icon: '⚙' }
];

export function renderNav(container) {
  const current = window.location.hash || '#/board';
  container.innerHTML = `
    <ul class="nav-list">
      ${ROUTES.map(r => `
        <li>
          <a href="${r.hash}" class="nav-link ${current === r.hash ? 'active' : ''}">
            <span class="nav-icon">${r.icon}</span>
            <span class="nav-label">${r.label}</span>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}
