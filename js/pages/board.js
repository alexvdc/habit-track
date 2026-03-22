// js/pages/board.js — Board with zones, search, filters, modal, drag reorder

import { getHabitsByZone, addHabit, updateHabit, getCategories, moveHabit, reorderHabit, loadData } from '../store.js';
import { createHabitCard } from '../components/habit-card.js';
import { icon } from '../components/icons.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

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
        <input type="text" class="search-input" id="board-search" placeholder="Rechercher une habitude..." autocomplete="off" aria-label="Rechercher une habitude">
      </div>
      <div class="filter-chips" id="filter-chips" role="radiogroup" aria-label="Filtrer par catégorie">
        <button class="filter-chip active" data-cat="all" role="radio" aria-checked="true">Tout</button>
        ${categories.map(c => `<button class="filter-chip" data-cat="${c}" role="radio" aria-checked="false">${c}</button>`).join('')}
      </div>
      <select class="filter-select" id="filter-select">
        <option value="all">Toutes les catégories</option>
        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
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
          <div class="drop-indicator">Déposer ici</div>
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
        habits.forEach((habit, i) => {
          cardsEl.appendChild(createHabitCard(habit, () => render(container), i));
        });
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
    container.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-checked', 'false');
    });
    chip.classList.add('active');
    chip.setAttribute('aria-checked', 'true');
    activeCategory = chip.dataset.cat;
    refresh();
  });

  // Mobile filter select
  const filterSelect = container.querySelector('#filter-select');
  filterSelect.addEventListener('change', () => {
    activeCategory = filterSelect.value;
    container.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-checked', 'false');
    });
    const matchChip = container.querySelector(`.filter-chip[data-cat="${activeCategory}"]`);
    if (matchChip) {
      matchChip.classList.add('active');
      matchChip.setAttribute('aria-checked', 'true');
    }
    refresh();
  });

  // Drag & drop (cross-zone move + intra-zone reorder)
  container.querySelectorAll('.zone').forEach(zoneEl => {
    const cardsEl = zoneEl.querySelector('.board-cards');
    const zoneId = cardsEl.dataset.zone;

    zoneEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zoneEl.classList.add('drag-over');

      // Show reorder indicator between cards
      const cards = [...cardsEl.querySelectorAll('.habit-card:not(.dragging)')];
      const afterCard = _getDragAfterElement(cardsEl, e.clientY);
      const indicator = cardsEl.querySelector('.reorder-line');
      if (indicator) indicator.remove();

      // Only show reorder line for same-zone drags
      const dragId = _currentDragId;
      if (dragId) {
        const habit = loadData().habits.find(h => h.id === dragId);
        if (habit && habit.zone === zoneId && cards.length > 0) {
          const line = document.createElement('div');
          line.className = 'reorder-line';
          if (afterCard) {
            cardsEl.insertBefore(line, afterCard);
          } else {
            cardsEl.appendChild(line);
          }
        }
      }
    });

    zoneEl.addEventListener('dragleave', (e) => {
      if (!zoneEl.contains(e.relatedTarget)) {
        zoneEl.classList.remove('drag-over');
        const indicator = cardsEl.querySelector('.reorder-line');
        if (indicator) indicator.remove();
      }
    });

    zoneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      zoneEl.classList.remove('drag-over');
      const indicator = cardsEl.querySelector('.reorder-line');
      if (indicator) indicator.remove();

      const habitId = e.dataTransfer.getData('text/plain');
      if (!habitId) return;

      const habit = loadData().habits.find(h => h.id === habitId);
      if (!habit) return;

      if (habit.zone === zoneId) {
        // Intra-zone reorder
        const cards = [...cardsEl.querySelectorAll('.habit-card:not(.dragging)')];
        const afterCard = _getDragAfterElement(cardsEl, e.clientY);
        let newIndex;
        if (!afterCard) {
          newIndex = cards.length;
        } else {
          newIndex = cards.indexOf(afterCard);
        }
        reorderHabit(habitId, newIndex);
        refresh();
      } else {
        // Cross-zone move
        const oldZone = habit.zone;
        const zoneLabel = ZONES.find(z => z.id === zoneId)?.label || zoneId;
        moveHabit(habitId, zoneId);
        showToast(`${habit.title} déplacé vers ${zoneLabel}`, {
          undo: () => { moveHabit(habitId, oldZone); refresh(); }
        });
        refresh();
      }
    });
  });

  // Track current drag id for same-zone detection
  let _currentDragId = null;
  container.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.habit-card');
    if (card) _currentDragId = card.dataset.id;
  });
  container.addEventListener('dragend', () => {
    _currentDragId = null;
    container.querySelectorAll('.reorder-line').forEach(el => el.remove());
  });

  // Add buttons
  container.querySelectorAll('.zone-add').forEach(btn => {
    btn.addEventListener('click', async () => {
      const zone = btn.dataset.zone;
      const fields = [
        { name: 'title', label: 'Nom de l\'habitude', type: 'text', required: true, placeholder: 'Ex : Méditer 10 min' },
        { name: 'category', label: 'Catégorie', type: 'select', options: getCategories() },
        { name: 'frequency', label: 'Fréquence', type: 'frequency', value: { type: 'daily' } },
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
        const habit = addHabit(result.title, zone, result.category || '', result.targetDate || null, result.frequency || null);
        if (result.movedAt) {
          updateHabit(habit.id, { movedAt: result.movedAt });
        }
        render(container);
      }
    });
  });

  refresh();
}

function _getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.habit-card:not(.dragging)')];
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element || null;
}
