// js/components/habit-card.js — V2 habit card with dots, streak bars, check rings

import { toggleCheckIn, moveHabit, deleteHabit, updateHabit, getCurrentStreak, getDaysSince, todayISO, loadData, saveData, getCategories, getScheduledToday, getWeeklyProgress, logMetric, getGraceDaysRemaining, getStackParent, getHabitsByZone } from '../store.js';
import { escapeHTML, formatDateFR, getDayLetter } from '../utils.js';
import { icon } from './icons.js';
import { showToast } from './toast.js';
import { showModal } from './modal.js';
import { createHeatmap } from './heatmap.js';
import { showCelebration } from './celebration.js';

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
  card.style.animationDelay = `${Math.min(index * 50, 300)}ms`;

  const isChecked = habit.checkIns.includes(todayISO());
  const zoneIdx = ZONES.indexOf(habit.zone);
  const canLeft = zoneIdx > 0;
  const canRight = zoneIdx < ZONES.length - 1;
  const freq = habit.frequency || { type: 'daily' };
  const isScheduled = getScheduledToday(habit);

  // --- Frequency badge ---
  let freqBadge = '';
  if (freq.type === 'specific' && freq.days) {
    freqBadge = `<span class="card-freq">${freq.days.map(d => getDayLetter(d)).join('-')}</span>`;
  } else if (freq.type === 'weekly') {
    freqBadge = `<span class="card-freq">${freq.count || 1}×/sem.</span>`;
  }

  // --- Day dots row for specific-days habits ---
  let dayDotsHTML = '';
  if (freq.type === 'specific' && freq.days && habit.zone === 'present') {
    const todayJs = new Date(todayISO() + 'T00:00:00').getDay();
    const todayIso = todayJs === 0 ? 7 : todayJs;
    dayDotsHTML = '<div class="freq-row">';
    for (let d = 1; d <= 7; d++) {
      const active = freq.days.includes(d);
      const isToday = d === todayIso;
      dayDotsHTML += `<span class="freq-dot${active ? ' active' : ''}${isToday ? ' today' : ''}">${getDayLetter(d)}</span>`;
    }
    dayDotsHTML += '</div>';
  }

  // --- Weekly progress for non-daily habits ---
  let weekProgressHTML = '';
  if (freq.type !== 'daily' && habit.zone === 'present') {
    const wp = getWeeklyProgress(habit);
    const isBonus = wp.done > wp.target;
    weekProgressHTML = `<span class="week-progress${isBonus ? ' week-progress--bonus' : ''}">${wp.done}/${wp.target} cette sem.${isBonus ? ' \u2B50' : ''}</span>`;
  }

  // --- Grace days badge ---
  let graceBadgeHTML = '';
  if (habit.zone === 'present' && (habit.graceDays ?? 2) > 0) {
    const remaining = getGraceDaysRemaining(habit);
    const total = habit.graceDays ?? 2;
    graceBadgeHTML = `<span class="grace-badge" aria-label="${remaining} sur ${total} jours de gr\u00e2ce ce mois">${icon('shield', 'i-sm')} ${remaining}/${total}</span>`;
  }

  // --- Stack link ---
  let stackHTML = '';
  if (habit.stackAfter) {
    const parent = getStackParent(habit);
    if (parent) {
      stackHTML = `<div class="card-stack">${icon('link', 'i-sm')} Apr\u00e8s : ${escapeHTML(parent.title)}</div>`;
    }
  }

  // --- Body content varies by zone ---
  let bodyHTML = '';
  if (habit.zone === 'present') {
    const streak = getCurrentStreak(habit);
    const isWeekly = freq.type === 'weekly';
    const streakUnit = isWeekly ? 's' : 'j';
    const streakTarget = isWeekly ? Math.ceil(STREAK_TARGET / 7) : STREAK_TARGET;
    const pct = Math.min(Math.round((streak / streakTarget) * 100), 100);
    const isMilestone = isWeekly ? [2, 4, 8, 12].includes(streak) : [7, 14, 21, 30].includes(streak);
    const disabledRing = !isScheduled && freq.type === 'specific';
    bodyHTML = `
      ${dayDotsHTML}
      <div class="streak-row">
        <span class="streak-label">${streak > 0 ? icon('bolt', 'i-sm') : ''}${streak}${streakUnit}${weekProgressHTML ? ` <span class="streak-sep">·</span> ${weekProgressHTML}` : ''}${graceBadgeHTML ? ` <span class="streak-sep">·</span> ${graceBadgeHTML}` : ''}</span>
        <div class="streak-track"><div class="streak-fill${isMilestone ? ' milestone' : ''}" style="width:${pct}%"></div></div>
        <span class="streak-target">${streakTarget}${streakUnit}</span>
        <button class="check-ring ${isChecked ? 'done' : ''}${disabledRing ? ' disabled' : ''}" data-action="toggle" aria-label="${disabledRing ? 'Non pr\u00e9vu aujourd\'hui \u2014 pas de check-in disponible' : (isChecked ? 'D\u00e9cocher' : 'Valider')}"${disabledRing ? ' aria-disabled="true"' : ''}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${isChecked ? '3' : '2'}" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>`;
    if (habit.metric) {
      const metricVal = (habit.metricLog || {})[todayISO()];
      bodyHTML += `<div class="card-metric">${metricVal != null ? `<span class="card-metric-val">${escapeHTML(String(metricVal))}</span>` : '<span class="card-metric-val card-metric-val--empty">\u2014</span>'} <span class="card-metric-label">${escapeHTML(habit.metric)}</span></div>`;
    }
  } else if (habit.zone === 'past') {
    const dateStr = habit.movedAt ? formatDateFR(habit.movedAt) : null;
    const days = getDaysSince(habit);
    bodyHTML = dateStr
      ? `<span class="meta-text meta-text--past">Acquise le ${dateStr} · ${days}j</span>`
      : `<span class="meta-text meta-text--past">${days} jour${days !== 1 ? 's' : ''}</span>`;
    if (habit.acquiredReflection) {
      bodyHTML += `<div class="card-reflection">${escapeHTML(habit.acquiredReflection)}</div>`;
    }
  } else {
    const dateStr = habit.targetDate ? formatDateFR(habit.targetDate) : null;
    bodyHTML = dateStr
      ? `<span class="meta-text meta-text--future">Objectif : ${dateStr}</span>`
      : `<span class="meta-text meta-text--future">Pas de date cible</span>`;
    if (habit.vision) {
      bodyHTML += `<div class="card-vision">${escapeHTML(habit.vision)}</div>`;
    }
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
  if (habit.notes) menuHTML += `<button class="card-menu-item" data-action="show-notes" role="menuitem">${icon('note', 'i-sm')} Notes</button>`;
  if (habit.zone === 'present') menuHTML += `<button class="card-menu-item" data-action="toggle-heatmap" role="menuitem">${icon('calendar', 'i-sm')} Historique</button>`;
  menuHTML += `<button class="card-menu-item" data-action="edit" role="menuitem">${icon('edit', 'i-sm')} Modifier</button>`;
  menuHTML += `<button class="card-menu-item card-menu-item--del" data-action="delete" role="menuitem">${icon('trash', 'i-sm')} Supprimer</button>`;

  card.innerHTML = `
    <div class="drag-grip" aria-hidden="true">${icon('grip', 'i-sm')}</div>
    <div class="card-top">
      <div class="card-dot"></div>
      <span class="card-title">${escapeHTML(habit.title)}</span>
      ${freqBadge}
      ${habit.category ? `<span class="card-cat">${escapeHTML(habit.category)}</span>` : ''}
      ${habit.notes ? `<button class="card-note-btn" data-action="show-notes" aria-label="Voir les notes">${icon('note', 'i-sm')}</button>` : ''}
      ${habit.zone === 'present' ? `<button class="card-heatmap-btn" data-action="toggle-heatmap" aria-label="Historique">${icon('calendar', 'i-sm')}</button>` : ''}
      <button class="card-menu-btn" data-action="menu" aria-label="Actions" aria-haspopup="true" aria-expanded="false">${icon('moreVertical', 'i-sm')}</button>
    </div>
    ${habit.why ? `<div class="card-why">${escapeHTML(habit.why)}</div>` : ''}
    ${stackHTML}
    <div class="card-body">${bodyHTML}</div>
    <div class="card-heatmap" style="display:none"></div>
    <div class="card-actions">${actionsHTML}</div>
    <div class="card-menu" role="menu">${menuHTML}</div>
    ${habit.notes ? `<div class="card-notes-popup" role="tooltip"><div class="card-notes-popup-content">${escapeHTML(habit.notes)}</div></div>` : ''}
  `;

  // --- Event delegation ---
  card.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'toggle-heatmap') {
      const heatmapEl = card.querySelector('.card-heatmap');
      if (!heatmapEl) return;
      const isOpen = heatmapEl.style.display !== 'none';
      if (isOpen) {
        heatmapEl.style.display = 'none';
        heatmapEl.innerHTML = '';
      } else {
        heatmapEl.style.display = '';
        heatmapEl.innerHTML = '';
        heatmapEl.appendChild(createHeatmap(habit));
      }
      return;
    } else if (action === 'show-notes') {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        // Mobile: show as a modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'notes-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Notes');
        overlay.innerHTML = `
          <div class="notes-modal">
            <div class="notes-modal-head">
              <span class="notes-modal-title">${icon('note', 'i-sm')} Notes</span>
              <button class="notes-modal-close" aria-label="Fermer">${icon('x', 'i-sm')}</button>
            </div>
            <div class="notes-modal-body">${escapeHTML(habit.notes || '')}</div>
          </div>
        `;
        document.body.appendChild(overlay);
        const closeModal = () => overlay.remove();
        overlay.querySelector('.notes-modal-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeModal(); });
        overlay.addEventListener('keydown', (ev) => {
          if (ev.key === 'Escape') { closeModal(); return; }
          if (ev.key !== 'Tab') return;
          const focusable = overlay.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (ev.shiftKey) {
            if (document.activeElement === first) { ev.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { ev.preventDefault(); first.focus(); }
          }
        });
        overlay.querySelector('.notes-modal-close').focus();
      } else {
        // Desktop: toggle popup
        const popup = card.querySelector('.card-notes-popup');
        if (!popup) return;
        const isOpen = popup.classList.toggle('open');
        if (isOpen) {
          const closePopup = () => {
            popup.classList.remove('open');
            document.removeEventListener('click', handleOutside, true);
            document.removeEventListener('keydown', handleEsc);
          };
          const handleOutside = (ev) => {
            if (!popup.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) closePopup();
          };
          const handleEsc = (ev) => { if (ev.key === 'Escape') closePopup(); };
          setTimeout(() => document.addEventListener('click', handleOutside, true), 0);
          document.addEventListener('keydown', handleEsc);
        }
      }
      return;
    } else if (action === 'menu') {
      const menu = card.querySelector('.card-menu');
      const isOpen = !menu.classList.contains('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      if (!isOpen) {
        menu.classList.remove('open');
      } else {
        // Auto-placement: calculate position BEFORE revealing to avoid flash
        menu.style.visibility = 'hidden';
        menu.style.top = `${btn.offsetTop}px`;
        menu.style.bottom = '';
        menu.classList.add('open');
        requestAnimationFrame(() => {
          const menuRect = menu.getBoundingClientRect();
          const bottomNavHeight = window.innerWidth <= 768 ? 70 : 0;
          if (menuRect.bottom > window.innerHeight - bottomNavHeight) {
            const overflow = menuRect.bottom - (window.innerHeight - bottomNavHeight);
            menu.style.top = `${btn.offsetTop - overflow}px`;
          }
          menu.style.visibility = '';
        });

        // Focus first menu item
        const items = menu.querySelectorAll('.card-menu-item');
        if (items.length) items[0].focus();

        const closeMenu = () => {
          menu.classList.remove('open');
          menu.style.top = '';
          menu.style.bottom = '';
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
        const handleScroll = () => closeMenu();
        window.addEventListener('scroll', handleScroll, { once: true, passive: true });
        document.querySelector('.main-wrap')?.addEventListener('scroll', handleScroll, { once: true, passive: true });
        setTimeout(() => document.addEventListener('click', handleOutsideClick, true), 0);
      }
      return;
    } else if (action === 'toggle') {
      const disabledRing = !isScheduled && freq.type === 'specific';
      if (disabledRing && !isChecked) { showToast('Non prévu aujourd\'hui'); return; }
      const wasChecked = habit.checkIns.includes(todayISO());
      toggleCheckIn(habit.id);
      if (!wasChecked && navigator.vibrate) navigator.vibrate(50);
      const ring = card.querySelector('.check-ring');
      if (ring) {
        ring.classList.remove('bounce');
        void ring.offsetWidth;
        ring.classList.add('bounce');
      }
      // Prompt for metric value after checking in
      if (!wasChecked && habit.metric) {
        const metricResult = await showModal({
          title: habit.metric,
          fields: [
            { name: 'value', label: 'Valeur du jour', type: 'text', placeholder: 'Ex : 50' }
          ],
          confirmLabel: 'Enregistrer',
        });
        if (metricResult && metricResult.value) {
          logMetric(habit.id, todayISO(), metricResult.value);
        }
      }
      // Check for celebration after checking in
      if (!wasChecked) {
        const newStreak = getCurrentStreak({ ...habit, checkIns: [...habit.checkIns, todayISO()] });
        if (newStreak > 0 && newStreak % 7 === 0) {
          setTimeout(() => showCelebration(newStreak), 300);
        }
      }
      const label = wasChecked ? 'annulé' : 'validé';
      showToast(`${habit.title} — ${label} pour le ${formatDateFR(todayISO(), { noYear: true })}`, {
        undo: () => { toggleCheckIn(habit.id); onUpdate(); }
      });
      onUpdate();
    } else if (action === 'move-left') {
      const newZone = ZONES[zoneIdx - 1];
      // Reflection prompt when acquiring a habit (present → past)
      if (habit.zone === 'present' && newZone === 'past') {
        const reflResult = await showModal({
          title: 'Habitude acquise !',
          message: `Tu t\u2019appr\u00eates \u00e0 marquer \u00ab\u202f${escapeHTML(habit.title)}\u202f\u00bb comme acquise. Prends un moment pour r\u00e9fl\u00e9chir \u00e0 ce parcours.`,
          fields: [
            { name: 'acquiredReflection', label: 'Qu\u2019est-ce que cette habitude t\u2019a apport\u00e9\u202f?', type: 'textarea', placeholder: 'Ex : Plus de calme au quotidien, meilleur sommeil, confiance en moi...' }
          ],
          confirmLabel: 'Marquer comme acquise',
        });
        if (!reflResult) return;
        if (reflResult.acquiredReflection) {
          updateHabit(habit.id, { acquiredReflection: reflResult.acquiredReflection });
        }
      }
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
      const currentFreq = habit.frequency || { type: 'daily' };
      const fields = [
        { name: 'title', label: 'Nom de l\'habitude', type: 'text', required: true, value: habit.title },
        { name: 'why', label: 'Pourquoi cette habitude ?', type: 'textarea', placeholder: 'Ex : Pour ancrer un moment de calme...', value: habit.why || '' },
        { name: 'category', label: 'Catégorie', type: 'select', options: getCategories(), value: habit.category },
        { name: 'frequency', label: 'Fréquence', type: 'frequency', value: currentFreq },
      ];
      if (habit.zone === 'present') {
        fields.push({ name: 'graceDays', label: 'Jours de gr\u00e2ce / mois', type: 'select', options: ['0', '1', '2', '3', '4'], value: String(habit.graceDays ?? 2) });
        const otherPresent = getHabitsByZone('present').filter(h => h.id !== habit.id);
        if (otherPresent.length > 0) {
          fields.push({ name: 'stackAfter', label: 'Apr\u00e8s quelle habitude ? (optionnel)', type: 'select', options: otherPresent.map(h => ({ value: h.id, label: h.title })), value: habit.stackAfter || '' });
        }
        fields.push({ name: 'metric', label: 'Suivi quotidien (optionnel)', type: 'text', placeholder: 'Ex : Nombre de pompes, minutes...', value: habit.metric || '' });
      }
      fields.push({ name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes libres...', value: habit.notes || '' });
      if (habit.zone === 'future') {
        fields.push({ name: 'targetDate', label: 'Date cible', type: 'date', value: habit.targetDate || '' });
        fields.push({ name: 'vision', label: 'Ma vision', type: 'textarea', placeholder: 'Comment je me vois quand cette habitude sera ancrée...', value: habit.vision || '' });
      } else if (habit.zone === 'past') {
        fields.push({ name: 'movedAt', label: 'Date d\'acquisition', type: 'date', value: habit.movedAt || '' });
        fields.push({ name: 'acquiredReflection', label: 'Ce que cette habitude m\'a apporté', type: 'textarea', placeholder: 'Ex : Plus de calme au quotidien...', value: habit.acquiredReflection || '' });
      }
      const result = await showModal({
        title: 'Modifier l\'habitude',
        fields,
        confirmLabel: 'Enregistrer',
      });
      if (result && result.title) {
        const updates = { title: result.title, category: result.category || '', notes: result.notes || '', why: result.why || '' };
        if (result.frequency) updates.frequency = result.frequency;
        if (result.graceDays !== undefined) updates.graceDays = parseInt(result.graceDays || '2', 10);
        if (result.stackAfter !== undefined) {
          updates.stackAfter = result.stackAfter || null;
        }
        if (result.metric !== undefined) updates.metric = result.metric || '';
        if (habit.zone === 'future') {
          updates.targetDate = result.targetDate || null;
          updates.vision = result.vision || '';
        }
        if (habit.zone === 'past') {
          updates.movedAt = result.movedAt || habit.movedAt;
          updates.acquiredReflection = result.acquiredReflection || '';
        }
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
