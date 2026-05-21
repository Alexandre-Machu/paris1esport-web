import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const DEFAULT_TEAMS_URL = 'https://paris1esport.fr/api/managed/teams';
function parseArgs(argv) {
  const args = {
    prodTeamsUrl: process.env.PROD_TEAMS_URL || DEFAULT_TEAMS_URL,
    allowClear: process.env.ALLOW_CLEAR === 'true'
  };

  for (const arg of argv) {
    if (arg.startsWith('--prod-teams-url=')) {
      args.prodTeamsUrl = arg.slice('--prod-teams-url='.length).trim();
    } else if (arg === '--allow-clear') {
      args.allowClear = true;
    }
  }

  return args;
}

function normalizeName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getChampionValue(player) {
  const candidates = [
    player?.favoriteChampion,
    player?.favorite_champion,
    player?.championPrefere,
    player?.champion,
    player?.mainChampion
  ];

  for (const candidate of candidates) {
    const cleaned = String(candidate || '').trim();
    if (cleaned) {
      return cleaned;
    }
  }

  return '';
}

function extractPlayersFromPayload(payload) {
  if (Array.isArray(payload)) {
    if (payload.every((entry) => entry && typeof entry === 'object' && Array.isArray(entry.players))) {
      return payload.flatMap((team) => asArray(team.players));
    }

    if (payload.every((entry) => entry && typeof entry === 'object' && entry.name)) {
      return payload;
    }
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.players)) {
      return payload.players;
    }

    if (Array.isArray(payload.teams)) {
      return payload.teams.flatMap((team) => asArray(team.players));
    }
  }

  return [];
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} when fetching ${url}`);
  }
  return response.json();
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

function buildChampionMap(players) {
  const map = new Map();

  for (const player of players) {
    const name = String(player?.name || '').trim();
    const key = normalizeName(name);
    const favoriteChampion = getChampionValue(player);

    if (!key || !favoriteChampion) {
      continue;
    }

    map.set(key, favoriteChampion);
  }

  return map;
}

async function loadSourcePlayers({ prodTeamsUrl, sourceFile }) {
  const collectedPlayers = [];

  try {
    const prodPayload = await fetchJson(prodTeamsUrl);
    const prodPlayers = extractPlayersFromPayload(prodPayload);
    if (prodPlayers.length > 0) {
      collectedPlayers.push(...prodPlayers);
      console.log(`🌐 Source production chargee: ${prodPlayers.length} joueurs depuis ${prodTeamsUrl}`);
    }
  } catch (error) {
    console.warn(`⚠️ Impossible de lire la source production (${prodTeamsUrl}): ${error.message}`);
  }

  if (sourceFile) {
    try {
      const filePayload = await readJsonFile(path.resolve(process.cwd(), sourceFile));
      const filePlayers = extractPlayersFromPayload(filePayload);
      if (filePlayers.length > 0) {
        collectedPlayers.push(...filePlayers);
        console.log(`📄 Source fichier chargee: ${filePlayers.length} joueurs depuis ${sourceFile}`);
      }
    } catch (error) {
      console.warn(`⚠️ Impossible de lire le fichier source (${sourceFile}): ${error.message}`);
    }
  }

  return collectedPlayers;
}

async function syncFavoriteChampions() {
  const args = parseArgs(process.argv.slice(2));

  console.log('🔄 Sync favorite champions -> Supabase (via Prisma)');
  console.log(`   prodTeamsUrl: ${args.prodTeamsUrl}`);
  if (args.sourceFile) {
    console.log(`   sourceFile: ${args.sourceFile}`);
  }
  console.log(`   allowClear: ${args.allowClear ? 'yes' : 'no'}`);

  const sourcePlayers = await loadSourcePlayers(args);
  const favoriteChampionByName = buildChampionMap(sourcePlayers);

  if (favoriteChampionByName.size === 0) {
    console.warn('⚠️ Aucune donnee de champion favori trouvee dans les sources.');
    console.warn('   Astuce: passe --source-file=<fichier.json> exporte depuis la prod.');
    return;
  }

  const dbPlayers = await prisma.player.findMany({
    select: { id: true, name: true, favoriteChampion: true }
  });

  let updated = 0;
  let unchanged = 0;
  let missingInSource = 0;

  for (const dbPlayer of dbPlayers) {
    const key = normalizeName(dbPlayer.name);
    const sourceFavoriteChampion = favoriteChampionByName.get(key);

    if (sourceFavoriteChampion === undefined) {
      missingInSource += 1;
      continue;
    }

    if (!args.allowClear && !sourceFavoriteChampion) {
      unchanged += 1;
      continue;
    }

    const current = String(dbPlayer.favoriteChampion || '').trim();
    const next = String(sourceFavoriteChampion || '').trim();

    if (current === next) {
      unchanged += 1;
      continue;
    }

    await prisma.player.update({
      where: { id: dbPlayer.id },
      data: { favoriteChampion: next || null }
    });

    updated += 1;
    console.log(`  ✅ ${dbPlayer.name}: '${current || '-'}' -> '${next || '-'}'`);
  }

  console.log('');
  console.log('📊 Resultat sync champions favoris');
  console.log(`   players_in_db: ${dbPlayers.length}`);
  console.log(`   players_with_source_champion: ${favoriteChampionByName.size}`);
  console.log(`   updated: ${updated}`);
  console.log(`   unchanged: ${unchanged}`);
  console.log(`   missing_in_source: ${missingInSource}`);
}

syncFavoriteChampions()
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
