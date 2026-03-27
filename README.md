# Paris 1 Esport - Site officiel

Site web de l'association esport étudiante de Paris 1 Panthéon-Sorbonne.

## Développement

```bash
npm install
npm run dev
```

Le site sera accessible sur http://localhost:3000

## Gestion admin des événements

Le site inclut une interface d'administration pour ajouter/supprimer des événements sans modifier le code.

1. Crée un fichier `.env.local` à la racine.
2. Ajoute les variables suivantes:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-moi
ADMIN_SESSION_SECRET=une-cle-secrete-longue
```

3. Lance le site et ouvre `/login`.
4. Une fois connecté, gère le site via:
- `/admin/events`
- `/admin/esport`
- `/admin/orga`
- `/admin/partners`

Pour les événements, tu peux ajouter des photos via sélecteur de fichiers (ou via chemins/URLs si besoin).

Les événements sont persistés dans `data/events.json`.
Les équipes ajoutées via admin sont persistées dans `data/teams.json`.
Les membres d'organisation ajoutés via admin sont persistés dans `data/org-members.json`.
Les partenaires sont persistés dans `data/partners.json`.

## Publications (widgets live)

La page `/publications` intègre des widgets live pour X/Twitter, Twitch et YouTube.

Variables optionnelles:

```bash
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_INSTAGRAM_POST_URL=https://www.instagram.com/p/DT-0LasDZD3/
```

Les patch notes Discord sont conservées en dur dans `data/publications.json` et peuvent être modifiées via `/admin/publications`.

## Déploiement

Le site se déploie automatiquement sur paris1esport.fr à chaque push sur la branche `main`.

## Technologies

- Next.js 14
- React 18
- TailwindCSS
- TypeScript
