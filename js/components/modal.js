// js/components/modal.js — Reusable modal (replaces prompt/confirm)

/**
 * Show a modal dialog.
 * @param {object} options
 * @param {string} options.title
 * @param {Array<{name:string, label:string, type:string, required?:boolean, options?:string[], placeholder?:string, value?:string}>} [options.fields]
 * @param {string} [options.message] - Simple message (for confirm-style modals)
 * @param {string} [options.confirmLabel] - Label for confirm button (default "Confirmer")
 * @param {string} [options.cancelLabel] - Label for cancel button (default "Annuler")
 * @param {boolean} [options.danger] - Use danger styling for confirm
 * @returns {Promise<object|null>} Resolved with field values or null if cancelled
 */
export function showModal(options) {
  return new Promise((resolve) => {
    const { title, fields = [], message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false } = options;

    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    let fieldsHTML = '';
    if (message) {
      fieldsHTML = `<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:8px">${message}</p>`;
    }
    for (const f of fields) {
      const fieldId = `modal-field-${f.name}`;
      let inputHTML;
      if (f.type === 'select') {
        const opts = (f.options || []).map(o =>
          `<option value="${o}"${f.value === o ? ' selected' : ''}>${o}</option>`
        ).join('');
        inputHTML = `<select id="${fieldId}" name="${f.name}" ${f.required ? 'required' : ''}><option value="">— Choisir —</option>${opts}</select>`;
      } else if (f.type === 'textarea') {
        inputHTML = `<textarea id="${fieldId}" name="${f.name}" ${f.required ? 'required' : ''} placeholder="${f.placeholder || ''}" rows="3">${f.value || ''}</textarea>`;
      } else {
        inputHTML = `<input id="${fieldId}" type="${f.type || 'text'}" name="${f.name}" ${f.required ? 'required' : ''} placeholder="${f.placeholder || ''}" value="${f.value || ''}">`;
      }
      fieldsHTML += `<div class="field"><label for="${fieldId}">${f.label}</label>${inputHTML}</div>`;
    }

    const btnClass = danger ? 'btn btn--danger' : 'btn btn--primary';

    overlay.innerHTML = `
      <div class="modal">
        <h3>${title}</h3>
        <form id="modal-form">${fieldsHTML}
          <div class="modal-foot">
            <button type="button" class="btn btn--ghost" id="modal-cancel">${cancelLabel}</button>
            <button type="submit" class="${btnClass}">${confirmLabel}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const form = overlay.querySelector('#modal-form');
    const firstInput = form.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();

    // Focus trap: keep Tab within the modal
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = overlay.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });

    function close(result) {
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
      resolve(result);
    }

    overlay.querySelector('#modal-cancel').addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(null);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Clear previous validation errors
      overlay.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
      overlay.querySelectorAll('.error-msg').forEach(el => el.remove());

      // Validate required fields
      let hasError = false;
      for (const f of fields) {
        if (f.required) {
          const el = form.elements[f.name];
          if (el && !el.value.trim()) {
            el.classList.add('field-error');
            const msg = document.createElement('div');
            msg.className = 'error-msg';
            msg.textContent = 'Ce champ est requis';
            el.parentElement.appendChild(msg);
            if (!hasError) el.focus();
            hasError = true;
          }
        }
      }
      if (hasError) return;

      if (fields.length === 0) {
        close({});
        return;
      }
      const data = {};
      for (const f of fields) {
        const el = form.elements[f.name];
        data[f.name] = el ? el.value.trim() : '';
      }
      close(data);
    });
  });
}
