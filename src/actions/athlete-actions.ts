"use server";

import { prisma } from "@/lib/prisma";
import { athleteCreateData, generateAthleteProfile, generateAthleteProfileAutoDetect } from "@/lib/generation";
import { normalizeAthleteName as normalize } from "@/lib/normalize";

/** Use when the sport is already known and the result must stay in that sport
 * (e.g. game-mode guesses scoped to the spun target sport) — unlike
 * getOrCreateAthleteByName, this never auto-detects a different sport. */
export async function getOrCreateAthleteInSport(name: string, sportKey: string) {
  const sport = await prisma.sport.findUniqueOrThrow({ where: { key: sportKey } });
  const normalizedQuery = normalize(name);

  const existing = await prisma.athlete.findFirst({
    where: { normalizedName: { contains: normalizedQuery }, sportId: sport.id },
    include: { sport: true },
    orderBy: { popularityTier: "asc" },
  });
  if (existing) return existing;

  const profile = await generateAthleteProfile(name, sport.name);
  const canonicalNormalizedName = normalize(profile.canonicalName);

  const existingCanonical = await prisma.athlete.findUnique({
    where: { normalizedName_sportId: { normalizedName: canonicalNormalizedName, sportId: sport.id } },
    include: { sport: true },
  });
  if (existingCanonical) return existingCanonical;

  const athlete = await prisma.athlete.create({
    data: athleteCreateData(profile, canonicalNormalizedName, sport.id, "on_demand"),
  });

  return { ...athlete, sport };
}

export async function getOrCreateAthleteByName(name: string) {
  const normalizedQuery = normalize(name);

  const existing = await prisma.athlete.findFirst({
    where: { normalizedName: { contains: normalizedQuery } },
    include: { sport: true },
    orderBy: { popularityTier: "asc" },
  });
  if (existing) return existing;

  const profile = await generateAthleteProfileAutoDetect(name);
  const sport = await prisma.sport.findUniqueOrThrow({ where: { key: profile.sportKey } });
  const canonicalNormalizedName = normalize(profile.canonicalName);

  // The AI's canonical name may already exist even if the user's raw query didn't substring-match it.
  const existingCanonical = await prisma.athlete.findUnique({
    where: {
      normalizedName_sportId: { normalizedName: canonicalNormalizedName, sportId: sport.id },
    },
  });
  if (existingCanonical) return { ...existingCanonical, sport };

  const athlete = await prisma.athlete.create({
    data: athleteCreateData(profile, canonicalNormalizedName, sport.id, "on_demand"),
  });

  return { ...athlete, sport };
}
