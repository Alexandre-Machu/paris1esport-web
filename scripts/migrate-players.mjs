import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function migratePlayersFromTeams() {
  console.log('🔄 Migration: Converting team.players to separate Player entities...');

  try {
    // Read teams from JSON
    const teamsFile = path.join(__dirname, '../data/teams.json');
    const teamsData = JSON.parse(await fs.readFile(teamsFile, 'utf-8'));

    console.log(`📋 Found ${teamsData.length} teams in teams.json`);

    // Track created players to avoid duplicates
    const playerNameToId = new Map();
    let createdCount = 0;

    // First pass: Create all players
    for (const team of teamsData) {
      if (Array.isArray(team.players)) {
        for (const playerData of team.players) {
          const playerName = String(playerData.name || '').trim();
          
          // Skip if already created in this migration
          if (playerNameToId.has(playerName)) {
            console.log(`  ⏭️  ${playerName} already exists (ID: ${playerNameToId.get(playerName)})`);
            continue;
          }

          try {
            const created = await prisma.player.create({
              data: {
                name: playerName,
                role: playerData.role?.trim() || null,
                elo: playerData.elo?.trim() || null,
                opgg: playerData.opgg?.trim() || null,
                note: playerData.note?.trim() || null,
                favoriteChampion: playerData.favoriteChampion?.trim() || null
              }
            });

            playerNameToId.set(playerName, created.id);
            createdCount++;
            console.log(`  ✅ Created player: ${playerName} (ID: ${created.id})`);
          } catch (err) {
            if (err.code === 'P2002') {
              // Unique constraint violation - player already exists
              const existing = await prisma.player.findUnique({
                where: { name: playerName }
              });
              if (existing) {
                playerNameToId.set(playerName, existing.id);
                console.log(`  ℹ️  ${playerName} already in DB (ID: ${existing.id})`);
              }
            } else {
              console.error(`  ❌ Error creating ${playerName}:`, err.message);
            }
          }
        }
      }
    }

    console.log(`\n✨ Created ${createdCount} new players`);

    // Second pass: Update teams with playerIds
    let updatedCount = 0;
    for (const team of teamsData) {
      if (Array.isArray(team.players) && team.players.length > 0) {
        const playerIds = team.players
          .map((p) => playerNameToId.get(String(p.name || '').trim()))
          .filter((id) => id);

        if (playerIds.length > 0) {
          try {
            // Find team in DB (assume same ID from JSON seed)
            const dbTeam = await prisma.team.findUnique({
              where: { id: team.id }
            });

            if (dbTeam) {
              await prisma.team.update({
                where: { id: team.id },
                data: {
                  playerIds: playerIds
                }
              });
              updatedCount++;
              console.log(`  ✅ Updated team: ${team.name} with ${playerIds.length} players`);
            } else {
              console.log(`  ⚠️  Team ${team.name} (${team.id}) not found in DB - skipping`);
            }
          } catch (err) {
            console.error(`  ❌ Error updating team ${team.name}:`, err.message);
          }
        }
      }
    }

    console.log(`\n✨ Updated ${updatedCount} teams with playerIds`);
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePlayersFromTeams();
