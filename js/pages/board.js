// js/pages/board.js — V2 Board with zones, empty states, modal

import { getHabitsByZone, addHabit, updateHabit, getCategories } from '../store.js';
import { createHabitCard } from '../components/habit-card.js';
import { icon } from '../components/icons.js';
import { showModal } from '../components/modal.js';

const ZONES = [
  { id: 'past',    label: 'Passé',   sub: 'Habitudes laissées derrière', iconName: 'rotate',  emptyIcon: 'shield', emptyMsg: 'Les habitudes conquises apparaîtront ici' },
  { id: 'present', label: 'Présent', sub: 'En cours d\'ancrage',         iconName: 'check',   emptyIcon: 'check',  emptyMsg: 'Ajoute une habitude pour commencer à la suivre' },
  { id: 'future',  label: 'Futur',   sub: 'Objectifs à atteindre',       iconName: 'bolt',    emptyIcon: 'bolt',   emptyMsg: 'Planifie ici tes prochaines habitudes à adopter' },
];

export function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Tableau</h1>
      <p>Organise tes habitudes entre Passé, Présent et Futur</p>
    </div>
    <div class="board">
      ${ZONES.map(z => `
        <div class="zone zone--${z.id}">
          <div class="zone-head">
            <div class="zone-icon">${icon(z.iconName, 'i-lg')}</div>
            <div class="zone-info">
              <div class="zone-title">${z.label}</div>
              <div class="zone-sub">${z.sub}</div>
            </div>
            <span class="zone-count" data-zone-count="${z.id}">0</span>
          </div>
          <div class="board-cards" data-zone="${z.id}"></div>
          <button class="zone-add" data-zone="${z.id}">
            ${icon('plus', 'i-sm')} Ajouter
          </button>
        </div>
      `).join('')}
    </div>
  `;

  function refresh() {
    for (const zone of ZONES) {
      const cardsEl = container.querySelector(`.board-cards[data-zone="${zone.id}"]`);
      cardsEl.innerHTML = '';
      const habits = getHabitsByZone(zone.id);

      // Update count badge
      const countEl = container.querySelector(`[data-zone-count="${zone.id}"]`);
      if (countEl) countEl.textContent = habits.length;

      if (habits.length === 0) {
        cardsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${icon(zone.emptyIcon)}</div>
            <p>${zone.emptyMsg}</p>
          </div>`;
      } else {
        for (const habit of habits) {
          cardsEl.appendChild(createHabitCard(habit, () => render(container)));
        }
      }
    }
  }

  // Add buttons
  container.querySelectorAll('.zone-add').forEach(btn => {
    btn.addEventListener('click', async () => {
      const zone = btn.dataset.zone;
      const fields = [
        { name: 'title', label: 'Nom de l\'habitude', type: 'text', required: true, placeholder: 'Ex : Méditer 10 min' },
        { name: 'category', label: 'Catégorie', type: 'select', options: getCategories() },
      ];

      if (zone === 'future') {
        fields.push({ name: 'targetDate', label: 'Date cible', type: 'date' });
      } else if (zone === 'past') {
        fields.push({ name: 'movedAt', label: 'Date d\'acquisition', type: 'date' });
      }

      const result = await showModal({
        title: 'Nouvelle habitude',
        fields,
        confirmLabel: 'Ajouter',
      });

      if (result && result.title) {
        const habit = addHabit(result.title, zone, result.category || '', result.targetDate || null);
        if (result.movedAt) {
          updateHabit(habit.id, { movedAt: result.movedAt });
        }
        render(container);
      }
    });
  });

  refresh();
}
