// js/pages/dashboard.js — V2 Dashboard with stat cards, chart, progress, tips

import { getStats, getHabitsByZone, getCurrentStreak, getWeeklyProgress, todayISO, getMoodLog } from '../store.js';
import { barChart } from '../components/chart.js';
import { icon } from '../components/icons.js';
import { escapeHTML, formatDateFR } from '../utils.js';

const STREAK_TARGET = 30;

const DAILY_QUOTES = [
  { text: "Nous sommes ce que nous répétons chaque jour. L'excellence n'est alors plus un acte, mais une habitude.", author: "Aristote" },
  { text: "Le secret du changement, c'est de concentrer toute ton énergie non pas à lutter contre le passé, mais à construire l'avenir.", author: "Socrate" },
  { text: "La motivation te met en route. L'habitude te fait avancer.", author: "Jim Ryun" },
  { text: "Chaque action que tu poses est un vote pour le type de personne que tu souhaites devenir.", author: "James Clear" },
  { text: "Ce n'est pas ce que nous faisons de temps en temps qui façonne notre vie, mais ce que nous faisons régulièrement.", author: "Tony Robbins" },
  { text: "La discipline est le pont entre les objectifs et leur accomplissement.", author: "Jim Rohn" },
  { text: "Tu n'as pas besoin d'être parfait. Tu as besoin d'être régulier.", author: "Proverbe coaching" },
  { text: "Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment, c'est maintenant.", author: "Proverbe chinois" },
  { text: "Les petites choses qu'on fait chaque jour comptent bien plus que les grandes choses qu'on fait de temps en temps.", author: "Robin Sharma" },
  { text: "Prends soin de tes habitudes, elles prendront soin de ton avenir.", author: "Proverbe coaching" },
  { text: "Le progrès, ce n'est pas la perfection. C'est la constance.", author: "Proverbe coaching" },
  { text: "Commence là où tu es. Utilise ce que tu as. Fais ce que tu peux.", author: "Arthur Ashe" },
  { text: "Une habitude ne peut pas être jetée par la fenêtre ; elle doit être accompagnée à la porte, marche par marche.", author: "Mark Twain" },
  { text: "Le succès est la somme de petits efforts, répétés jour après jour.", author: "Robert Collier" },
  { text: "Celui qui déplace une montagne commence par déplacer de petites pierres.", author: "Confucius" },
];

function getDailyQuote() {
  const today = todayISO();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash) + today.charCodeAt(i);
    hash |= 0;
  }
  return DAILY_QUOTES[Math.abs(hash) % DAILY_QUOTES.length];
}

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
    const freq = h.frequency || { type: 'daily' };
    let freqDetail = '';
    if (freq.type !== 'daily') {
      const wp = getWeeklyProgress(h);
      freqDetail = ` · ${wp.done}/${wp.target} sem.`;
    }
    return `
      <li class="hp-item">
        <div class="hp-dot"></div>
        <div class="hp-info">
          <div class="hp-name">${escapeHTML(h.title)}</div>
          <div class="hp-detail">${streak} jour${streak !== 1 ? 's' : ''} sur ${STREAK_TARGET}${freqDetail}</div>
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

  const quote = getDailyQuote();

  // Mood chart (14 days)
  const moodLog = getMoodLog();
  const moodData = stats.last30.slice(-14).map(d => ({
    date: d.date,
    level: moodLog[d.date]?.level || 0
  }));
  const moodFilled = moodData.filter(d => d.level > 0);
  const avgMood = moodFilled.length > 0
    ? (moodFilled.reduce((s, d) => s + d.level, 0) / moodFilled.length).toFixed(1)
    : null;

  const MOOD_EMOJIS = ['', '\u{1F634}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F525}'];
  const MOOD_COLORS = ['', 'var(--past)', 'var(--warning)', 'var(--text-muted)', 'var(--primary)', 'var(--accent)'];

  let moodChartHTML = '';
  if (moodFilled.length > 0) {
    moodChartHTML = `
      <div class="panel">
        <h2>${icon('star', 'i-sm')} \u00c9nergie \u2014 14 derniers jours</h2>
        <div class="mood-chart">
          ${moodData.map(d => {
            const pct = d.level > 0 ? (d.level / 5) * 100 : 0;
            const emoji = d.level > 0 ? MOOD_EMOJIS[d.level] : '';
            const dayLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase();
            return `<div class="mood-bar-col">
              <span class="mood-bar-emoji">${emoji}</span>
              <div class="mood-bar-track"><div class="mood-bar-fill" style="height:${pct}%;background:${d.level > 0 ? MOOD_COLORS[d.level] : 'transparent'}"></div></div>
              <span class="mood-bar-day">${dayLabel}</span>
            </div>`;
          }).join('')}
        </div>
        ${avgMood ? `<div class="mood-avg">Moyenne : ${MOOD_EMOJIS[Math.round(parseFloat(avgMood))]} ${avgMood}/5</div>` : ''}
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
        ${moodChartHTML}
        ${tipHTML}
        <div class="panel panel--quote">
          <div class="quote-head">${icon('star', 'i-sm')} Citation du jour</div>
          <blockquote class="quote-text">${escapeHTML(quote.text)}</blockquote>
          <cite class="quote-author">\u2014 ${escapeHTML(quote.author)}</cite>
        </div>
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
