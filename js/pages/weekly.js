// js/pages/weekly.js — V2 Weekly reflection with week navigation + timeline

import { addReflection, updateReflection, getReflections, getReflectionForCurrentWeek, todayISO, getMonday } from '../store.js';
import { escapeHTML, formatDateFR } from '../utils.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';

export function render(container, weekOffset = 0) {
  // Calculate the Monday for the displayed week
  const baseDate = new Date(todayISO() + 'T00:00:00');
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  const displayDate = `${year}-${month}-${day}`;
  const monday = getMonday(displayDate);
  const isCurrentWeek = monday === getMonday(todayISO());

  // Find reflection for displayed week
  const allReflections = getReflections();
  const current = allReflections.find(r => r.weekOf === monday) || null;

  // History: all except displayed week
  const history = allReflections.filter(r => r.weekOf !== monday);

  const reminderHTML = !current && isCurrentWeek
    ? `<div class="reminder">${icon('info')} La réflexion de cette semaine n'est pas encore remplie.</div>`
    : '';

  container.innerHTML = `
    <div class="page-header">
      <h1>Réflexion Hebdomadaire</h1>
      <p>Prends un moment pour faire le point sur ta semaine</p>
    </div>

    <div class="weekly-wrap">
      <div class="week-nav">
        <button class="week-nav-btn" id="week-prev">${icon('chevronLeft', 'i-sm')}</button>
        <span class="week-current">Semaine du ${formatDateFR(monday)}</span>
        <button class="week-nav-btn" id="week-next" ${isCurrentWeek ? 'disabled style="opacity:0.4;cursor:default"' : ''}>${icon('chevronRight', 'i-sm')}</button>
      </div>

      ${reminderHTML}

      <div class="form-card">
        <form id="weekly-form">
          <div class="field">
            <label for="w-worked">${icon('check', 'i-sm')} Qu'est-ce qui a bien fonctionné ?</label>
            <textarea id="w-worked" placeholder="Ex : J'ai tenu ma méditation chaque matin...">${escapeHTML(current?.whatWorked || '')}</textarea>
          </div>
          <div class="field">
            <label for="w-blocked">${icon('xCircle', 'i-sm')} Qu'est-ce qui a bloqué ou été difficile ?</label>
            <textarea id="w-blocked" placeholder="Ex : Le jogging sous la pluie...">${escapeHTML(current?.whatBlocked || '')}</textarea>
          </div>
          <div class="field">
            <label for="w-next">${icon('bolt', 'i-sm')} Quels ajustements pour la prochaine semaine ?</label>
            <textarea id="w-next" placeholder="Ex : Préparer mes affaires la veille...">${escapeHTML(current?.nextSteps || '')}</textarea>
          </div>
          <div class="form-foot">
            <button type="submit" class="btn btn--primary">
              ${icon('save', 'i-sm')} ${current ? 'Mettre à jour' : 'Enregistrer'}
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
                <summary class="tl-summary">Semaine du ${formatDateFR(r.weekOf)}</summary>
                <div class="tl-body">
                  ${r.whatWorked ? `<div class="tl-item"><label>Ce qui a marché</label><p>${escapeHTML(r.whatWorked)}</p></div>` : ''}
                  ${r.whatBlocked ? `<div class="tl-item"><label>Difficultés</label><p>${escapeHTML(r.whatBlocked)}</p></div>` : ''}
                  ${r.nextSteps ? `<div class="tl-item"><label>Ajustements</label><p>${escapeHTML(r.nextSteps)}</p></div>` : ''}
                </div>
              </details>
            `).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;

  // Week navigation
  container.querySelector('#week-prev').addEventListener('click', () => {
    render(container, weekOffset - 1);
  });
  container.querySelector('#week-next').addEventListener('click', () => {
    if (!isCurrentWeek) render(container, weekOffset + 1);
  });

  // Form submit
  container.querySelector('#weekly-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const workedEl = document.getElementById('w-worked');
    const blockedEl = document.getElementById('w-blocked');
    const nextEl = document.getElementById('w-next');
    const whatWorked = workedEl.value.trim();
    const whatBlocked = blockedEl.value.trim();
    const nextSteps = nextEl.value.trim();

    // Clear previous errors
    container.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    container.querySelectorAll('.error-msg').forEach(el => el.remove());

    if (!whatWorked && !whatBlocked && !nextSteps) {
      [workedEl, blockedEl, nextEl].forEach(el => el.classList.add('field-error'));
      const msg = document.createElement('div');
      msg.className = 'error-msg';
      msg.textContent = 'Remplis au moins un champ pour enregistrer ta réflexion.';
      container.querySelector('.form-foot').insertAdjacentElement('beforebegin', msg);
      return;
    }

    if (current) {
      updateReflection(current.id, { whatWorked, whatBlocked, nextSteps });
    } else {
      addReflection(whatWorked, whatBlocked, nextSteps);
    }

    showToast(`Réflexion ${current ? 'mise à jour' : 'enregistrée'}`);
    render(container, weekOffset);
  });
}
