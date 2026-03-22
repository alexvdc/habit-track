// js/pages/dashboard.js

import { getStats, getHabitsByZone } from '../store.js';
import { barChart } from '../components/chart.js';

export function render(container) {
  const stats = getStats();
  const acquired = getHabitsByZone('past');
  const upcoming = getHabitsByZone('future');

  container.innerHTML = `
    <div class="dashboard">
      <h1>Dashboard</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">${stats.activeCount}</span>
          <span class="stat-label">Habitudes actives</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.longestStreak}j</span>
          <span class="stat-label">Plus long streak</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.weeklyRate}%</span>
          <span class="stat-label">Taux cette semaine</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.acquiredCount}</span>
          <span class="stat-label">Habitudes acquises</span>
        </div>
      </div>

      <section class="dashboard-section">
        <h2>Check-ins — 30 derniers jours</h2>
        <div class="chart-container">
          ${barChart(stats.last30)}
        </div>
      </section>

      ${acquired.length ? `
        <section class="dashboard-section">
          <h2>Habitudes acquises</h2>
          <ul class="acquired-list">
            ${acquired.map(h => `<li>${h.title} <small class="text-muted">depuis ${h.movedAt}</small></li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${upcoming.length ? `
        <section class="dashboard-section">
          <h2>Prochaines habitudes</h2>
          <ul class="upcoming-list">
            ${upcoming.map(h => `<li>${h.title} ${h.targetDate ? `<small class="text-muted">objectif : ${h.targetDate}</small>` : ''}</li>`).join('')}
          </ul>
        </section>
      ` : ''}
    </div>
  `;
}
