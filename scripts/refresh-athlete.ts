import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { athleteCreateData, generateAthleteProfile } from "@/lib/generation";
import { normalizeAthleteName as normalize } from "@/lib/normalize";

async function main() {
  const name = process.argv[2];
  const sportKey = process.argv[3];
  if (!name || !sportKey) {
    console.error("Usage: refresh-athlete.ts <name> <sportKey>");
    process.exit(1);
  }

  const sport = await prisma.sport.findUniqueOrThrow({ where: { key: sportKey } });
  const profile = await generateAthleteProfile(name, sport.name);
  const normalizedName = normalize(profile.canonicalName);

  const updated = await prisma.athlete.upsert({
    where: { normalizedName_sportId: { normalizedName, sportId: sport.id } },
    update: athleteCreateData(profile, normalizedName, sport.id, "seeded"),
    create: athleteCreateData(profile, normalizedName, sport.id, "seeded"),
  });

  console.log(`Refreshed ${updated.name}:`, JSON.stringify(profile, null, 2));
}

main().then(() => prisma.$disconnect());
