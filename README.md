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
- **Grace days** : jours de grace configurables par habitude (0-4/mois) pour ne pas casser un streak sur un oubli
- **Habit stacking** : chainer ses habitudes presentes entre elles (ex : mediter apres le cafe)
- **Dashboard** : statistiques, graphique des 30 derniers jours, taux de reussite
- **Reflexion hebdomadaire** : journal structure pour faire le point chaque semaine
- **Bilan mensuel** : stats du mois (completion, streaks, grace days) + 3 questions coaching
- **Heatmap 90 jours** : vue calendrier par habitude avec coloration des grace days
- **Drag & drop** : reorganiser et deplacer ses habitudes entre zones
- **Frequences personnalisees** : quotidien, jours specifiques, ou X fois par semaine
- **Suivi de metriques** : valeur quotidienne optionnelle par habitude (pompes, pages, minutes...)
- **Import/Export JSON** : sauvegarder et restaurer ses donnees
- **Notifications** : rappels quotidiens configurables
- **PWA** : installable sur mobile, fonctionne hors-ligne

## Tech

- Vanilla HTML / CSS / JavaScript (zero dependance, zero build step)
- Donnees stockees en localStorage (tout reste dans le navigateur)
- Routing SPA hash-based
- Service Worker network-first (mises a jour instantanees)
- Design responsive (sidebar desktop, bottom nav mobile)
- 3 themes : Teal (defaut), Light, Dark

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
├── sw.js                   # Service Worker (cache + offline)
├── manifest.json           # Manifest PWA
├── js/
│   ├── app.js              # Router SPA
│   ├── store.js            # Donnees localStorage + logique metier
│   ├── utils.js            # Utilitaires (dates, escapeHTML)
│   ├── components/
│   │   ├── nav.js          # Sidebar + bottom nav mobile
│   │   ├── habit-card.js   # Carte d'habitude (check-in, streaks, metriques)
│   │   ├── heatmap.js      # Mini heatmap 90 jours
│   │   ├── icons.js        # Bibliotheque d'icones SVG
│   │   ├── modal.js        # Modal generique (formulaires)
│   │   ├── toast.js        # Notifications toast avec undo
│   │   ├── chart.js        # Graphique SVG (dashboard)
│   │   ├── celebration.js  # Animation confettis (milestones)
│   │   └── notifications.js # Rappels push
│   └── pages/
│       ├── board.js        # Tableau Passe/Present/Futur
│       ├── dashboard.js    # Stats et graphiques
│       ├── weekly.js       # Reflexion hebdomadaire
│       ├── monthly.js      # Bilan mensuel + stats
│       └── settings.js     # Themes, import/export, notifications
└── docs/plans/             # Documents de design (gitignored)
```
