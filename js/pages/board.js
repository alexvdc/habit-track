// js/pages/board.js — Board with zones, search, filters, modal, drag reorder

import { getHabitsByZone, addHabit, updateHabit, getCategories, moveHabit, reorderHabit, loadData, todayISO } from '../store.js';
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
  // Sauvegarder le scroll et le tab actif avant re-render
  const scrollEl = document.querySelector('.main-wrap') || document.documentElement;
  const savedScroll = scrollEl.scrollTop;
  const savedTab = container.querySelector('.board-tab--active')?.dataset.zone || 'present';

  const categories = getCategories();

  container.innerHTML = `
    <div class="page-header">
      <h1>Tableau</h1>
      <p>Organise tes habitudes entre Pass\u00e9, Pr\u00e9sent et Futur</p>
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

    <!-- Mobile zone tabs (hidden on desktop) -->
    <div class="board-tabs" role="tablist" aria-label="Zones">
      ${ZONES.map(z => `
        <button class="board-tab${z.id === 'present' ? ' board-tab--active' : ''}"
                data-zone="${z.id}"
                role="tab"
                aria-selected="${z.id === 'present' ? 'true' : 'false'}">
          ${z.label}
          <span class="board-tab-count" data-tab-count="${z.id}">0</span>
        </button>
      `).join('')}
    </div>

    <div class="board">
      ${ZONES.map(z => `
        <div class="zone zone--${z.id}${z.id === 'present' ? ' zone--tab-active' : ''}" data-zone-panel="${z.id}">
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

  function updateTabCounts() {
    ZONES.forEach(z => {
      const count = getHabitsByZone(z.id).length;
      const tabCount = container.querySelector(`[data-tab-count="${z.id}"]`);
      if (tabCount) tabCount.textContent = count;
    });
  }

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
        attachTouchReorder(cardsEl);
      }
    }
    updateTabCounts();
  }

  function attachTouchReorder(cardsEl) {
    if (window.innerWidth > 768) return;

    let dragCard = null;
    let longPressTimer = null;
    let startY = 0;
    let lastY = 0;
    let placeholder = null;

    cardsEl.addEventListener('touchstart', (e) => {
      const card = e.target.closest('.habit-card');
      if (!card) return;

      startY = e.touches[0].clientY;

      longPressTimer = setTimeout(() => {
        dragCard = card;
        card.classList.add('touch-dragging');

        placeholder = document.createElement('div');
        placeholder.className = 'reorder-line';
        placeholder.style.height = `${card.offsetHeight}px`;
        placeholder.style.opacity = '0.3';
        card.parentNode.insertBefore(placeholder, card.nextSibling);

        if (navigator.vibrate) navigator.vibrate(30);
      }, 400);
    }, { passive: true });

    cardsEl.addEventListener('touchmove', (e) => {
      if (!longPressTimer && !dragCard) return;

      const deltaY = Math.abs(e.touches[0].clientY - startY);
      if (deltaY > 8 && !dragCard) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        return;
      }
      if (!dragCard) return;

      lastY = e.touches[0].clientY;

      const cards = [...cardsEl.querySelectorAll('.habit-card:not(.touch-dragging)')];
      const targetCard = cards.find(c => {
        const rect = c.getBoundingClientRect();
        return lastY >= rect.top && lastY <= rect.bottom;
      });

      if (targetCard && placeholder) {
        const rect = targetCard.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (lastY < midpoint) {
          cardsEl.insertBefore(placeholder, targetCard);
        } else {
          cardsEl.insertBefore(placeholder, targetCard.nextSibling);
        }
      }
    }, { passive: true });

    cardsEl.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (!dragCard) return;

      let newIndex = cardsEl.querySelectorAll('.habit-card:not(.touch-dragging)').length;
      if (placeholder) {
        const placeholderIdx = [...cardsEl.children].indexOf(placeholder);
        newIndex = [...cardsEl.children]
          .slice(0, placeholderIdx)
          .filter(el => el.classList.contains('habit-card')).length;
      }

      const habitId = dragCard.dataset.id;
      dragCard.classList.remove('touch-dragging');
      if (placeholder) { placeholder.remove(); placeholder = null; }
      dragCard = null;

      reorderHabit(habitId, newIndex);
      refresh();
    }, { passive: true });

    cardsEl.addEventListener('touchcancel', () => {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (dragCard) { dragCard.classList.remove('touch-dragging'); dragCard = null; }
      if (placeholder) { placeholder.remove(); placeholder = null; }
    }, { passive: true });
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
        { name: 'why', label: 'Pourquoi cette habitude ?', type: 'textarea', placeholder: 'Ex : Pour ancrer un moment de calme avant ma journée...' },
        { name: 'category', label: 'Catégorie', type: 'select', options: getCategories() },
        { name: 'frequency', label: 'Fréquence', type: 'frequency', value: { type: 'daily' } },
      ];

      fields.push({ name: 'notes', label: 'Notes (optionnel)', type: 'textarea', placeholder: 'Obstacles anticipés, contexte, idées...' });

      if (zone === 'present') {
        fields.push({ name: 'graceDays', label: 'Jours de gr\u00e2ce / mois', type: 'select', options: ['0', '1', '2', '3', '4'], value: '2' });
        const presentHabits = getHabitsByZone('present');
        if (presentHabits.length > 0) {
          fields.push({ name: 'stackAfter', label: 'Apr\u00e8s quelle habitude ? (optionnel)', type: 'select', options: presentHabits.map(h => ({ value: h.id, label: h.title })), value: '' });
        }
        fields.push({ name: 'metric', label: 'Suivi quotidien (optionnel)', type: 'text', placeholder: 'Ex : Nombre de pompes, minutes, pages...' });
      }
      if (zone === 'future') {
        fields.push({ name: 'targetDate', label: 'Date cible', type: 'date' });
        fields.push({ name: 'vision', label: 'Ma vision', type: 'textarea', placeholder: 'Comment je me vois quand cette habitude sera ancrée...' });
      } else if (zone === 'past') {
        fields.push({ name: 'movedAt', label: 'Date d\'acquisition', type: 'date' });
        fields.push({ name: 'acquiredReflection', label: 'Ce que cette habitude m\'a apporté', type: 'textarea', placeholder: 'Ex : Plus de calme au quotidien, meilleur sommeil...' });
      }

      const result = await showModal({
        title: 'Nouvelle habitude',
        fields,
        confirmLabel: 'Ajouter',
      });

      if (result && result.title) {
        const extra = { why: result.why || '', vision: result.vision || '', metric: result.metric || '', graceDays: parseInt(result.graceDays || '2', 10), stackAfter: result.stackAfter || null, acquiredReflection: result.acquiredReflection || '', notes: result.notes || '' };
        const habit = addHabit(result.title, zone, result.category || '', result.targetDate || null, result.frequency || null, extra);
        if (result.movedAt) {
          updateHabit(habit.id, { movedAt: result.movedAt });
        }
        render(container);
      }
    });
  });

  refresh();

  // --- Mobile zone tabs ---
  const tabs = container.querySelectorAll('.board-tab');

  function switchTab(zoneId) {
    tabs.forEach(t => {
      const isActive = t.dataset.zone === zoneId;
      t.classList.toggle('board-tab--active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });
    container.querySelectorAll('.zone').forEach(z => {
      z.classList.toggle('zone--tab-active', z.dataset.zonePanel === zoneId);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.zone));

    // Navigation clavier Arrow Left / Right (pattern ARIA tablist)
    tab.addEventListener('keydown', (e) => {
      const zoneIds = ZONES.map(z => z.id);
      const idx = zoneIds.indexOf(tab.dataset.zone);
      if (e.key === 'ArrowRight' && idx < zoneIds.length - 1) {
        e.preventDefault();
        switchTab(zoneIds[idx + 1]);
        container.querySelector(`.board-tab[data-zone="${zoneIds[idx + 1]}"]`)?.focus();
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        switchTab(zoneIds[idx - 1]);
        container.querySelector(`.board-tab[data-zone="${zoneIds[idx - 1]}"]`)?.focus();
      }
    });
  });

  // Swipe horizontal entre onglets (mobile)
  const boardEl = container.querySelector('.board');
  let swipeStartX = 0;
  let swipeStartY = 0;

  boardEl.addEventListener('touchstart', (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  }, { passive: true });

  boardEl.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - swipeStartX;
    const deltaY = e.changedTouches[0].clientY - swipeStartY;

    // Swipe horizontal significatif (>50px) et plus horizontal que vertical
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    const zoneIds = ZONES.map(z => z.id);
    const activeTab = container.querySelector('.board-tab--active');
    const currentIdx = zoneIds.indexOf(activeTab?.dataset.zone);
    if (currentIdx === -1) return;

    if (deltaX < 0 && currentIdx < zoneIds.length - 1) {
      switchTab(zoneIds[currentIdx + 1]);
    } else if (deltaX > 0 && currentIdx > 0) {
      switchTab(zoneIds[currentIdx - 1]);
    }
  }, { passive: true });

  // Restaurer le tab actif
  if (savedTab !== 'present') {
    switchTab(savedTab);
  }

  // Restaurer le scroll (différé pour laisser le DOM se mettre à jour)
  requestAnimationFrame(() => {
    scrollEl.scrollTop = savedScroll;
  });

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
