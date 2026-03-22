// js/pages/dashboard.js — V2 Dashboard with stat cards, chart, progress, tips

import { getStats, getHabitsByZone, getCurrentStreak, todayISO } from '../store.js';
import { barChart } from '../components/chart.js';
import { icon } from '../components/icons.js';
import { escapeHTML, formatDateFR } from '../utils.js';

const STREAK_TARGET = 30;

export function render(container) {
  const stats = getStats();
  const present = getHabitsByZone('present');
  const acquired = getHabitsByZone('past');
  const upcoming = getHabitsByZone('future');

  // Take last 14 days for the chart
  const last14 = stats.last30.slice(-14);

  // Per-habit progress
  const progressHTML = present.map(h => {
    const streak = getCurrentStreak(h);
    const pct = Math.min(Math.round((streak / STREAK_TARGET) * 100), 100);
    return `
      <li class="hp-item">
        <div class="hp-dot"></div>
        <div class="hp-info">
          <div class="hp-name">${escapeHTML(h.title)}</div>
          <div class="hp-detail">${streak} jour${streak !== 1 ? 's' : ''} sur ${STREAK_TARGET}</div>
          <div class="hp-bar"><div class="hp-fill" style="width:${pct}%"></div></div>
        </div>
        <span class="hp-pct">${pct}%</span>
      </li>`;
  }).join('');

  // Acquired list
  const acquiredHTML = acquired.map(h =>
    `<li><span class="dot dot--past"></span><span class="nm">${escapeHTML(h.title)}</span><span class="dt">${formatDateFR(h.movedAt, { short: true, noYear: true })}</span></li>`
  ).join('');

  // Upcoming list
  const upcomingHTML = upcoming.map(h =>
    `<li><span class="dot dot--future"></span><span class="nm">${escapeHTML(h.title)}</span><span class="dt">${h.targetDate ? formatDateFR(h.targetDate, { short: true, noYear: true }) : ''}</span></li>`
  ).join('');

  // Contextual tip
  let tipHTML = '';
  const closestTo30 = present.reduce((best, h) => {
    const s = getCurrentStreak(h);
    return (s > (best?.streak || 0)) ? { habit: h, streak: s } : best;
  }, null);
  if (closestTo30 && closestTo30.streak >= 20) {
    tipHTML = `
      <div class="panel panel--tip">
        <h2>${icon('info', 'i-sm')} Conseil de la semaine</h2>
        <p>${escapeHTML(closestTo30.habit.title)} approche les ${STREAK_TARGET} jours ! Une fois le palier atteint, envisage de la déplacer vers le Passé comme habitude acquise.</p>
      </div>`;
  } else if (present.length > 0) {
    tipHTML = `
      <div class="panel panel--tip">
        <h2>${icon('info', 'i-sm')} Conseil</h2>
        <p>La régularité compte plus que la perfection. Même 1 minute de pratique maintient le streak vivant.</p>
      </div>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Vue d'ensemble de ta progression</p>
    </div>

    <div class="dash-stats">
      <div class="stat-card stat-card--teal">
        <div class="stat-top">
          <div class="stat-icon stat-icon--teal">${icon('check')}</div>
        </div>
        <div class="stat-val">${stats.activeCount}</div>
        <div class="stat-lbl">Habitudes actives</div>
      </div>
      <div class="stat-card stat-card--orange">
        <div class="stat-top">
          <div class="stat-icon stat-icon--orange">${icon('bolt')}</div>
        </div>
        <div class="stat-val">${stats.longestStreak}j</div>
        <div class="stat-lbl">Plus long streak</div>
      </div>
      <div class="stat-card stat-card--indigo">
        <div class="stat-top">
          <div class="stat-icon stat-icon--indigo">${icon('clock')}</div>
        </div>
        <div class="stat-val">${stats.weeklyRate}%</div>
        <div class="stat-lbl">Taux cette semaine</div>
      </div>
      <div class="stat-card stat-card--slate">
        <div class="stat-top">
          <div class="stat-icon stat-icon--slate">${icon('shield')}</div>
        </div>
        <div class="stat-val">${stats.acquiredCount}</div>
        <div class="stat-lbl">Habitudes acquises</div>
      </div>
    </div>

    <div class="dash-grid">
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="panel">
          <h2>${icon('barChart', 'i-sm')} Check-ins — 14 derniers jours</h2>
          ${barChart(last14, { todayDate: todayISO() })}
        </div>
        ${progressHTML ? `
          <div class="panel">
            <h2>${icon('bolt', 'i-sm')} Progression par habitude</h2>
            <ul class="habit-progress">${progressHTML}</ul>
          </div>
        ` : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:20px">
        ${acquired.length ? `
          <div class="panel">
            <h2>${icon('shield', 'i-sm')} Acquises</h2>
            <ul class="mini-list">${acquiredHTML}</ul>
          </div>
        ` : ''}
        ${upcoming.length ? `
          <div class="panel">
            <h2>${icon('bolt', 'i-sm')} Prochaines</h2>
            <ul class="mini-list">${upcomingHTML}</ul>
          </div>
        ` : ''}
        ${tipHTML}
      </div>
    </div>
  `;

  // Animate stat counters
  container.querySelectorAll('.stat-val').forEach(el => {
    const text = el.textContent;
    const match = text.match(/^(\d+)/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const suffix = text.replace(/^\d+/, '');
    if (target === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let current = 0;
    const duration = 600;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
