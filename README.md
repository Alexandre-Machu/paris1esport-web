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

Les données métiers sont persistées dans la base Prisma/Supabase via les routes `/api/managed/*`.
En local, utilise la même `DATABASE_URL` que la prod pour voir exactement les mêmes équipes, joueurs, événements et partenaires.

### Upload persistant des images (Cloudinary)

Pour que les uploads (orga, events, partenaires) soient persistants en production (Vercel), configure Cloudinary:

```bash
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
# optionnel (racine des dossiers)
CLOUDINARY_FOLDER=paris1esport
```

Sans ces variables, le projet utilise un fallback local (`public/photos/...`, `public/logos/...`) pratique en dev local.

#### Migration des images existantes vers Cloudinary

La migration historique vers Cloudinary a déjà été appliquée. Les chemins d’images sont désormais stockés directement dans les données de la base ou dans les defaults du code quand nécessaire.

## Publications (widgets live)

La page `/publications` intègre des widgets live pour X/Twitter, Twitch et YouTube.

Variables optionnelles:

```bash
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_INSTAGRAM_POST_URL=https://www.instagram.com/p/DT-0LasDZD3/
```

Les patch notes Discord sont conservées côté base et peuvent être modifiées via `/admin/publications`.

## Supabase - RLS Security Fix

Si Supabase Security Advisor affiche "RLS Disabled in Public", exécute le script SQL global:

`scripts/supabase-fix-all-rls.sql`

Ce script corrige toutes les tables exposées (`partners`, `events`, `games`, `org_members`, `teams`, `competitions`, `publications_settings`):
- Active RLS sur chaque table
- Autorise la lecture publique (`anon`, `authenticated`)
- Bloque les écritures directes via PostgREST

Le site se déploie automatiquement sur paris1esport.fr à chaque push sur la branche `main`.

## Sync des champions favoris (players)

Si la base Supabase n'est pas à jour pour `favoriteChampion`, lance:

```bash
npm run sync:favorite-champions
```

Optionnel: si tu as un export JSON plus complet que la source publique, tu peux le fusionner:

```bash
npm run sync:favorite-champions -- --source-file=./mon-export-prod.json
```

Le script:
- lit la source publique (`https://paris1esport.fr/api/managed/teams`)
- met à jour `Player.favoriteChampion` en base via Prisma
- n'efface pas les valeurs existantes sauf si `--allow-clear` est explicitement passé

## Technologies

- Next.js 14
- React 18
- TailwindCSS
- TypeScript
