// js/components/toast.js — Toast notifications with optional undo

const DISMISS_MS = 4000;

/**
 * Show a toast notification.
 * @param {string} message
 * @param {object} [opts]
 * @param {Function} [opts.undo] - If provided, shows an "Annuler" link
 */
export function showToast(message, opts = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const checkSpan = `<span class="toast-check">\u2713</span>`;
  const undoHTML = opts.undo
    ? `<button class="toast-undo">Annuler</button>`
    : '';

  toast.innerHTML = `${checkSpan} ${message} ${undoHTML}`;
  container.appendChild(toast);

  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    toast.classList.add('toast--exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  if (opts.undo) {
    toast.querySelector('.toast-undo').addEventListener('click', () => {
      opts.undo();
      dismiss();
    });
  }

  setTimeout(dismiss, DISMISS_MS);
}
