// js/components/celebration.js — Streak milestone celebration

import { getSettings } from '../store.js';

const CONFETTI_COLORS = ['#0D9488', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#10B981'];

/**
 * Show a celebration overlay for streak milestones (every 7 days).
 * @param {number} streak - Current streak value
 */
export function showCelebration(streak) {
  const settings = getSettings();
  if (!settings.celebrations) return;
  if (streak === 0 || streak % 7 !== 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  if (prefersReducedMotion) {
    overlay.innerHTML = `
      <div class="celebration-badge">
        <span class="celebration-number">${streak}</span>
        <span class="celebration-text">jours consécutifs !</span>
      </div>
    `;
  } else {
    // Generate confetti particles
    let confettiHTML = '';
    for (let i = 0; i < 30; i++) {
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.8;
      const size = 6 + Math.random() * 6;
      const rotation = Math.random() * 360;
      confettiHTML += `<span class="confetti" style="left:${left}%;animation-delay:${delay}s;background:${color};width:${size}px;height:${size}px;transform:rotate(${rotation}deg)"></span>`;
    }

    overlay.innerHTML = `
      <div class="celebration-confetti">${confettiHTML}</div>
      <div class="celebration-badge celebration-badge--animated">
        <span class="celebration-number">${streak}</span>
        <span class="celebration-text">jours consécutifs !</span>
      </div>
    `;
  }

  document.body.appendChild(overlay);

  // Auto-dismiss
  const dismiss = () => overlay.remove();
  overlay.addEventListener('click', dismiss);
  setTimeout(dismiss, 2500);
}
