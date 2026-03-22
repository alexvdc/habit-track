# HabitTrack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal habit tracking web app organized around Past/Present/Future zones with daily check-ins, a stats dashboard, and weekly reflections.

**Architecture:** Single-page app (SPA) with hash-based routing, vanilla JS modules, localStorage persistence. No build step — open `index.html` and it works. Each page is a JS module that renders into a `#app` container. A central `store.js` handles all data CRUD and localStorage sync.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES modules). No dependencies. SVG for charts. UI/UX designed via `@ui-ux-pro-max` skill.

**Design document:** `docs/plans/2026-03-22-habit-track-design.md`

---

## Task 1: Data Store (`store.js`)

The store is the foundation. Every page depends on it. Build and verify it first.

**Files:**
- Create: `js/store.js`
- Create: `tests.html` (manual test harness — temporary, delete later)

**Step 1: Create `js/store.js` with data model and CRUD**

```js
// js/store.js — localStorage-backed data store

const STORAGE_KEY = 'habittrack_data';

const DEFAULT_DATA = {
  habits: [],
  reflections: [],
  settings: { exportVersion: 1 }
};

function generateId() {
  return crypto.randomUUID();
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function getMonday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// --- Core read/write ---

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const data = JSON.parse(raw);
    return {
      habits: data.habits || [],
      reflections: data.reflections || [],
      settings: { ...DEFAULT_DATA.settings, ...data.settings }
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Habits CRUD ---

function addHabit(title, zone, category = '', targetDate = null) {
  const data = loadData();
  const habit = {
    id: generateId(),
    title,
    zone,
    category,
    createdAt: todayISO(),
    movedAt: todayISO(),
    targetDate,
    checkIns: [],
    notes: ''
  };
  data.habits.push(habit);
  saveData(data);
  return habit;
}

function updateHabit(id, updates) {
  const data = loadData();
  const idx = data.habits.findIndex(h => h.id === id);
  if (idx === -1) return null;
  Object.assign(data.habits[idx], updates);
  saveData(data);
  return data.habits[idx];
}

function deleteHabit(id) {
  const data = loadData();
  data.habits = data.habits.filter(h => h.id !== id);
  saveData(data);
}

function getHabitsByZone(zone) {
  return loadData().habits.filter(h => h.zone === zone);
}

function moveHabit(id, newZone) {
  return updateHabit(id, { zone: newZone, movedAt: todayISO() });
}

function toggleCheckIn(id, date = todayISO()) {
  const data = loadData();
  const habit = data.habits.find(h => h.id === id);
  if (!habit) return null;
  const idx = habit.checkIns.indexOf(date);
  if (idx === -1) {
    habit.checkIns.push(date);
  } else {
    habit.checkIns.splice(idx, 1);
  }
  saveData(data);
  return habit;
}

// --- Streak calculation ---

function getCurrentStreak(habit) {
  if (!habit.checkIns.length) return 0;
  const sorted = [...habit.checkIns].sort().reverse();
  const today = todayISO();
  let streak = 0;
  let expected = new Date(today);

  // Allow today or yesterday as start
  if (sorted[0] !== today) {
    expected.setDate(expected.getDate() - 1);
    if (sorted[0] !== expected.toISOString().split('T')[0]) return 0;
  }

  for (const dateStr of sorted) {
    const expectedStr = expected.toISOString().split('T')[0];
    if (dateStr === expectedStr) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else if (dateStr < expectedStr) {
      break;
    }
  }
  return streak;
}

function getDaysSince(habit) {
  if (!habit.movedAt) return 0;
  const moved = new Date(habit.movedAt);
  const now = new Date(todayISO());
  return Math.floor((now - moved) / (1000 * 60 * 60 * 24));
}

// --- Reflections CRUD ---

function addReflection(whatWorked, whatBlocked, nextSteps) {
  const data = loadData();
  const reflection = {
    id: generateId(),
    weekOf: getMonday(todayISO()),
    whatWorked,
    whatBlocked,
    nextSteps,
    createdAt: todayISO()
  };
  data.reflections.push(reflection);
  saveData(data);
  return reflection;
}

function updateReflection(id, updates) {
  const data = loadData();
  const idx = data.reflections.findIndex(r => r.id === id);
  if (idx === -1) return null;
  Object.assign(data.reflections[idx], updates);
  saveData(data);
  return data.reflections[idx];
}

function getReflections() {
  return loadData().reflections.sort((a, b) => b.weekOf.localeCompare(a.weekOf));
}

function getReflectionForCurrentWeek() {
  const monday = getMonday(todayISO());
  return loadData().reflections.find(r => r.weekOf === monday) || null;
}

// --- Import / Export ---

function exportData() {
  return JSON.stringify(loadData(), null, 2);
}

function importData(jsonString) {
  const data = JSON.parse(jsonString); // throws on invalid JSON
  if (!Array.isArray(data.habits) || !Array.isArray(data.reflections)) {
    throw new Error('Invalid data format');
  }
  saveData({
    habits: data.habits,
    reflections: data.reflections,
    settings: { ...DEFAULT_DATA.settings, ...data.settings }
  });
}

function resetData() {
  saveData(structuredClone(DEFAULT_DATA));
}

// --- Stats ---

function getStats() {
  const data = loadData();
  const present = data.habits.filter(h => h.zone === 'present');
  const past = data.habits.filter(h => h.zone === 'past');
  const future = data.habits.filter(h => h.zone === 'future');

  const streaks = present.map(h => getCurrentStreak(h));
  const longestStreak = streaks.length ? Math.max(...streaks) : 0;

  // Weekly success rate: check-ins this week / (present habits * 7)
  const monday = getMonday(todayISO());
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    if (ds <= todayISO()) weekDates.push(ds);
  }
  const totalPossible = present.length * weekDates.length;
  const totalChecked = present.reduce((sum, h) =>
    sum + h.checkIns.filter(d => weekDates.includes(d)).length, 0);
  const weeklyRate = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

  // Last 30 days check-in counts per day
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayISO());
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const count = present.reduce((sum, h) => sum + (h.checkIns.includes(ds) ? 1 : 0), 0);
    last30.push({ date: ds, count });
  }

  return {
    activeCount: present.length,
    acquiredCount: past.length,
    futureCount: future.length,
    longestStreak,
    weeklyRate,
    last30
  };
}

export {
  loadData, saveData, addHabit, updateHabit, deleteHabit,
  getHabitsByZone, moveHabit, toggleCheckIn,
  getCurrentStreak, getDaysSince,
  addReflection, updateReflection, getReflections, getReflectionForCurrentWeek,
  exportData, importData, resetData, getStats,
  todayISO, getMonday
};
```

**Step 2: Create `tests.html` to verify store logic**

```html
<!DOCTYPE html>
<html><head><title>HabitTrack Tests</title></head>
<body>
<pre id="output"></pre>
<script type="module">
import * as Store from './js/store.js';

const out = document.getElementById('output');
let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; out.textContent += `PASS: ${msg}\n`; }
  else { failed++; out.textContent += `FAIL: ${msg}\n`; }
}

// Reset before tests
Store.resetData();

// Test addHabit
const h = Store.addHabit('Test habit', 'present', 'test');
assert(h.id && h.title === 'Test habit' && h.zone === 'present', 'addHabit creates habit');

// Test getHabitsByZone
assert(Store.getHabitsByZone('present').length === 1, 'getHabitsByZone returns present habits');
assert(Store.getHabitsByZone('past').length === 0, 'getHabitsByZone returns empty for past');

// Test toggleCheckIn
Store.toggleCheckIn(h.id);
let updated = Store.getHabitsByZone('present')[0];
assert(updated.checkIns.length === 1, 'toggleCheckIn adds check-in');
Store.toggleCheckIn(h.id);
updated = Store.getHabitsByZone('present')[0];
assert(updated.checkIns.length === 0, 'toggleCheckIn removes check-in on second call');

// Test moveHabit
Store.moveHabit(h.id, 'past');
assert(Store.getHabitsByZone('past').length === 1, 'moveHabit moves to past');
assert(Store.getHabitsByZone('present').length === 0, 'moveHabit removes from present');

// Test deleteHabit
Store.deleteHabit(h.id);
assert(Store.getHabitsByZone('past').length === 0, 'deleteHabit removes habit');

// Test reflections
const r = Store.addReflection('Good stuff', 'Hard stuff', 'Next steps');
assert(r.id && r.whatWorked === 'Good stuff', 'addReflection creates reflection');
assert(Store.getReflections().length === 1, 'getReflections returns list');

// Test export/import
const exported = Store.exportData();
Store.resetData();
assert(Store.getReflections().length === 0, 'resetData clears everything');
Store.importData(exported);
assert(Store.getReflections().length === 1, 'importData restores data');

// Test getStats
Store.resetData();
Store.addHabit('Active', 'present');
Store.addHabit('Done', 'past');
Store.addHabit('Soon', 'future');
const stats = Store.getStats();
assert(stats.activeCount === 1, 'getStats activeCount');
assert(stats.acquiredCount === 1, 'getStats acquiredCount');
assert(stats.futureCount === 1, 'getStats futureCount');

// Summary
Store.resetData();
out.textContent += `\n--- ${passed} passed, ${failed} failed ---\n`;
</script>
</body></html>
```

**Step 3: Open `tests.html` in browser and verify all tests pass**

Run: Open `tests.html` in a browser (or use `npx serve .` and navigate to `/tests.html`)
Expected: All assertions show PASS, 0 failed.

**Step 4: Commit**

```bash
git add js/store.js tests.html
git commit -m "feat: add data store with localStorage CRUD, import/export, stats"
```

---

## Task 2: App Shell — Router + HTML + Navigation

**Files:**
- Create: `index.html`
- Create: `js/app.js`
- Create: `js/components/nav.js`
- Create: `css/styles.css` (minimal reset only — real styling comes in Task 3)

**Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HabitTrack</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div id="root">
    <nav id="nav"></nav>
    <main id="app"></main>
  </div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 2: Create `js/components/nav.js`**

```js
// js/components/nav.js

const ROUTES = [
  { hash: '#/board', label: 'Tableau', icon: '◫' },
  { hash: '#/dashboard', label: 'Dashboard', icon: '◩' },
  { hash: '#/weekly', label: 'Réflexion', icon: '◪' },
  { hash: '#/settings', label: 'Réglages', icon: '⚙' }
];

export function renderNav(container) {
  const current = window.location.hash || '#/board';
  container.innerHTML = `
    <ul class="nav-list">
      ${ROUTES.map(r => `
        <li>
          <a href="${r.hash}" class="nav-link ${current === r.hash ? 'active' : ''}">
            <span class="nav-icon">${r.icon}</span>
            <span class="nav-label">${r.label}</span>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}
```

**Step 3: Create `js/app.js` with hash-based router**

```js
// js/app.js — SPA router and initialization

import { renderNav } from './components/nav.js';

const navEl = document.getElementById('nav');
const appEl = document.getElementById('app');

const routes = {
  '#/board': () => import('./pages/board.js').then(m => m.render(appEl)),
  '#/dashboard': () => import('./pages/dashboard.js').then(m => m.render(appEl)),
  '#/weekly': () => import('./pages/weekly.js').then(m => m.render(appEl)),
  '#/settings': () => import('./pages/settings.js').then(m => m.render(appEl))
};

function navigate() {
  const hash = window.location.hash || '#/board';
  if (!window.location.hash) window.location.hash = '#/board';
  renderNav(navEl);
  const loader = routes[hash];
  if (loader) {
    loader();
  } else {
    appEl.innerHTML = '<p>Page introuvable.</p>';
  }
}

window.addEventListener('hashchange', navigate);
navigate();
```

**Step 4: Create placeholder pages so routing works**

Create 4 stub files:

`js/pages/board.js`:
```js
export function render(container) {
  container.innerHTML = '<h1>Tableau</h1><p>Passé | Présent | Futur</p>';
}
```

`js/pages/dashboard.js`:
```js
export function render(container) {
  container.innerHTML = '<h1>Dashboard</h1><p>Stats à venir</p>';
}
```

`js/pages/weekly.js`:
```js
export function render(container) {
  container.innerHTML = '<h1>Réflexion Hebdomadaire</h1><p>Formulaire à venir</p>';
}
```

`js/pages/settings.js`:
```js
export function render(container) {
  container.innerHTML = '<h1>Réglages</h1><p>Import/Export à venir</p>';
}
```

**Step 5: Create minimal `css/styles.css`**

```css
/* css/styles.css — minimal reset, real styling in Task 3 */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
}

.nav-list {
  display: flex;
  list-style: none;
  gap: 1rem;
  padding: 1rem;
}

.nav-link {
  text-decoration: none;
  color: inherit;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
}

.nav-link.active {
  font-weight: bold;
}

#app {
  padding: 1rem;
}
```

**Step 6: Verify in browser**

Run: Open `index.html` in browser (or `npx serve .`)
Expected: Nav bar visible, clicking tabs changes the page content. URL hash updates. Default route is `#/board`.

**Step 7: Commit**

```bash
git add index.html js/app.js js/components/nav.js js/pages/board.js js/pages/dashboard.js js/pages/weekly.js js/pages/settings.js css/styles.css
git commit -m "feat: add app shell with hash router, navigation, and page stubs"
```

---

## Task 3: UI/UX Design Pass

> **REQUIRED SUB-SKILL:** Use `@ui-ux-pro-max` to design the visual theme.

**Goal:** Design the complete visual identity for HabitTrack — color system, typography, layout, component styles — adapted to the Past/Present/Future concept.

**Prompt for UI/UX Pro Max:**

> Design a web app UI theme for "HabitTrack" — a personal habit tracker organized around three temporal zones: Past (habits left behind), Present (habits being built), and Future (habits to adopt). The app has 4 pages: a 3-column board (main view), a stats dashboard, a weekly reflection journal, and settings.
>
> Requirements:
> - Vanilla CSS (no framework), CSS custom properties for theming
> - Each temporal zone needs a distinct visual identity (color, subtle styling)
> - The Present column should feel most prominent/active
> - Responsive: works on mobile (columns stack vertically)
> - Dark mode not required (can add later)
> - Warm, motivating feel — not clinical. This is a personal growth app.
> - Navigation bar at the top
> - Card-based habit display

**Files:**
- Modify: `css/styles.css` — replace with full design system
- Modify: `index.html` — add any structural HTML needed (font imports, etc.)

**Step 1: Invoke `@ui-ux-pro-max` with the prompt above**

Let the skill generate the full CSS design system with custom properties, component styles, layout rules, and responsive breakpoints.

**Step 2: Apply generated styles to `css/styles.css`**

Replace the minimal reset CSS with the complete design system output.

**Step 3: Update `index.html` if needed**

Add any font imports or structural changes the design requires.

**Step 4: Verify in browser**

Open the app and check: nav looks styled, pages have proper layout, responsive works (resize window).

**Step 5: Commit**

```bash
git add css/styles.css index.html
git commit -m "feat: add UI/UX design system with temporal zone theming"
```

---

## Task 4: Habit Card Component

**Files:**
- Create: `js/components/habit-card.js`

**Step 1: Create `js/components/habit-card.js`**

```js
// js/components/habit-card.js

import { toggleCheckIn, moveHabit, deleteHabit, getCurrentStreak, getDaysSince, todayISO } from '../store.js';

/**
 * Renders a single habit card.
 * @param {Object} habit - habit object from store
 * @param {Function} onUpdate - callback after any mutation
 * @returns {HTMLElement}
 */
export function createHabitCard(habit, onUpdate) {
  const card = document.createElement('div');
  card.className = `habit-card habit-card--${habit.zone}`;
  card.dataset.id = habit.id;

  const isCheckedToday = habit.checkIns.includes(todayISO());

  let metaHTML = '';
  if (habit.zone === 'present') {
    const streak = getCurrentStreak(habit);
    metaHTML = `
      <span class="habit-streak">${streak}j streak</span>
      <button class="habit-check ${isCheckedToday ? 'checked' : ''}" data-action="toggle">
        ${isCheckedToday ? '✓' : '○'}
      </button>
    `;
  } else if (habit.zone === 'past') {
    const days = getDaysSince(habit);
    metaHTML = `<span class="habit-days-since">${days}j sans</span>`;
  } else if (habit.zone === 'future') {
    metaHTML = habit.targetDate
      ? `<span class="habit-target">Objectif : ${habit.targetDate}</span>`
      : `<span class="habit-target">Pas de date cible</span>`;
  }

  const zones = ['past', 'present', 'future'];
  const currentIdx = zones.indexOf(habit.zone);
  const canMoveLeft = currentIdx > 0;
  const canMoveRight = currentIdx < zones.length - 1;

  card.innerHTML = `
    <div class="habit-card-header">
      <h3 class="habit-title">${habit.title}</h3>
      ${habit.category ? `<span class="habit-category">${habit.category}</span>` : ''}
    </div>
    <div class="habit-card-meta">${metaHTML}</div>
    <div class="habit-card-actions">
      ${canMoveLeft ? `<button class="habit-move" data-action="move-left" title="Déplacer vers ${zones[currentIdx - 1]}">←</button>` : ''}
      ${canMoveRight ? `<button class="habit-move" data-action="move-right" title="Déplacer vers ${zones[currentIdx + 1]}">→</button>` : ''}
      <button class="habit-delete" data-action="delete" title="Supprimer">×</button>
    </div>
  `;

  card.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'toggle') {
      toggleCheckIn(habit.id);
      onUpdate();
    } else if (action === 'move-left') {
      moveHabit(habit.id, zones[currentIdx - 1]);
      onUpdate();
    } else if (action === 'move-right') {
      moveHabit(habit.id, zones[currentIdx + 1]);
      onUpdate();
    } else if (action === 'delete') {
      if (confirm(`Supprimer "${habit.title}" ?`)) {
        deleteHabit(habit.id);
        onUpdate();
      }
    }
  });

  return card;
}
```

**Step 2: Verify card renders**

Temporarily import and test in `board.js` stub — add a test habit via console (`Store.addHabit('Test', 'present')`) and verify the card renders.

**Step 3: Commit**

```bash
git add js/components/habit-card.js
git commit -m "feat: add habit card component with check-in, move, delete"
```

---

## Task 5: Board Page (`#/board`)

**Files:**
- Modify: `js/pages/board.js`

**Step 1: Implement the board page**

```js
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

  // Add habit buttons
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
```

**Step 2: Verify in browser**

Open `#/board`. Add habits to each zone. Check: cards appear, check-in toggle works, move between zones works, delete works.

**Step 3: Commit**

```bash
git add js/pages/board.js
git commit -m "feat: implement board page with 3-column layout and habit management"
```

---

## Task 6: Chart Component

**Files:**
- Create: `js/components/chart.js`

**Step 1: Create SVG bar chart component**

```js
// js/components/chart.js

/**
 * Renders a simple SVG bar chart.
 * @param {Array<{date: string, count: number}>} data
 * @param {Object} opts — { width, height, barColor }
 * @returns {string} SVG markup
 */
export function barChart(data, opts = {}) {
  const width = opts.width || 600;
  const height = opts.height || 200;
  const barColor = opts.barColor || 'var(--color-present, #4CAF50)';
  const padding = { top: 20, right: 10, bottom: 30, left: 30 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barW = Math.max(chartW / data.length - 2, 2);

  let bars = '';
  let labels = '';

  data.forEach((d, i) => {
    const x = padding.left + (i * (chartW / data.length)) + 1;
    const barH = (d.count / maxCount) * chartH;
    const y = padding.top + chartH - barH;

    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${barColor}" rx="2">
      <title>${d.date}: ${d.count}</title>
    </rect>`;

    // Show label every 7 days
    if (i % 7 === 0) {
      const label = d.date.slice(5); // MM-DD
      labels += `<text x="${x}" y="${height - 5}" font-size="10" fill="var(--color-text-muted, #888)">${label}</text>`;
    }
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width:100%;max-width:${width}px;height:auto;">
      ${bars}
      ${labels}
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="var(--color-border, #ddd)" />
    </svg>
  `;
}
```

**Step 2: Commit**

```bash
git add js/components/chart.js
git commit -m "feat: add SVG bar chart component"
```

---

## Task 7: Dashboard Page (`#/dashboard`)

**Files:**
- Modify: `js/pages/dashboard.js`

**Step 1: Implement dashboard page**

```js
// js/pages/dashboard.js

import { getStats, getHabitsByZone } from '../store.js';
import { barChart } from '../components/chart.js';

export function render(container) {
  const stats = getStats();
  const acquired = getHabitsByZone('past');
  const upcoming = getHabitsByZone('future');

  container.innerHTML = `
    <div class="dashboard">
      <h1>Dashboard</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">${stats.activeCount}</span>
          <span class="stat-label">Habitudes actives</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.longestStreak}j</span>
          <span class="stat-label">Plus long streak</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.weeklyRate}%</span>
          <span class="stat-label">Taux cette semaine</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${stats.acquiredCount}</span>
          <span class="stat-label">Habitudes acquises</span>
        </div>
      </div>

      <section class="dashboard-section">
        <h2>Check-ins — 30 derniers jours</h2>
        <div class="chart-container">
          ${barChart(stats.last30)}
        </div>
      </section>

      ${acquired.length ? `
        <section class="dashboard-section">
          <h2>Habitudes acquises</h2>
          <ul class="acquired-list">
            ${acquired.map(h => `<li>${h.title} <small class="text-muted">depuis ${h.movedAt}</small></li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${upcoming.length ? `
        <section class="dashboard-section">
          <h2>Prochaines habitudes</h2>
          <ul class="upcoming-list">
            ${upcoming.map(h => `<li>${h.title} ${h.targetDate ? `<small class="text-muted">objectif : ${h.targetDate}</small>` : ''}</li>`).join('')}
          </ul>
        </section>
      ` : ''}
    </div>
  `;
}
```

**Step 2: Verify in browser**

Navigate to `#/dashboard`. Add some habits and check-ins first via the board. Verify stats display, chart renders, acquired/upcoming lists show.

**Step 3: Commit**

```bash
git add js/pages/dashboard.js
git commit -m "feat: implement dashboard page with stats, chart, and habit lists"
```

---

## Task 8: Weekly Reflection Page (`#/weekly`)

**Files:**
- Modify: `js/pages/weekly.js`

**Step 1: Implement weekly reflection page**

```js
// js/pages/weekly.js

import { addReflection, updateReflection, getReflections, getReflectionForCurrentWeek } from '../store.js';

export function render(container) {
  const current = getReflectionForCurrentWeek();
  const allReflections = getReflections();

  container.innerHTML = `
    <div class="weekly">
      <h1>Réflexion Hebdomadaire</h1>

      ${!current ? '<div class="weekly-reminder">La réflexion de cette semaine n\'est pas encore remplie.</div>' : ''}

      <form class="weekly-form" id="weekly-form">
        <div class="form-group">
          <label for="whatWorked">Qu'est-ce qui a bien fonctionné cette semaine ?</label>
          <textarea id="whatWorked" rows="3" placeholder="Ce qui a marché...">${current?.whatWorked || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="whatBlocked">Qu'est-ce qui a bloqué ou été difficile ?</label>
          <textarea id="whatBlocked" rows="3" placeholder="Les difficultés...">${current?.whatBlocked || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="nextSteps">Quels ajustements pour la semaine prochaine ?</label>
          <textarea id="nextSteps" rows="3" placeholder="Les prochaines étapes...">${current?.nextSteps || ''}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">${current ? 'Mettre à jour' : 'Enregistrer'}</button>
      </form>

      ${allReflections.length > 0 ? `
        <section class="weekly-history">
          <h2>Historique</h2>
          ${allReflections.map(r => `
            <details class="reflection-entry">
              <summary>Semaine du ${r.weekOf}</summary>
              <div class="reflection-content">
                <p><strong>Ce qui a marché :</strong> ${r.whatWorked}</p>
                <p><strong>Difficultés :</strong> ${r.whatBlocked}</p>
                <p><strong>Ajustements :</strong> ${r.nextSteps}</p>
              </div>
            </details>
          `).join('')}
        </section>
      ` : ''}
    </div>
  `;

  document.getElementById('weekly-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const whatWorked = document.getElementById('whatWorked').value.trim();
    const whatBlocked = document.getElementById('whatBlocked').value.trim();
    const nextSteps = document.getElementById('nextSteps').value.trim();

    if (!whatWorked && !whatBlocked && !nextSteps) return;

    if (current) {
      updateReflection(current.id, { whatWorked, whatBlocked, nextSteps });
    } else {
      addReflection(whatWorked, whatBlocked, nextSteps);
    }
    render(container);
  });
}
```

**Step 2: Verify in browser**

Navigate to `#/weekly`. Fill in the form, submit. Verify it saves, shows in history. Update it and verify update works.

**Step 3: Commit**

```bash
git add js/pages/weekly.js
git commit -m "feat: implement weekly reflection page with form and history"
```

---

## Task 9: Settings Page (`#/settings`)

**Files:**
- Modify: `js/pages/settings.js`

**Step 1: Implement settings page**

```js
// js/pages/settings.js

import { exportData, importData, resetData } from '../store.js';

export function render(container) {
  container.innerHTML = `
    <div class="settings">
      <h1>Réglages</h1>

      <section class="settings-section">
        <h2>Exporter les données</h2>
        <p>Télécharge toutes tes données au format JSON.</p>
        <button class="btn btn-primary" id="btn-export">Exporter</button>
      </section>

      <section class="settings-section">
        <h2>Importer des données</h2>
        <p>Restaure tes données depuis un fichier JSON. Attention : cela remplacera toutes les données actuelles.</p>
        <input type="file" id="file-import" accept=".json" style="display:none">
        <button class="btn btn-secondary" id="btn-import">Importer un fichier</button>
        <span id="import-status"></span>
      </section>

      <section class="settings-section settings-danger">
        <h2>Réinitialiser</h2>
        <p>Supprime toutes les données. Cette action est irréversible.</p>
        <button class="btn btn-danger" id="btn-reset">Tout supprimer</button>
      </section>
    </div>
  `;

  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habittrack-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  const fileInput = document.getElementById('file-import');
  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result);
        document.getElementById('import-status').textContent = 'Import réussi !';
        document.getElementById('import-status').className = 'status-success';
      } catch (err) {
        document.getElementById('import-status').textContent = `Erreur : ${err.message}`;
        document.getElementById('import-status').className = 'status-error';
      }
    };
    reader.readAsText(file);
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Supprimer TOUTES les données ? Cette action est irréversible.')) {
      resetData();
      render(container);
    }
  });
}
```

**Step 2: Verify in browser**

Test: Export (downloads JSON), Import (upload a previously exported file), Reset (clears data after confirmation).

**Step 3: Commit**

```bash
git add js/pages/settings.js
git commit -m "feat: implement settings page with export, import, and reset"
```

---

## Task 10: Final Integration & Polish

**Files:**
- Possibly modify: `css/styles.css`, `index.html`, various JS files

**Step 1: Full manual test pass**

Test the complete flow:
1. Open app → lands on `#/board`
2. Add habits to each zone (past, present, future)
3. Check-in a present habit
4. Move a habit from future → present → past
5. Go to Dashboard → verify stats and chart
6. Go to Weekly → fill in reflection, verify save and history
7. Go to Settings → export, reset, import
8. Resize browser to mobile width → verify responsive layout

**Step 2: Fix any issues found**

Address any bugs or visual glitches discovered during testing.

**Step 3: Delete `tests.html`**

Remove the temporary test harness.

```bash
git rm tests.html
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration, polish, and cleanup"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Data Store | `js/store.js`, `tests.html` |
| 2 | App Shell + Router + Nav | `index.html`, `js/app.js`, `js/components/nav.js`, stubs |
| 3 | UI/UX Design (`@ui-ux-pro-max`) | `css/styles.css` |
| 4 | Habit Card Component | `js/components/habit-card.js` |
| 5 | Board Page | `js/pages/board.js` |
| 6 | Chart Component | `js/components/chart.js` |
| 7 | Dashboard Page | `js/pages/dashboard.js` |
| 8 | Weekly Reflection Page | `js/pages/weekly.js` |
| 9 | Settings Page | `js/pages/settings.js` |
| 10 | Integration & Polish | Various |
