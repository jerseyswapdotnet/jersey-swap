"use server";

import { prisma } from "@/lib/prisma";
import {
  athleteCreateData,
  findEquivalentAndCompare,
  generateAthleteProfile,
  profileFromAthlete,
} from "@/lib/generation";
import { normalizeAthleteName } from "@/lib/normalize";
import { MODEL } from "@/lib/anthropic";

const withRelations = {
  inputAthlete: { include: { sport: true } },
  matchedAthlete: { include: { sport: true } },
  targetSport: true,
} as const;

export async function getOrCreateTranslation(inputAthleteId: string, targetSportKey: string) {
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
  // and instant). Only pay for a fresh, search-verified profile when the matched
  // athlete is genuinely new — that's the one case where it's worth the extra latency.
  const matchedAthlete =
    existingMatch ??
    (await prisma.athlete.create({
      data: athleteCreateData(
        await generateAthleteProfile(result.matchedAthleteName, targetSport.name),
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
