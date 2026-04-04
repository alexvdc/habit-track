// js/pages/monthly.js — Monthly review page

import { addMonthlyReview, updateMonthlyReview, getMonthlyReviews, getMonthlyReviewFor, getCurrentMonth, getMonthlyStats, todayISO } from '../store.js';
import { escapeHTML } from '../utils.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function formatMonth(monthOf) {
  const [y, m] = monthOf.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function render(container, monthOffset = 0) {
  const baseDate = new Date(todayISO() + 'T00:00:00');
  baseDate.setMonth(baseDate.getMonth() + monthOffset);
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  const monthOf = `${y}-${m}`;
  const currentMonth = getCurrentMonth();
  const isCurrentMonth = monthOf === currentMonth;

  const review = getMonthlyReviewFor(monthOf);
  const stats = getMonthlyStats(monthOf);
  const allReviews = getMonthlyReviews();
  const history = allReviews.filter(r => r.monthOf !== monthOf);

  const reminderHTML = !review && isCurrentMonth
    ? `<div class="reminder">${icon('info')} Le bilan de ce mois n'est pas encore rempli.</div>`
    : '';

  container.innerHTML = `
    <div class="page-header">
      <h1>Bilan Mensuel</h1>
      <p>Prends du recul sur ton mois</p>
    </div>

    <div class="weekly-wrap">
      <div class="week-nav">
        <button class="week-nav-btn" id="month-prev">${icon('chevronLeft', 'i-sm')}</button>
        <span class="week-current">${formatMonth(monthOf)}</span>
        <button class="week-nav-btn" id="month-next" ${isCurrentMonth ? 'disabled style="opacity:0.4;cursor:default"' : ''}>${icon('chevronRight', 'i-sm')}</button>
      </div>

      ${reminderHTML}

      <div class="monthly-stats-grid">
        <div class="monthly-stat">
          <span class="monthly-stat-val">${stats.completionRate}%</span>
          <span class="monthly-stat-lbl">Compl\u00e9tion</span>
        </div>
        <div class="monthly-stat">
          <span class="monthly-stat-val">${stats.bestStreak}j</span>
          <span class="monthly-stat-lbl">Meilleur streak</span>
        </div>
        <div class="monthly-stat">
          <span class="monthly-stat-val">${stats.totalGraceUsed}</span>
          <span class="monthly-stat-lbl">Grace days utilis\u00e9s</span>
        </div>
      </div>

      <div class="form-card">
        <form id="monthly-form">
          <div class="field">
            <label for="m-best">${icon('star', 'i-sm')} Quelle habitude t'a le plus apport\u00e9 ce mois-ci ?</label>
            <textarea id="m-best" placeholder="Ex : La m\u00e9ditation m'a vraiment aid\u00e9 \u00e0 rester calme...">${escapeHTML(review?.bestHabit || '')}</textarea>
          </div>
          <div class="field">
            <label for="m-challenges">${icon('xCircle', 'i-sm')} Qu'est-ce qui a \u00e9t\u00e9 difficile ? Qu'as-tu appris ?</label>
            <textarea id="m-challenges" placeholder="Ex : Difficile de maintenir le sport les semaines charg\u00e9es...">${escapeHTML(review?.challenges || '')}</textarea>
          </div>
          <div class="field">
            <label for="m-goal">${icon('bolt', 'i-sm')} Quel est ton objectif principal pour le mois prochain ?</label>
            <textarea id="m-goal" placeholder="Ex : Ajouter une habitude de lecture quotidienne...">${escapeHTML(review?.nextGoal || '')}</textarea>
          </div>
          <div class="form-foot">
            <button type="submit" class="btn btn--primary">
              ${icon('save', 'i-sm')} ${review ? 'Mettre \u00e0 jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>

      ${history.length ? `
        <section class="history-section">
          <h2>${icon('clock', 'i-sm')} Historique</h2>
          <div class="timeline">
            ${history.map((r, i) => `
              <details class="tl-entry"${i === 0 ? ' open' : ''}>
                <summary class="tl-summary">${formatMonth(r.monthOf)}</summary>
                <div class="tl-body">
                  ${r.bestHabit ? `<div class="tl-item"><label>Meilleure habitude</label><p>${escapeHTML(r.bestHabit)}</p></div>` : ''}
                  ${r.challenges ? `<div class="tl-item"><label>Difficult\u00e9s</label><p>${escapeHTML(r.challenges)}</p></div>` : ''}
                  ${r.nextGoal ? `<div class="tl-item"><label>Objectif suivant</label><p>${escapeHTML(r.nextGoal)}</p></div>` : ''}
                </div>
              </details>
            `).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;

  // Month navigation
  container.querySelector('#month-prev').addEventListener('click', () => {
    render(container, monthOffset - 1);
  });
  container.querySelector('#month-next').addEventListener('click', () => {
    if (!isCurrentMonth) render(container, monthOffset + 1);
  });

  // Form submit
  container.querySelector('#monthly-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const bestHabit = document.getElementById('m-best').value.trim();
    const challenges = document.getElementById('m-challenges').value.trim();
    const nextGoal = document.getElementById('m-goal').value.trim();

    // Clear previous errors
    container.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    container.querySelectorAll('.error-msg').forEach(el => el.remove());

    if (!bestHabit && !challenges && !nextGoal) {
      [document.getElementById('m-best'), document.getElementById('m-challenges'), document.getElementById('m-goal')].forEach(el => el.classList.add('field-error'));
      const msg = document.createElement('div');
      msg.className = 'error-msg';
      msg.textContent = 'Remplis au moins un champ pour enregistrer ton bilan.';
      container.querySelector('.form-foot').insertAdjacentElement('beforebegin', msg);
      return;
    }

    if (review) {
      updateMonthlyReview(review.id, { bestHabit, challenges, nextGoal });
    } else {
      addMonthlyReview(monthOf, bestHabit, challenges, nextGoal);
    }

    showToast(`Bilan ${review ? 'mis \u00e0 jour' : 'enregistr\u00e9'}`);
    render(container, monthOffset);
  });
}
