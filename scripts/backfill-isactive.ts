import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { athleteCreateData, generateAthleteProfile } from "@/lib/generation";
import { SEED_ATHLETES } from "@/data/seed-athletes";
import { normalizeAthleteName as normalize } from "@/lib/normalize";

// NBA and NFL were already backfilled for isActive accuracy in an earlier pass.
// Every other sport was seeded before isActive existed and never got refreshed,
// so every athlete in these sports still sits at the schema default (true) —
// e.g. Lou Gehrig, Babe Ruth, and Wayne Gretzky all show up as "active."
const SPORTS_TO_BACKFILL = ["mlb", "nhl", "ufc", "soccer", "golf", "tennis"];
// Concurrent upserts raced on the SQLite write lock and silently dropped some
// updates in practice (5/145 rows kept their stale isActive despite the run
// logging success) — re-running each affected athlete alone fixed it
// immediately, so this stays serial rather than re-introducing that risk.
const CONCURRENCY = 1;

async function runInBatches<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    await Promise.all(batch.map(worker));
  }
}

async function main() {
  const targets = SEED_ATHLETES.filter((a) => SPORTS_TO_BACKFILL.includes(a.sportKey));
  const sports = await prisma.sport.findMany();
  const sportByKey = new Map(sports.map((s) => [s.key, s]));

  let succeeded = 0;
  let failed = 0;

  await runInBatches(targets, CONCURRENCY, async (athlete) => {
    const sport = sportByKey.get(athlete.sportKey);
    if (!sport) {
      failed++;
      return;
    }
    try {
      const profile = await generateAthleteProfile(athlete.name, sport.name);
      const normalizedName = normalize(profile.canonicalName);
      await prisma.athlete.upsert({
        where: { normalizedName_sportId: { normalizedName, sportId: sport.id } },
        update: athleteCreateData(profile, normalizedName, sport.id, "seeded"),
        create: athleteCreateData(profile, normalizedName, sport.id, "seeded"),
      });
      succeeded++;
      console.log(`${profile.isActive ? "ACTIVE " : "RETIRED"} ${athlete.name} (${sport.name})`);
    } catch (err) {
      failed++;
      console.error(`✗ ${athlete.name} (${sport.name}):`, err instanceof Error ? err.message : err);
    }
  });

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed, out of ${targets.length}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
