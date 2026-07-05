"use server";

import { prisma } from "@/lib/prisma";
import { athleteCreateData, generateAthleteProfileAutoDetect, withDeadline } from "@/lib/generation";
import { normalizeAthleteName as normalize } from "@/lib/normalize";

/** Use when the sport is already known and the result must stay in that sport
 * (e.g. game-mode guesses scoped to the spun target sport) — unlike
 * getOrCreateAthleteByName, this never auto-detects a different sport. */
export async function getOrCreateAthleteInSport(name: string, sportKey: string) {
  // Larger budget than the default: the uncached path here calls the
  // search-backed generateAthleteProfileAutoDetect, which alone measured ~20s
  // in practice — the default 24s leaves almost no room for it to land cleanly.
  return withDeadline(getOrCreateAthleteInSportInner(name, sportKey), 30_000);
}

async function getOrCreateAthleteInSportInner(name: string, sportKey: string) {
  const sport = await prisma.sport.findUniqueOrThrow({ where: { key: sportKey } });
  const normalizedQuery = normalize(name);

  const existing = await prisma.athlete.findFirst({
    where: { normalizedName: { contains: normalizedQuery }, sportId: sport.id },
    include: { sport: true },
    orderBy: { popularityTier: "asc" },
  });
  if (existing) return existing;

  // Auto-detect rather than assume `name` actually plays `sportKey` — the caller's
  // sport is a hint, not ground truth (e.g. a game-mode guess can name a real
  // athlete who plays a different sport entirely). Blindly generating a profile
  // for whatever name+sport was asked for is exactly how a fake "Kobe Bryant
  // (NFL)" athlete once got created. This also doubles as typo correction, since
  // the auto-detect prompt identifies who the user most likely means first.
  const profile = await generateAthleteProfileAutoDetect(name);
  const actualSport =
    profile.sportKey === sportKey
      ? sport
      : await prisma.sport.findUniqueOrThrow({ where: { key: profile.sportKey } });
  const canonicalNormalizedName = normalize(profile.canonicalName);

  const existingCanonical = await prisma.athlete.findUnique({
    where: { normalizedName_sportId: { normalizedName: canonicalNormalizedName, sportId: actualSport.id } },
    include: { sport: true },
  });
  if (existingCanonical) return existingCanonical;

  const athlete = await prisma.athlete.create({
    data: athleteCreateData(profile, canonicalNormalizedName, actualSport.id, "on_demand"),
  });

  return { ...athlete, sport: actualSport };
}

export async function getOrCreateAthleteByName(name: string) {
  // Same reasoning as getOrCreateAthleteInSport: the uncached path is search-backed.
  return withDeadline(getOrCreateAthleteByNameInner(name), 30_000);
}

async function getOrCreateAthleteByNameInner(name: string) {
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
