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
    reminderTime: '20:00',
    celebrations: true,
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

function addHabit(title, zone, category = '', targetDate = null, frequency = null) {
  const data = loadData();
  const zoneHabits = data.habits.filter(h => h.zone === zone);
  const maxOrder = zoneHabits.reduce((max, h) => Math.max(max, h.order ?? 0), -1);
  const habit = {
    id: generateId(),
    title,
    zone,
    category,
    createdAt: todayISO(),
    movedAt: todayISO(),
    targetDate,
    frequency: frequency || { type: 'daily' },
    order: maxOrder + 1,
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
  return loadData().habits.filter(h => h.zone === zone)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function moveHabit(id, newZone) {
  const data = loadData();
  const zoneHabits = data.habits.filter(h => h.zone === newZone);
  const maxOrder = zoneHabits.reduce((max, h) => Math.max(max, h.order ?? 0), -1);
  return updateHabit(id, { zone: newZone, movedAt: todayISO(), order: maxOrder + 1 });
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

// --- Frequency helpers ---

function getScheduledToday(habit) {
  const freq = habit.frequency || { type: 'daily' };
  if (freq.type === 'daily') return true;
  if (freq.type === 'specific') {
    const dayIndex = new Date(todayISO() + 'T00:00:00').getDay(); // 0=Sun
    const isoDay = dayIndex === 0 ? 7 : dayIndex; // 1=Mon..7=Sun
    return (freq.days || []).includes(isoDay);
  }
  // 'weekly' — always "schedulable", we just count per week
  return true;
}

function isScheduledOn(habit, dateStr) {
  const freq = habit.frequency || { type: 'daily' };
  if (freq.type === 'daily') return true;
  if (freq.type === 'specific') {
    const dayIndex = new Date(dateStr + 'T00:00:00').getDay();
    const isoDay = dayIndex === 0 ? 7 : dayIndex;
    return (freq.days || []).includes(isoDay);
  }
  return true;
}

function getWeeklyProgress(habit) {
  const freq = habit.frequency || { type: 'daily' };
  const monday = getMonday(todayISO());
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const ds = _formatDate(d);
    if (ds <= todayISO()) weekDates.push(ds);
  }
  const done = weekDates.filter(d => (habit.checkIns || []).includes(d)).length;

  if (freq.type === 'specific') {
    const target = (freq.days || []).length;
    return { done, target };
  }
  if (freq.type === 'weekly') {
    return { done, target: freq.count || 1 };
  }
  // daily
  return { done, target: weekDates.length };
}

// --- Streak calculation ---

function getCurrentStreak(habit) {
  if (!habit.checkIns || !habit.checkIns.length) return 0;
  const freq = habit.frequency || { type: 'daily' };

  if (freq.type === 'weekly') {
    return _getWeeklyStreak(habit);
  }

  // For daily & specific-days: count consecutive scheduled days checked
  const checkSet = new Set(habit.checkIns);
  const today = todayISO();
  let streak = 0;
  let cursor = new Date(today + 'T00:00:00');

  // Allow today to be unchecked if it's still today
  if (!checkSet.has(today)) {
    if (freq.type === 'specific' && !isScheduledOn(habit, today)) {
      // Skip today if not scheduled
    } else {
      // Not checked today — start from yesterday
      cursor.setDate(cursor.getDate() - 1);
      // If yesterday also wasn't checked (and was scheduled), streak is 0
      const yesterday = _formatDate(cursor);
      if (isScheduledOn(habit, yesterday) && !checkSet.has(yesterday)) return 0;
    }
  }

  for (let i = 0; i < 365; i++) {
    const ds = _formatDate(cursor);
    if (isScheduledOn(habit, ds)) {
      if (checkSet.has(ds)) {
        streak++;
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function _getWeeklyStreak(habit) {
  const freq = habit.frequency || { type: 'weekly', count: 1 };
  const target = freq.count || 1;
  const checkSet = new Set(habit.checkIns);
  let streak = 0;

  // Start from current week, go backwards
  let weekMonday = new Date(getMonday(todayISO()) + 'T00:00:00');

  for (let w = 0; w < 52; w++) {
    const mondayStr = _formatDate(weekMonday);
    let weekCount = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekMonday);
      day.setDate(day.getDate() + d);
      const ds = _formatDate(day);
      if (ds > todayISO()) break; // don't count future days
      if (checkSet.has(ds)) weekCount++;
    }
    // Current week in progress: if target met, count it; if not, skip (don't break)
    if (w === 0 && weekCount < target) {
      weekMonday.setDate(weekMonday.getDate() - 7);
      continue;
    }
    if (weekCount >= target) {
      streak++;
    } else {
      break;
    }
    weekMonday.setDate(weekMonday.getDate() - 7);
  }
  return streak;
}

function getDaysSince(habit) {
  if (!habit.movedAt) return 0;
  const moved = new Date(habit.movedAt + 'T00:00:00');
  const now = new Date(todayISO() + 'T00:00:00');
  return Math.floor((now - moved) / (1000 * 60 * 60 * 24));
}

function reorderHabit(id, newIndex) {
  const data = loadData();
  const habit = data.habits.find(h => h.id === id);
  if (!habit) return;
  const zone = habit.zone;
  const zoneHabits = data.habits.filter(h => h.zone === zone).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  // Remove the habit from current position
  const filtered = zoneHabits.filter(h => h.id !== id);
  // Insert at new position
  filtered.splice(newIndex, 0, habit);
  // Reassign order values
  filtered.forEach((h, i) => {
    const idx = data.habits.findIndex(dh => dh.id === h.id);
    if (idx !== -1) data.habits[idx].order = i;
  });
  saveData(data);
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

  // Weekly success rate: frequency-aware
  const monday = getMonday(todayISO());
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const ds = _formatDate(d);
    if (ds <= todayISO()) weekDates.push(ds);
  }
  let totalPossible = 0;
  let totalChecked = 0;
  for (const h of present) {
    const freq = h.frequency || { type: 'daily' };
    if (freq.type === 'weekly') {
      totalPossible += freq.count || 1;
      totalChecked += weekDates.filter(d => h.checkIns.includes(d)).length;
    } else {
      const scheduled = weekDates.filter(d => isScheduledOn(h, d));
      totalPossible += scheduled.length;
      totalChecked += scheduled.filter(d => h.checkIns.includes(d)).length;
    }
  }
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
  getHabitsByZone, moveHabit, toggleCheckIn, reorderHabit,
  getCurrentStreak, getDaysSince,
  getScheduledToday, isScheduledOn, getWeeklyProgress,
  addReflection, updateReflection, getReflections, getReflectionForCurrentWeek,
  exportData, importData, resetData, getStats,
  getSettings, updateSettings, getCategories,
  todayISO, getMonday, _formatDate
};
