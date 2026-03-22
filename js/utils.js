// js/utils.js — shared utilities

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const MONTHS_FR_SHORT = [
  'janv.', 'fév.', 'mars', 'avril', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
];

/**
 * Formats an ISO date string to French readable format.
 * @param {string} isoDate - "2026-03-22"
 * @param {object} [opts]
 * @param {boolean} [opts.short] - Use short month
 * @param {boolean} [opts.noYear] - Omit year
 * @returns {string} "22 mars 2026" or "22 mars"
 */
export function formatDateFR(isoDate, opts = {}) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  const monthNames = opts.short ? MONTHS_FR_SHORT : MONTHS_FR;
  const monthStr = monthNames[month - 1] || '';
  const dayStr = String(day);
  return opts.noYear ? `${dayStr} ${monthStr}` : `${dayStr} ${monthStr} ${year}`;
}

/**
 * Formats a relative date in French.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatRelativeDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} jours`;
  if (diff < 14) return 'il y a 1 semaine';
  if (diff < 30) return `il y a ${Math.floor(diff / 7)} semaines`;
  if (diff < 60) return 'il y a 1 mois';
  return `il y a ${Math.floor(diff / 30)} mois`;
}
