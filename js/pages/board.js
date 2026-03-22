// js/pages/board.js

import { getHabitsByZone, addHabit } from '../store.js';
import { createHabitCard } from '../components/habit-card.js';

const ZONES = [
  { id: 'past', label: 'Passé', sublabel: 'Habitudes laissées derrière' },
  { id: 'present', label: 'Présent', sublabel: 'En cours d\'ancrage' },
  { id: 'future', label: 'Futur', sublabel: 'Objectifs à atteindre' }
];

export function render(container) {
  container.innerHTML = `
    <div class="board">
      ${ZONES.map(z => `
        <div class="board-column board-column--${z.id}">
          <div class="board-column-header">
            <h2>${z.label}</h2>
            <p class="board-column-sublabel">${z.sublabel}</p>
          </div>
          <div class="board-cards" data-zone="${z.id}"></div>
          <button class="board-add" data-zone="${z.id}">+ Ajouter</button>
        </div>
      `).join('')}
    </div>
  `;

  function refresh() {
    for (const zone of ZONES) {
      const cardsEl = container.querySelector(`.board-cards[data-zone="${zone.id}"]`);
      cardsEl.innerHTML = '';
      const habits = getHabitsByZone(zone.id);
      for (const habit of habits) {
        cardsEl.appendChild(createHabitCard(habit, () => render(container)));
      }
    }
  }

  container.querySelectorAll('.board-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const zone = btn.dataset.zone;
      const title = prompt('Nom de l\'habitude :');
      if (!title?.trim()) return;

      let targetDate = null;
      if (zone === 'future') {
        targetDate = prompt('Date cible (YYYY-MM-DD) ou laisser vide :') || null;
      }

      addHabit(title.trim(), zone, '', targetDate);
      render(container);
    });
  });

  refresh();
}
