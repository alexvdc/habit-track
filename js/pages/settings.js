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
