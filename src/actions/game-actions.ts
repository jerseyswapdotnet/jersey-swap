"use server";

import { prisma } from "@/lib/prisma";
import { profileFromAthlete, rateGuess } from "@/lib/generation";
import { getOrCreateTranslation } from "./translation-actions";

export async function rateUserGuess(
  inputAthleteId: string,
  targetSportKey: string,
  guessedAthleteId: string,
) {
  const official = await getOrCreateTranslation(inputAthleteId, targetSportKey);
  const guessedAthlete = await prisma.athlete.findUniqueOrThrow({ where: { id: guessedAthleteId } });

  const rating = await rateGuess(
    official.inputAthlete.name,
    official.inputAthlete.sport.name,
    profileFromAthlete(official.inputAthlete),
    official.targetSport.name,
    guessedAthlete.name,
    official.matchedAthlete.name,
  );

  return {
    rating,
    officialAnswerName: official.matchedAthlete.name,
    officialComparisonSummary: official.comparisonSummary,
  };
}
