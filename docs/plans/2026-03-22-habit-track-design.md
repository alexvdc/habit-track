# HabitTrack — Design Document

## Context

Application personnelle de suivi d'habitudes basée sur le framework **Passé / Présent / Futur** issu d'un coaching professionnel (inspiré de la Timeline Therapy et du Self-Authoring).

### Principe du framework

- **Passé** : habitudes à laisser derrière soi (mauvaises habitudes abandonnées)
- **Présent** : habitudes en cours d'ancrage (pratiques actuelles)
- **Futur** : habitudes projetées (objectifs à atteindre)

Les habitudes migrent entre les zones au fil du temps, créant un parcours de progression.

## Décisions techniques

| Choix | Décision | Raison |
|-------|----------|--------|
| Plateforme | App web (navigateur) | Accessible partout, simple à développer |
| Framework | Vanilla HTML/CSS/JS | Zéro dépendance, léger, pas de build step |
| Stockage | localStorage | Pas de serveur, données locales |
| Portabilité | Import/export JSON | Contrôle total des données |
| Routing | Hash-based SPA | Simple, pas besoin de serveur |
| Design | Conçu via UI/UX Pro Max | Thème adapté au concept passé/présent/futur |

## Structure de l'application

```
habit-track/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # Router, initialisation
│   ├── store.js             # localStorage CRUD, import/export
│   ├── pages/
│   │   ├── board.js         # Tableau passé/présent/futur
│   │   ├── dashboard.js     # Stats & graphiques
│   │   ├── weekly.js        # Réflexion hebdomadaire
│   │   └── settings.js      # Import/export, config
│   └── components/
│       ├── habit-card.js    # Carte d'habitude
│       ├── nav.js           # Navigation
│       └── chart.js         # Graphiques SVG/Canvas
└── docs/
    └── plans/
```

## Modèle de données

```json
{
  "habits": [
    {
      "id": "uuid",
      "title": "Méditer 10 min",
      "zone": "present",
      "category": "bien-être",
      "createdAt": "2026-03-22",
      "movedAt": "2026-03-22",
      "targetDate": null,
      "checkIns": ["2026-03-20", "2026-03-21"],
      "notes": ""
    }
  ],
  "reflections": [
    {
      "id": "uuid",
      "weekOf": "2026-03-17",
      "whatWorked": "...",
      "whatBlocked": "...",
      "nextSteps": "...",
      "createdAt": "2026-03-22"
    }
  ],
  "settings": {
    "exportVersion": 1
  }
}
```

## Pages

### 1. Tableau Temporel (`#/board`)

Vue principale. 3 colonnes : Passé | Présent | Futur.

- Chaque habitude = une carte avec titre, streak (présent), jours sans (passé), date cible (futur)
- Check-in quotidien via bouton sur les cartes Présent
- Migration entre zones via boutons flèches
- Ajout rapide via bouton "+" dans chaque colonne
- Colonne Présent visuellement mise en avant

### 2. Dashboard (`#/dashboard`)

Vue de progression et statistiques.

- Stats clés : habitudes actives, plus long streak, taux de réussite hebdomadaire
- Graphique : check-ins sur les 30 derniers jours (SVG/Canvas)
- Liste des habitudes acquises (fierté)
- Aperçu des habitudes futures avec date cible

### 3. Réflexion Hebdomadaire (`#/weekly`)

Vue de réflexion structurée.

- Formulaire avec 3 questions guidées :
  - "Qu'est-ce qui a bien fonctionné cette semaine ?"
  - "Qu'est-ce qui a bloqué ou été difficile ?"
  - "Quels ajustements pour la semaine prochaine ?"
- Historique des réflexions passées
- Rappel visuel si la réflexion de la semaine n'est pas faite

### 4. Settings (`#/settings`)

- Export JSON (téléchargement)
- Import JSON (upload fichier)
- Reset données (avec confirmation)

## Navigation

- Barre de navigation fixe avec les 4 pages
- Indication de la page active
- Responsive (fonctionne sur mobile)

## Usage prévu

- **Quotidien** : ouvrir le Tableau, cocher les habitudes du jour (~2 min)
- **Hebdomadaire** : remplir la Réflexion, consulter le Dashboard, réorganiser les habitudes (~10 min)

## Références

- Timeline Therapy (PNL) : utilisation de la ligne du temps pour reprogrammer les habitudes
- Self-Authoring : exercice structuré de réflexion passé/présent/futur
- Future Self coaching : visualisation du soi futur pour ancrer la motivation
