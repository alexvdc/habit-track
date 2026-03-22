# HabitTrack

Application web personnelle de suivi d'habitudes basee sur le framework **Passe / Present / Futur**, inspire du coaching professionnel (Timeline Therapy, Self-Authoring).

## Concept

L'idee est simple : organiser ses habitudes sur trois axes temporels.

- **Passe** : les habitudes qu'on laisse derriere soi (mauvaises habitudes abandonnees)
- **Present** : les habitudes en cours d'ancrage (ce qu'on pratique au quotidien)
- **Futur** : les habitudes qu'on projette d'adopter (objectifs a atteindre)

Les habitudes migrent d'une zone a l'autre au fil du temps. Une habitude Future devient Presente quand on la demarre, et Presente devient Passee quand elle est acquise.

## Fonctionnalites

- **Tableau temporel** : vue principale avec 3 colonnes (Passe | Present | Futur)
- **Check-in quotidien** : cocher ses habitudes du jour en un clic
- **Suivi de streaks** : voir combien de jours consecutifs on tient une habitude
- **Dashboard** : statistiques, graphique des 30 derniers jours, taux de reussite
- **Reflexion hebdomadaire** : journal structure pour faire le point chaque semaine
- **Import/Export JSON** : sauvegarder et restaurer ses donnees

## Tech

- Vanilla HTML / CSS / JavaScript (zero dependance, zero build step)
- Donnees stockees en localStorage (tout reste dans le navigateur)
- Routing SPA hash-based
- Design responsive (fonctionne sur mobile)

## Lancer l'app

L'app utilise des modules ES, il faut un serveur HTTP local :

```bash
npx serve .
```

Puis ouvrir `http://localhost:3000` dans le navigateur.

## Structure

```
habit-track/
├── index.html              # Point d'entree
├── css/styles.css          # Design system complet
├── js/
│   ├── app.js              # Router SPA
│   ├── store.js            # Donnees localStorage
│   ├── utils.js            # Utilitaires (escapeHTML)
│   ├── components/
│   │   ├── nav.js          # Barre de navigation
│   │   ├── habit-card.js   # Carte d'habitude
│   │   └── chart.js        # Graphique SVG
│   └── pages/
│       ├── board.js        # Tableau Passe/Present/Futur
│       ├── dashboard.js    # Stats & graphiques
│       ├── weekly.js       # Reflexion hebdomadaire
│       └── settings.js     # Import/Export/Reset
└── docs/plans/             # Documents de design
```
