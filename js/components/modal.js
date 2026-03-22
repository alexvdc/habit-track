// js/components/modal.js — Reusable modal (replaces prompt/confirm)

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // Mon=1..Sun=7

/**
 * Show a modal dialog.
 * @param {object} options
 * @param {string} options.title
 * @param {Array<{name:string, label:string, type:string, required?:boolean, options?:string[], placeholder?:string, value?:*}>} [options.fields]
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

    // Track frequency state for frequency fields
    const freqStates = {};

    let fieldsHTML = '';
    if (message) {
      fieldsHTML = `<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:8px">${message}</p>`;
    }
    for (const f of fields) {
      const fieldId = `modal-field-${f.name}`;
      let inputHTML;
      if (f.type === 'frequency') {
        const val = f.value || { type: 'daily' };
        freqStates[f.name] = { ...val };
        if (val.type === 'specific' && val.days) freqStates[f.name].days = [...val.days];
        inputHTML = _buildFrequencyHTML(f.name, val);
      } else if (f.type === 'select') {
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

    // Wire up frequency selectors
    for (const f of fields) {
      if (f.type === 'frequency') {
        _wireFrequency(overlay, f.name, freqStates);
      }
    }

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
        if (f.required && f.type !== 'frequency') {
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
        if (f.type === 'frequency') {
          data[f.name] = freqStates[f.name];
        } else {
          const el = form.elements[f.name];
          data[f.name] = el ? el.value.trim() : '';
        }
      }
      close(data);
    });
  });
}

function _buildFrequencyHTML(name, val) {
  const types = [
    { id: 'daily', label: 'Quotidien' },
    { id: 'specific', label: 'Jours précis' },
    { id: 'weekly', label: 'X fois/sem.' },
  ];

  let html = `<div class="freq-selector" data-freq-name="${name}">`;
  html += `<div class="freq-type-btns">`;
  for (const t of types) {
    html += `<button type="button" class="freq-type-btn${val.type === t.id ? ' active' : ''}" data-freq-type="${t.id}">${t.label}</button>`;
  }
  html += `</div>`;

  // Specific days sub-field
  const days = val.days || [];
  html += `<div class="freq-sub freq-sub--specific" style="display:${val.type === 'specific' ? 'flex' : 'none'}">`;
  for (let d = 1; d <= 7; d++) {
    html += `<button type="button" class="day-toggle${days.includes(d) ? ' active' : ''}" data-day="${d}">${DAY_LABELS[d - 1]}</button>`;
  }
  html += `</div>`;

  // Weekly count sub-field
  html += `<div class="freq-sub freq-sub--weekly" style="display:${val.type === 'weekly' ? 'flex' : 'none'}">`;
  html += `<label class="freq-count-label">Nombre de fois par semaine</label>`;
  html += `<input type="number" class="freq-count-input" min="1" max="7" value="${val.count || 3}">`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

function _wireFrequency(overlay, name, freqStates) {
  const container = overlay.querySelector(`.freq-selector[data-freq-name="${name}"]`);
  if (!container) return;

  // Type buttons
  container.querySelectorAll('.freq-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.freq-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.freqType;
      freqStates[name].type = type;

      container.querySelector('.freq-sub--specific').style.display = type === 'specific' ? 'flex' : 'none';
      container.querySelector('.freq-sub--weekly').style.display = type === 'weekly' ? 'flex' : 'none';

      if (type === 'daily') {
        delete freqStates[name].days;
        delete freqStates[name].count;
      }
    });
  });

  // Day toggles
  container.querySelectorAll('.day-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const day = parseInt(btn.dataset.day, 10);
      if (!freqStates[name].days) freqStates[name].days = [];
      const idx = freqStates[name].days.indexOf(day);
      if (idx === -1) {
        freqStates[name].days.push(day);
        freqStates[name].days.sort((a, b) => a - b);
      } else {
        freqStates[name].days.splice(idx, 1);
      }
    });
  });

  // Weekly count
  const countInput = container.querySelector('.freq-count-input');
  if (countInput) {
    countInput.addEventListener('input', () => {
      freqStates[name].count = parseInt(countInput.value, 10) || 3;
    });
  }
}
