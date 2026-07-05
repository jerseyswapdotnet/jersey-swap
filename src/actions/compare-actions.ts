"use server";

import { prisma } from "@/lib/prisma";
import { compareAthletes, profileFromAthlete, withDeadline } from "@/lib/generation";
import { MODEL } from "@/lib/anthropic";

const withRelations = {
  athleteA: { include: { sport: true } },
  athleteB: { include: { sport: true } },
} as const;

function normalizedPairIds(idX: string, idY: string): [string, string] {
  return idX < idY ? [idX, idY] : [idY, idX];
}

export async function getOrCreateCompareMatch(athleteIdX: string, athleteIdY: string) {
  return withDeadline(getOrCreateCompareMatchInner(athleteIdX, athleteIdY));
}

async function getOrCreateCompareMatchInner(athleteIdX: string, athleteIdY: string) {
  const [athleteAId, athleteBId] = normalizedPairIds(athleteIdX, athleteIdY);

  const existing = await prisma.compareMatch.findUnique({
    where: { athleteAId_athleteBId: { athleteAId, athleteBId } },
    include: withRelations,
  });
  if (existing) return existing;

  const [athleteA, athleteB] = await Promise.all([
    prisma.athlete.findUniqueOrThrow({ where: { id: athleteAId }, include: { sport: true } }),
    prisma.athlete.findUniqueOrThrow({ where: { id: athleteBId }, include: { sport: true } }),
  ]);

  if (athleteA.sportId === athleteB.sportId) {
    throw new Error("Pick two athletes from different sports to compare.");
  }

  const result = await compareAthletes(
    athleteA.name,
    athleteA.sport.name,
    profileFromAthlete(athleteA),
    athleteB.name,
    athleteB.sport.name,
    profileFromAthlete(athleteB),
  );

  return prisma.compareMatch.create({
    data: {
      athleteAId,
      athleteBId,
      matchPercentage: result.matchPercentage,
      explanation: result.explanation,
      generationModel: MODEL,
    },
    include: withRelations,
  });
}
