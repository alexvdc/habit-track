// js/pages/board.js — Board with zones, search, filters, modal

import { getHabitsByZone, addHabit, updateHabit, getCategories } from '../store.js';
import { createHabitCard } from '../components/habit-card.js';
import { icon } from '../components/icons.js';
import { showModal } from '../components/modal.js';

const ZONES = [
  { id: 'past',    label: 'Passé',   sub: 'Habitudes laissées derrière', iconName: 'rotate',  emptyIcon: 'shield', emptyMsg: 'Les habitudes conquises apparaîtront ici' },
  { id: 'present', label: 'Présent', sub: 'En cours d\'ancrage',         iconName: 'check',   emptyIcon: 'check',  emptyMsg: 'Ajoute une habitude pour commencer à la suivre' },
  { id: 'future',  label: 'Futur',   sub: 'Objectifs à atteindre',       iconName: 'bolt',    emptyIcon: 'bolt',   emptyMsg: 'Planifie ici tes prochaines habitudes à adopter' },
];

function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function render(container) {
  const categories = getCategories();

  container.innerHTML = `
    <div class="page-header">
      <h1>Tableau</h1>
      <p>Organise tes habitudes entre Passé, Présent et Futur</p>
    </div>
    <div class="board-toolbar">
      <div class="search-wrap">
        ${icon('search')}
        <input type="text" class="search-input" id="board-search" placeholder="Rechercher une habitude..." autocomplete="off">
      </div>
      <div class="filter-chips" id="filter-chips">
        <button class="filter-chip active" data-cat="all">Tout</button>
        ${categories.map(c => `<button class="filter-chip" data-cat="${c}">${c}</button>`).join('')}
      </div>
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

  let searchQuery = '';
  let activeCategory = 'all';

  function refresh() {
    for (const zone of ZONES) {
      const cardsEl = container.querySelector(`.board-cards[data-zone="${zone.id}"]`);
      cardsEl.innerHTML = '';
      let habits = getHabitsByZone(zone.id);

      // Apply filters
      if (searchQuery) {
        const q = normalize(searchQuery);
        habits = habits.filter(h => normalize(h.title).includes(q));
      }
      if (activeCategory !== 'all') {
        habits = habits.filter(h => h.category === activeCategory);
      }

      // Update count badge
      const countEl = container.querySelector(`[data-zone-count="${zone.id}"]`);
      if (countEl) countEl.textContent = habits.length;

      if (habits.length === 0) {
        const msg = (searchQuery || activeCategory !== 'all')
          ? 'Aucun résultat pour ce filtre'
          : zone.emptyMsg;
        cardsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${icon(zone.emptyIcon)}</div>
            <p>${msg}</p>
          </div>`;
      } else {
        for (const habit of habits) {
          cardsEl.appendChild(createHabitCard(habit, () => render(container)));
        }
      }
    }
  }

  // Search input
  const searchInput = container.querySelector('#board-search');
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    refresh();
  });

  // Filter chips
  container.querySelector('#filter-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.cat;
    refresh();
  });

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
