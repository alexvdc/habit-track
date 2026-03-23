// js/components/heatmap.js — Mini heatmap (90 days) for a habit

import { todayISO, _formatDate, isScheduledOn } from '../store.js';
import { formatDateFR } from '../utils.js';

/**
 * Create a 90-day heatmap grid for a habit.
 * @param {object} habit
 * @returns {HTMLElement}
 */
export function createHeatmap(habit) {
  const container = document.createElement('div');
  container.className = 'heatmap';

  const checkSet = new Set(habit.checkIns || []);
  const today = todayISO();

  // Build 91 days (13 weeks) ending today
  const days = [];
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - i);
    days.push(_formatDate(d));
  }

  // Align to start on Monday: pad beginning
  const firstDay = new Date(days[0] + 'T00:00:00');
  const firstDayOfWeek = firstDay.getDay(); // 0=Sun
  const padStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // days to pad before Monday

  // Day labels (left column)
  const dayLabels = ['L', '', 'M', '', 'V', '', ''];
  const labelsCol = document.createElement('div');
  labelsCol.className = 'heatmap-labels';
  dayLabels.forEach(label => {
    const span = document.createElement('span');
    span.className = 'heatmap-day-label';
    span.textContent = label;
    labelsCol.appendChild(span);
  });
  container.appendChild(labelsCol);

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  // Pad cells
  for (let p = 0; p < padStart; p++) {
    const cell = document.createElement('span');
    cell.className = 'heatmap-cell heatmap-empty';
    grid.appendChild(cell);
  }

  // Build grace day dates set
  const graceDayDates = new Set();
  if ((habit.graceDays ?? 2) > 0) {
    const monthsMap = {};
    for (const dateStr of days) {
      if (dateStr > today) break;
      if (!isScheduledOn(habit, dateStr)) continue;
      if (checkSet.has(dateStr)) continue;
      const ym = dateStr.slice(0, 7);
      if (!monthsMap[ym]) monthsMap[ym] = 0;
      if (monthsMap[ym] < (habit.graceDays ?? 2)) {
        graceDayDates.add(dateStr);
        monthsMap[ym]++;
      }
    }
  }

  // Data cells
  for (const dateStr of days) {
    const cell = document.createElement('span');
    const checked = checkSet.has(dateStr);
    const scheduled = isScheduledOn(habit, dateStr);
    const isToday = dateStr === today;
    const isFuture = dateStr > today;

    let level = 'l0';
    if (isFuture) {
      level = 'future';
    } else if (checked) {
      level = 'l2';
    } else if (!scheduled) {
      level = 'off';
    } else if (graceDayDates.has(dateStr)) {
      level = 'grace';
    }

    const graceLabel = graceDayDates.has(dateStr) ? ' \u2014 jour de gr\u00e2ce' : '';
    cell.className = `heatmap-cell heatmap-${level}${isToday ? ' heatmap-today' : ''}`;
    cell.title = `${formatDateFR(dateStr, { short: true, noYear: true })}${checked ? ' \u2014 \u2713' : graceLabel || (scheduled ? '' : ' \u2014 non pr\u00e9vu')}`;
    grid.appendChild(cell);
  }

  container.appendChild(grid);
  return container;
}
