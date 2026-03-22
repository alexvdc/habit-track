// js/components/notifications.js — PWA notification scheduling

import { getSettings } from '../store.js';

let _reminderTimeout = null;

export function initNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const settings = getSettings();
  if (!settings.reminder) return;
  if (Notification.permission !== 'granted') return;
  scheduleReminder(settings.reminderTime || '20:00');
}

export function scheduleReminder(time) {
  cancelReminder();
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // If time already passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const ms = target - now;
  _reminderTimeout = setTimeout(() => {
    _showNotification();
    // Reschedule for tomorrow
    scheduleReminder(time);
  }, ms);
}

export function cancelReminder() {
  if (_reminderTimeout) {
    clearTimeout(_reminderTimeout);
    _reminderTimeout = null;
  }
}

export async function sendTestNotification() {
  if (Notification.permission !== 'granted') {
    return false;
  }
  await _showNotification();
  return true;
}

async function _showNotification() {
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('HabitTrack', {
      body: 'As-tu coché tes habitudes aujourd\'hui ? 💪',
      icon: './icons/logo.png',
      badge: './icons/logo.png',
      tag: 'habit-reminder',
      renotify: true
    });
  } catch {
    // Fallback to regular notification if SW not available
    if (Notification.permission === 'granted') {
      new Notification('HabitTrack', {
        body: 'As-tu coché tes habitudes aujourd\'hui ? 💪',
        icon: './icons/logo.png'
      });
    }
  }
}
