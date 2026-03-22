// js/store.js — localStorage-backed data store for HabitTrack

const STORAGE_KEY = 'habittrack_data';

const DEFAULT_DATA = {
  habits: [],
  reflections: [],
  settings: {
    exportVersion: 1,
    theme: 'teal',
    reminder: true,
    streak30: true,
    categories: ['bien-être', 'sport', 'développement', 'santé', 'technique', 'créativité']
  }
};

function generateId() {
  return crypto.randomUUID();
}

function _formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return _formatDate(new Date());
}

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return _formatDate(d);
}

// --- Core read/write ---

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const data = JSON.parse(raw);
    const result = {
      habits: data.habits || [],
      reflections: data.reflections || [],
      settings: { ...DEFAULT_DATA.settings, ...data.settings }
    };

    // Migrate legacy categories key into unified store
    const legacyCats = localStorage.getItem('habittrack_categories');
    if (legacyCats) {
      try {
        const parsed = JSON.parse(legacyCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          result.settings.categories = parsed;
        }
      } catch {}
      localStorage.removeItem('habittrack_categories');
      saveData(result);
    }

    return result;
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
  if (!habit.checkIns || !habit.checkIns.length) return 0;
  const sorted = [...habit.checkIns].sort().reverse();
  const today = todayISO();
  let streak = 0;
  let expected = new Date(today + 'T00:00:00');

  // Allow today or yesterday as the start of a streak
  if (sorted[0] !== today) {
    expected.setDate(expected.getDate() - 1);
    if (sorted[0] !== _formatDate(expected)) return 0;
  }

  for (const dateStr of sorted) {
    const expectedStr = _formatDate(expected);
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
  const moved = new Date(habit.movedAt + 'T00:00:00');
  const now = new Date(todayISO() + 'T00:00:00');
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

// --- Settings ---

function getSettings() {
  return loadData().settings;
}

function updateSettings(updates) {
  const data = loadData();
  data.settings = { ...data.settings, ...updates };
  saveData(data);
  return data.settings;
}

function getCategories() {
  return loadData().settings.categories || DEFAULT_DATA.settings.categories;
}

// --- Stats ---

function getStats() {
  const data = loadData();
  const present = data.habits.filter(h => h.zone === 'present');
  const past = data.habits.filter(h => h.zone === 'past');
  const future = data.habits.filter(h => h.zone === 'future');

  const streaks = present.map(h => getCurrentStreak(h));
  const longestStreak = streaks.length ? Math.max(...streaks) : 0;

  // Weekly success rate: check-ins this week / (present habits * days so far this week)
  const monday = getMonday(todayISO());
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const ds = _formatDate(d);
    if (ds <= todayISO()) weekDates.push(ds);
  }
  const totalPossible = present.length * weekDates.length;
  const totalChecked = present.reduce((sum, h) =>
    sum + h.checkIns.filter(d => weekDates.includes(d)).length, 0);
  const weeklyRate = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

  // Last 30 days check-in counts per day (across all habits, not just present)
  const allHabits = data.habits;
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayISO() + 'T00:00:00');
    d.setDate(d.getDate() - i);
    const ds = _formatDate(d);
    const count = allHabits.reduce((sum, h) => sum + (h.checkIns.includes(ds) ? 1 : 0), 0);
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
  getSettings, updateSettings, getCategories,
  todayISO, getMonday
};
