"use server";

import { prisma } from "@/lib/prisma";
import { profileFromAthlete, rateGuess, withDeadline } from "@/lib/generation";
import { getOrCreateTranslation } from "./translation-actions";

export async function rateUserGuess(
  inputAthleteId: string,
  targetSportKey: string,
  guessedAthleteId: string,
) {
  // Slightly larger budget than the default: this composes getOrCreateTranslation,
  // which already carries its own ~24s deadline, so this outer one needs room for
  // that plus the rateGuess call that follows it.
  return withDeadline(rateUserGuessInner(inputAthleteId, targetSportKey, guessedAthleteId), 28_000);
}

async function rateUserGuessInner(inputAthleteId: string, targetSportKey: string, guessedAthleteId: string) {
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
