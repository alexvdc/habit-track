// js/components/habit-card.js

import { toggleCheckIn, moveHabit, deleteHabit, getCurrentStreak, getDaysSince, todayISO } from '../store.js';

/**
 * Renders a single habit card.
 * @param {Object} habit - habit object from store
 * @param {Function} onUpdate - callback after any mutation
 * @returns {HTMLElement}
 */
export function createHabitCard(habit, onUpdate) {
  const card = document.createElement('div');
  card.className = `habit-card habit-card--${habit.zone}`;
  card.dataset.id = habit.id;

  const isCheckedToday = habit.checkIns.includes(todayISO());

  let metaHTML = '';
  if (habit.zone === 'present') {
    const streak = getCurrentStreak(habit);
    metaHTML = `
      <span class="habit-streak">${streak}j streak</span>
      <button class="habit-check ${isCheckedToday ? 'checked' : ''}" data-action="toggle">
        ${isCheckedToday ? '✓' : '○'}
      </button>
    `;
  } else if (habit.zone === 'past') {
    const days = getDaysSince(habit);
    metaHTML = `<span class="habit-days-since">${days}j sans</span>`;
  } else if (habit.zone === 'future') {
    metaHTML = habit.targetDate
      ? `<span class="habit-target">Objectif : ${habit.targetDate}</span>`
      : `<span class="habit-target">Pas de date cible</span>`;
  }

  const zones = ['past', 'present', 'future'];
  const currentIdx = zones.indexOf(habit.zone);
  const canMoveLeft = currentIdx > 0;
  const canMoveRight = currentIdx < zones.length - 1;

  card.innerHTML = `
    <div class="habit-card-header">
      <h3 class="habit-title">${habit.title}</h3>
      ${habit.category ? `<span class="habit-category">${habit.category}</span>` : ''}
    </div>
    <div class="habit-card-meta">${metaHTML}</div>
    <div class="habit-card-actions">
      ${canMoveLeft ? `<button class="habit-move" data-action="move-left" title="Déplacer vers ${zones[currentIdx - 1]}">←</button>` : ''}
      ${canMoveRight ? `<button class="habit-move" data-action="move-right" title="Déplacer vers ${zones[currentIdx + 1]}">→</button>` : ''}
      <button class="habit-delete" data-action="delete" title="Supprimer">×</button>
    </div>
  `;

  card.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'toggle') {
      toggleCheckIn(habit.id);
      onUpdate();
    } else if (action === 'move-left') {
      moveHabit(habit.id, zones[currentIdx - 1]);
      onUpdate();
    } else if (action === 'move-right') {
      moveHabit(habit.id, zones[currentIdx + 1]);
      onUpdate();
    } else if (action === 'delete') {
      if (confirm(`Supprimer "${habit.title}" ?`)) {
        deleteHabit(habit.id);
        onUpdate();
      }
    }
  });

  return card;
}
