"use server";

import { prisma } from "@/lib/prisma";
import { athleteCreateData, findEquivalentAndCompare, profileFromAthlete, withDeadline } from "@/lib/generation";
import { normalizeAthleteName } from "@/lib/normalize";
import { MODEL } from "@/lib/anthropic";

const withRelations = {
  inputAthlete: { include: { sport: true } },
  matchedAthlete: { include: { sport: true } },
  targetSport: true,
} as const;

export async function getOrCreateTranslation(inputAthleteId: string, targetSportKey: string) {
  return withDeadline(getOrCreateTranslationInner(inputAthleteId, targetSportKey));
}

async function getOrCreateTranslationInner(inputAthleteId: string, targetSportKey: string) {
  const targetSport = await prisma.sport.findUniqueOrThrow({ where: { key: targetSportKey } });

  const existing = await prisma.comparison.findUnique({
    where: { inputAthleteId_targetSportId: { inputAthleteId, targetSportId: targetSport.id } },
    include: withRelations,
  });
  if (existing) return existing;

  const inputAthlete = await prisma.athlete.findUniqueOrThrow({
    where: { id: inputAthleteId },
    include: { sport: true },
  });

  if (inputAthlete.sportId === targetSport.id) {
    throw new Error("Can't translate an athlete into the sport they already play.");
  }

  const result = await findEquivalentAndCompare(
    inputAthlete.name,
    inputAthlete.sport.name,
    profileFromAthlete(inputAthlete),
    targetSport.name,
  );

  const normalizedName = normalizeAthleteName(result.matchedAthleteName);
  const existingMatch = await prisma.athlete.findUnique({
    where: { normalizedName_sportId: { normalizedName, sportId: targetSport.id } },
    include: { sport: true },
  });
  // Most matches resolve to an athlete already in our curated set (the common case,
  // and instant). When the match is genuinely new, build it straight from
  // matchedAthleteProfile (part of the same call above) instead of paying for a
  // second, search-backed generation call — that second round-trip used to be the
  // main reason some translations took 5s and others took a minute.
  const matchedAthlete =
    existingMatch ??
    (await prisma.athlete.create({
      data: athleteCreateData(
        { canonicalName: result.matchedAthleteName, ...result.matchedAthleteProfile },
        normalizedName,
        targetSport.id,
        "on_demand",
      ),
      include: { sport: true },
    }));

  return prisma.comparison.create({
    data: {
      inputAthleteId,
      targetSportId: targetSport.id,
      matchedAthleteId: matchedAthlete.id,
      comparisonSummary: result.comparisonSummary,
      categoryScores: result.categoryScores,
      generationModel: MODEL,
    },
    include: withRelations,
  });
}
