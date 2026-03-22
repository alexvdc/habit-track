// js/pages/weekly.js

import { addReflection, updateReflection, getReflections, getReflectionForCurrentWeek } from '../store.js';
import { escapeHTML } from '../utils.js';

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
          <textarea id="whatWorked" rows="3" placeholder="Ce qui a marché...">${escapeHTML(current?.whatWorked || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="whatBlocked">Qu'est-ce qui a bloqué ou été difficile ?</label>
          <textarea id="whatBlocked" rows="3" placeholder="Les difficultés...">${escapeHTML(current?.whatBlocked || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="nextSteps">Quels ajustements pour la semaine prochaine ?</label>
          <textarea id="nextSteps" rows="3" placeholder="Les prochaines étapes...">${escapeHTML(current?.nextSteps || '')}</textarea>
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
                <p><strong>Ce qui a marché :</strong> ${escapeHTML(r.whatWorked)}</p>
                <p><strong>Difficultés :</strong> ${escapeHTML(r.whatBlocked)}</p>
                <p><strong>Ajustements :</strong> ${escapeHTML(r.nextSteps)}</p>
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
