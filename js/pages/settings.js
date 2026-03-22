// js/pages/settings.js — V2 Settings with themes, categories, toggles, export/import

import { exportData, importData, resetData, getSettings, updateSettings, getCategories } from '../store.js';
import { icon } from '../components/icons.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function render(container) {
  const settings = getSettings();

  container.innerHTML = `
    <div class="page-header">
      <h1>Réglages</h1>
    </div>

    <div class="settings-wrap">

      <div class="settings-section">
        <h2>${icon('sun', 'i-sm')} Apparence</h2>
        <p>Choisis le thème de l'application.</p>
        <div class="theme-row">
          <button class="theme-card${settings.theme === 'light' ? ' selected' : ''}" data-theme="light">
            <div class="theme-swatch" style="background:linear-gradient(135deg,#FAFAFA 50%,#FFF 50%)"></div>
            Clair
          </button>
          <button class="theme-card${!settings.theme || settings.theme === 'teal' ? ' selected' : ''}" data-theme="teal">
            <div class="theme-swatch" style="background:linear-gradient(135deg,#F0FDFA 50%,#CCFBF1 50%)"></div>
            Teal
          </button>
          <button class="theme-card${settings.theme === 'dark' ? ' selected' : ''}" data-theme="dark">
            <div class="theme-swatch" style="background:linear-gradient(135deg,#0C0A13 50%,#1A1825 50%)"></div>
            Sombre
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h2>${icon('list', 'i-sm')} Catégories</h2>
        <p>Gère les catégories disponibles pour tes habitudes.</p>
        <div class="cat-tags" id="cat-tags"></div>
      </div>

      <div class="settings-section">
        <h2>${icon('bell', 'i-sm')} Préférences</h2>
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Rappel quotidien</div>
            <div class="toggle-desc">Notification pour le check-in du soir</div>
          </div>
          <button class="toggle-switch${settings.reminder ? ' on' : ''}" data-pref="reminder" role="switch" aria-checked="${!!settings.reminder}"></button>
        </div>
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Objectif streak à 30 jours</div>
            <div class="toggle-desc">Affiche une barre de progression vers 30j</div>
          </div>
          <button class="toggle-switch${settings.streak30 ? ' on' : ''}" data-pref="streak30" role="switch" aria-checked="${!!settings.streak30}"></button>
        </div>
      </div>

      <div class="settings-section">
        <h2>${icon('download', 'i-sm')} Exporter</h2>
        <p>Télécharge toutes tes données en JSON pour les sauvegarder.</p>
        <button class="btn btn--primary" id="btn-export">${icon('download', 'i-sm')} Exporter</button>
      </div>

      <div class="settings-section">
        <h2>${icon('upload', 'i-sm')} Importer</h2>
        <p>Restaure depuis un fichier JSON. Les données actuelles seront remplacées.</p>
        <input type="file" id="file-import" accept=".json" style="display:none">
        <button class="btn btn--secondary" id="btn-import">${icon('upload', 'i-sm')} Importer un fichier</button>
        <div id="import-status"></div>
      </div>

      <div class="settings-section settings-section--danger">
        <h2>${icon('trash', 'i-sm')} Zone de danger</h2>
        <p>Supprime définitivement toutes tes données. Cette action est irréversible.</p>
        <button class="btn btn--danger" id="btn-reset">${icon('trash', 'i-sm')} Tout supprimer</button>
      </div>

    </div>
  `;

  // --- Categories ---
  let categories = [...getCategories()];

  function renderCats() {
    const el = container.querySelector('#cat-tags');
    el.innerHTML = categories.map(c =>
      `<span class="cat-tag">${c} <button class="cat-tag-remove" data-cat="${c}">&times;</button></span>`
    ).join('') +
      `<button class="add-tag-btn" id="add-cat">+ Ajouter</button>`;

    el.querySelectorAll('.cat-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        categories = categories.filter(c => c !== btn.dataset.cat);
        updateSettings({ categories: [...categories] });
        renderCats();
      });
    });

    el.querySelector('#add-cat').addEventListener('click', async () => {
      const result = await showModal({
        title: 'Nouvelle catégorie',
        fields: [{ name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'Ex : productivité' }],
        confirmLabel: 'Ajouter',
      });
      if (result && result.name) {
        categories.push(result.name);
        updateSettings({ categories: [...categories] });
        renderCats();
      }
    });
  }

  renderCats();

  // --- Theme cards ---
  container.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const theme = card.dataset.theme;
      if (theme === 'teal') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
      updateSettings({ theme });
      showToast(`Thème « ${card.textContent.trim()} » sélectionné`);
    });
  });

  // --- Toggle switches ---
  container.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', async () => {
      const pref = toggle.dataset.pref;

      if (pref === 'reminder' && !toggle.classList.contains('on')) {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            showToast('Permission de notification refusée');
            return;
          }
        } else {
          showToast('Les notifications ne sont pas supportées par ce navigateur');
          return;
        }
      }

      toggle.classList.toggle('on');
      const isOn = toggle.classList.contains('on');
      toggle.setAttribute('aria-checked', String(isOn));
      updateSettings({ [pref]: isOn });
    });
  });

  // --- Export ---
  container.querySelector('#btn-export').addEventListener('click', () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habittrack-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Données exportées');
  });

  // --- Import ---
  const fileInput = container.querySelector('#file-import');
  container.querySelector('#btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const statusEl = container.querySelector('#import-status');
      try {
        importData(reader.result);
        statusEl.innerHTML = `<div class="status-msg status-msg--success">Import réussi !</div>`;
        showToast('Données importées avec succès');
      } catch (err) {
        statusEl.innerHTML = `<div class="status-msg status-msg--error">Erreur : ${err.message}</div>`;
      }
    };
    reader.readAsText(file);
  });

  // --- Reset ---
  container.querySelector('#btn-reset').addEventListener('click', async () => {
    const result = await showModal({
      title: 'Tout supprimer ?',
      message: 'Toutes tes habitudes, check-ins et réflexions seront supprimés. Cette action est irréversible.',
      confirmLabel: 'Tout supprimer',
      danger: true,
    });
    if (result) {
      resetData();
      document.documentElement.removeAttribute('data-theme');
      showToast('Données supprimées');
      render(container);
    }
  });
}
