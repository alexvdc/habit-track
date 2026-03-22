// js/components/habit-card.js — V2 habit card with dots, streak bars, check rings

import { toggleCheckIn, moveHabit, deleteHabit, updateHabit, getCurrentStreak, getDaysSince, todayISO, loadData, saveData, getCategories } from '../store.js';
import { escapeHTML, formatDateFR } from '../utils.js';
import { icon } from './icons.js';
import { showToast } from './toast.js';
import { showModal } from './modal.js';

const ZONES = ['past', 'present', 'future'];
const STREAK_TARGET = 30;

/**
 * Creates and returns a habit card DOM element.
 * @param {Object} habit
 * @param {Function} onUpdate - called after any data mutation
 * @returns {HTMLElement}
 */
export function createHabitCard(habit, onUpdate) {
  const card = document.createElement('div');
  card.className = `habit-card habit-card--${habit.zone}`;
  card.dataset.id = habit.id;

  const isChecked = habit.checkIns.includes(todayISO());
  const zoneIdx = ZONES.indexOf(habit.zone);
  const canLeft = zoneIdx > 0;
  const canRight = zoneIdx < ZONES.length - 1;

  // --- Body content varies by zone ---
  let bodyHTML = '';
  if (habit.zone === 'present') {
    const streak = getCurrentStreak(habit);
    const pct = Math.min(Math.round((streak / STREAK_TARGET) * 100), 100);
    bodyHTML = `
      <div class="streak-row">
        <span class="streak-label">${streak > 0 ? icon('bolt', 'i-sm') : ''}${streak}j</span>
        <div class="streak-track"><div class="streak-fill" style="width:${pct}%"></div></div>
        <span class="streak-target">${STREAK_TARGET}j</span>
        <button class="check-ring ${isChecked ? 'done' : ''}" data-action="toggle" aria-label="${isChecked ? 'Décocher' : 'Valider'}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${isChecked ? '3' : '2'}" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>`;
  } else if (habit.zone === 'past') {
    const dateStr = habit.movedAt ? formatDateFR(habit.movedAt) : null;
    const days = getDaysSince(habit);
    bodyHTML = dateStr
      ? `<span class="meta-text meta-text--past">Acquise le ${dateStr} · ${days}j</span>`
      : `<span class="meta-text meta-text--past">${days} jour${days !== 1 ? 's' : ''}</span>`;
  } else {
    const dateStr = habit.targetDate ? formatDateFR(habit.targetDate) : null;
    bodyHTML = dateStr
      ? `<span class="meta-text meta-text--future">Objectif : ${dateStr}</span>`
      : `<span class="meta-text meta-text--future">Pas de date cible</span>`;
  }

  // --- Action buttons ---
  let actionsHTML = '';
  if (canLeft) actionsHTML += `<button class="card-btn" data-action="move-left" aria-label="Déplacer vers ${ZONES[zoneIdx - 1]}">${icon('arrowLeft', 'i-sm')}</button>`;
  if (canRight) actionsHTML += `<button class="card-btn" data-action="move-right" aria-label="Déplacer vers ${ZONES[zoneIdx + 1]}">${icon('arrowRight', 'i-sm')}</button>`;
  actionsHTML += `<button class="card-btn" data-action="edit" aria-label="Modifier">${icon('edit', 'i-sm')}</button>`;
  actionsHTML += `<button class="card-btn card-btn--del" data-action="delete" aria-label="Supprimer">${icon('trash', 'i-sm')}</button>`;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-dot"></div>
      <span class="card-title">${escapeHTML(habit.title)}</span>
      ${habit.category ? `<span class="card-cat">${escapeHTML(habit.category)}</span>` : ''}
    </div>
    <div class="card-body">${bodyHTML}</div>
    <div class="card-actions">${actionsHTML}</div>
  `;

  // --- Event delegation ---
  card.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'toggle') {
      const wasChecked = habit.checkIns.includes(todayISO());
      toggleCheckIn(habit.id);
      const label = wasChecked ? 'annulé' : 'validé';
      showToast(`${habit.title} — ${label} pour le ${formatDateFR(todayISO(), { noYear: true })}`, {
        undo: () => { toggleCheckIn(habit.id); onUpdate(); }
      });
      onUpdate();
    } else if (action === 'move-left') {
      const newZone = ZONES[zoneIdx - 1];
      moveHabit(habit.id, newZone);
      showToast(`${habit.title} déplacé vers ${newZone}`, {
        undo: () => { moveHabit(habit.id, habit.zone); onUpdate(); }
      });
      onUpdate();
    } else if (action === 'move-right') {
      const newZone = ZONES[zoneIdx + 1];
      moveHabit(habit.id, newZone);
      showToast(`${habit.title} déplacé vers ${newZone}`, {
        undo: () => { moveHabit(habit.id, habit.zone); onUpdate(); }
      });
      onUpdate();
    } else if (action === 'edit') {
      const fields = [
        { name: 'title', label: 'Nom de l\'habitude', type: 'text', required: true, value: habit.title },
        { name: 'category', label: 'Catégorie', type: 'select', options: getCategories(), value: habit.category },
      ];
      if (habit.zone === 'future') {
        fields.push({ name: 'targetDate', label: 'Date cible', type: 'date', value: habit.targetDate || '' });
      } else if (habit.zone === 'past') {
        fields.push({ name: 'movedAt', label: 'Date d\'acquisition', type: 'date', value: habit.movedAt || '' });
      }
      const result = await showModal({
        title: 'Modifier l\'habitude',
        fields,
        confirmLabel: 'Enregistrer',
      });
      if (result && result.title) {
        const updates = { title: result.title, category: result.category || '' };
        if (habit.zone === 'future') updates.targetDate = result.targetDate || null;
        if (habit.zone === 'past') updates.movedAt = result.movedAt || habit.movedAt;
        updateHabit(habit.id, updates);
        showToast(`${result.title} modifié`);
        onUpdate();
      }
    } else if (action === 'delete') {
      const result = await showModal({
        title: 'Supprimer cette habitude ?',
        message: `Tu es sur le point de supprimer « ${escapeHTML(habit.title)} ». Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        danger: true,
      });
      if (result) {
        const snapshot = loadData();
        deleteHabit(habit.id);
        showToast(`${habit.title} supprimé`, {
          undo: () => { saveData(snapshot); onUpdate(); }
        });
        onUpdate();
      }
    }
  });

  return card;
}
