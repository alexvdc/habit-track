// js/components/habit-card.js — V2 habit card with dots, streak bars, check rings

import { toggleCheckIn, moveHabit, deleteHabit, updateHabit, getCurrentStreak, getDaysSince, todayISO, loadData, saveData, getCategories } from '../store.js';
import { escapeHTML, formatDateFR } from '../utils.js';
import { icon } from './icons.js';
import { showToast } from './toast.js';
import { showModal } from './modal.js';

const ZONES = ['past', 'present', 'future'];
const ZONE_LABELS = { past: 'Passé', present: 'Présent', future: 'Futur' };
const STREAK_TARGET = 30;

/**
 * Creates and returns a habit card DOM element.
 * @param {Object} habit
 * @param {Function} onUpdate - called after any data mutation
 * @returns {HTMLElement}
 */
export function createHabitCard(habit, onUpdate, index = 0) {
  const card = document.createElement('div');
  card.className = `habit-card habit-card--${habit.zone}`;
  card.dataset.id = habit.id;
  card.setAttribute('draggable', 'true');
  card.addEventListener('dragstart', (e) => {
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', habit.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });
  card.classList.add('card-stagger');
  card.style.animationDelay = `${index * 50}ms`;

  const isChecked = habit.checkIns.includes(todayISO());
  const zoneIdx = ZONES.indexOf(habit.zone);
  const canLeft = zoneIdx > 0;
  const canRight = zoneIdx < ZONES.length - 1;

  // --- Body content varies by zone ---
  let bodyHTML = '';
  if (habit.zone === 'present') {
    const streak = getCurrentStreak(habit);
    const pct = Math.min(Math.round((streak / STREAK_TARGET) * 100), 100);
    const isMilestone = [7, 14, 21, 30].includes(streak);
    bodyHTML = `
      <div class="streak-row">
        <span class="streak-label">${streak > 0 ? icon('bolt', 'i-sm') : ''}${streak}j</span>
        <div class="streak-track"><div class="streak-fill${isMilestone ? ' milestone' : ''}" style="width:${pct}%"></div></div>
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
  if (canLeft) actionsHTML += `<button class="card-btn" data-action="move-left" aria-label="Déplacer vers ${ZONE_LABELS[ZONES[zoneIdx - 1]]}">${icon('arrowLeft', 'i-sm')}</button>`;
  if (canRight) actionsHTML += `<button class="card-btn" data-action="move-right" aria-label="Déplacer vers ${ZONE_LABELS[ZONES[zoneIdx + 1]]}">${icon('arrowRight', 'i-sm')}</button>`;
  actionsHTML += `<button class="card-btn" data-action="edit" aria-label="Modifier">${icon('edit', 'i-sm')}</button>`;
  actionsHTML += `<button class="card-btn card-btn--del" data-action="delete" aria-label="Supprimer">${icon('trash', 'i-sm')}</button>`;

  // --- Mobile menu items ---
  let menuHTML = '';
  if (canLeft) menuHTML += `<button class="card-menu-item" data-action="move-left" role="menuitem">${icon('chevronUp', 'i-sm')} ${ZONE_LABELS[ZONES[zoneIdx - 1]]}</button>`;
  if (canRight) menuHTML += `<button class="card-menu-item" data-action="move-right" role="menuitem">${icon('chevronDown', 'i-sm')} ${ZONE_LABELS[ZONES[zoneIdx + 1]]}</button>`;
  menuHTML += `<button class="card-menu-item" data-action="edit" role="menuitem">${icon('edit', 'i-sm')} Modifier</button>`;
  menuHTML += `<button class="card-menu-item card-menu-item--del" data-action="delete" role="menuitem">${icon('trash', 'i-sm')} Supprimer</button>`;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-dot"></div>
      <span class="card-title">${escapeHTML(habit.title)}</span>
      ${habit.category ? `<span class="card-cat">${escapeHTML(habit.category)}</span>` : ''}
      ${habit.notes ? `<span class="card-note-indicator" title="Contient des notes">${icon('note', 'i-sm')}</span>` : ''}
      <button class="card-menu-btn" data-action="menu" aria-label="Actions" aria-haspopup="true" aria-expanded="false">${icon('moreVertical', 'i-sm')}</button>
    </div>
    <div class="card-body">${bodyHTML}</div>
    <div class="card-actions">${actionsHTML}</div>
    <div class="card-menu" role="menu">${menuHTML}</div>
  `;

  // --- Event delegation ---
  card.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'menu') {
      const menu = card.querySelector('.card-menu');
      const isOpen = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        // Focus first menu item
        const items = menu.querySelectorAll('.card-menu-item');
        if (items.length) items[0].focus();

        const closeMenu = () => {
          menu.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          document.removeEventListener('click', handleOutsideClick, true);
          menu.removeEventListener('keydown', handleMenuKeys);
          btn.focus();
        };

        const handleOutsideClick = (ev) => {
          if (!menu.contains(ev.target) && ev.target !== btn) {
            closeMenu();
          }
        };

        const handleMenuKeys = (ev) => {
          if (ev.key === 'Escape') {
            ev.stopPropagation();
            closeMenu();
          } else if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            const focused = menu.querySelector('.card-menu-item:focus');
            if (focused && focused.nextElementSibling) focused.nextElementSibling.focus();
          } else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            const focused = menu.querySelector('.card-menu-item:focus');
            if (focused && focused.previousElementSibling) focused.previousElementSibling.focus();
          } else if (ev.key === 'Tab') {
            ev.preventDefault();
            closeMenu();
          }
        };

        menu.addEventListener('keydown', handleMenuKeys);
        setTimeout(() => document.addEventListener('click', handleOutsideClick, true), 0);
      }
      return;
    } else if (action === 'toggle') {
      const wasChecked = habit.checkIns.includes(todayISO());
      toggleCheckIn(habit.id);
      const ring = card.querySelector('.check-ring');
      if (ring) {
        ring.classList.remove('bounce');
        void ring.offsetWidth;
        ring.classList.add('bounce');
      }
      const label = wasChecked ? 'annulé' : 'validé';
      showToast(`${habit.title} — ${label} pour le ${formatDateFR(todayISO(), { noYear: true })}`, {
        undo: () => { toggleCheckIn(habit.id); onUpdate(); }
      });
      onUpdate();
    } else if (action === 'move-left') {
      const newZone = ZONES[zoneIdx - 1];
      moveHabit(habit.id, newZone);
      showToast(`${habit.title} déplacé vers ${ZONE_LABELS[newZone]}`, {
        undo: () => { moveHabit(habit.id, habit.zone); onUpdate(); }
      });
      onUpdate();
    } else if (action === 'move-right') {
      const newZone = ZONES[zoneIdx + 1];
      moveHabit(habit.id, newZone);
      showToast(`${habit.title} déplacé vers ${ZONE_LABELS[newZone]}`, {
        undo: () => { moveHabit(habit.id, habit.zone); onUpdate(); }
      });
      onUpdate();
    } else if (action === 'edit') {
      const fields = [
        { name: 'title', label: 'Nom de l\'habitude', type: 'text', required: true, value: habit.title },
        { name: 'category', label: 'Catégorie', type: 'select', options: getCategories(), value: habit.category },
      ];
      fields.push({ name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes libres...', value: habit.notes || '' });
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
        const updates = { title: result.title, category: result.category || '', notes: result.notes || '' };
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
