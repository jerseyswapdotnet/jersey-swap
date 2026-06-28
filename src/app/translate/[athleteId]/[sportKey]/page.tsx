import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateTranslation } from "@/actions/translation-actions";
import { AthleteProfileCard } from "@/components/AthleteProfileCard";
import { CategoryScoreChart } from "@/components/CategoryScoreChart";
import { ComparisonSummary } from "@/components/ComparisonSummary";

export default async function TranslatePage({
  params,
}: {
  params: Promise<{ athleteId: string; sportKey: string }>;
}) {
  const { athleteId, sportKey } = await params;

  const [athleteExists, sportExists] = await Promise.all([
    prisma.athlete.findUnique({ where: { id: athleteId }, select: { id: true, sport: { select: { key: true } } } }),
    prisma.sport.findUnique({ where: { key: sportKey }, select: { id: true } }),
  ]);
  if (!athleteExists || !sportExists || athleteExists.sport.key === sportKey) {
    notFound();
  }

  const translation = await getOrCreateTranslation(athleteId, sportKey);
  const scores = translation.categoryScores as {
    inputAthlete: { athleticism: number; dominance: number; fame: number; marketability: number; winning: number };
    matchedAthlete: { athleticism: number; dominance: number; fame: number; marketability: number; winning: number };
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
          {translation.inputAthlete.name}&rsquo;s {translation.targetSport.name} equivalent is
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {translation.matchedAthlete.name}
        </h1>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <AthleteProfileCard athlete={translation.inputAthlete} />
        <AthleteProfileCard athlete={translation.matchedAthlete} />
      </div>
      <CategoryScoreChart
        athleteAName={translation.inputAthlete.name}
        athleteBName={translation.matchedAthlete.name}
        scores={{ athleteA: scores.inputAthlete, athleteB: scores.matchedAthlete }}
      />
      <ComparisonSummary summary={translation.comparisonSummary} />
    </main>
  );
}
