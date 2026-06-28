import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { athleteCreateData, generateAthleteProfile } from "@/lib/generation";
import { SEED_SPORTS, SEED_ATHLETES } from "@/data/seed-athletes";
import { normalizeAthleteName as normalize } from "@/lib/normalize";

const CONCURRENCY = 5;

async function runInBatches<T>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    await Promise.all(batch.map(worker));
  }
}

async function seedSports() {
  for (const sport of SEED_SPORTS) {
    await prisma.sport.upsert({
      where: { key: sport.key },
      update: { name: sport.name },
      create: { key: sport.key, name: sport.name },
    });
  }
  console.log(`Seeded ${SEED_SPORTS.length} sports.`);
}

async function main() {
  await seedSports();

  const sports = await prisma.sport.findMany();
  const sportByKey = new Map(sports.map((s) => [s.key, s]));

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  await runInBatches(SEED_ATHLETES, CONCURRENCY, async (athlete) => {
    const sport = sportByKey.get(athlete.sportKey);
    if (!sport) {
      console.error(`Unknown sportKey "${athlete.sportKey}" for ${athlete.name} — skipping.`);
      failed++;
      return;
    }

    const normalizedName = normalize(athlete.name);
    const existing = await prisma.athlete.findUnique({
      where: { normalizedName_sportId: { normalizedName, sportId: sport.id } },
    });
    if (existing) {
      skipped++;
      return;
    }

    try {
      const profile = await generateAthleteProfile(athlete.name, sport.name);
      await prisma.athlete.create({
        data: athleteCreateData(profile, normalizedName, sport.id, "seeded"),
      });
      succeeded++;
      console.log(`✓ ${athlete.name} (${sport.name})`);
    } catch (err) {
      failed++;
      console.error(`✗ ${athlete.name} (${sport.name}):`, err instanceof Error ? err.message : err);
    }
  });

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed, ${skipped} already existed.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
