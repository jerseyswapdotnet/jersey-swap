import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateCompareMatch } from "@/actions/compare-actions";
import { AthleteProfileCard } from "@/components/AthleteProfileCard";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ athleteXId: string; athleteYId: string }>;
}) {
  const { athleteXId, athleteYId } = await params;

  const [athleteX, athleteY] = await Promise.all([
    prisma.athlete.findUnique({ where: { id: athleteXId }, select: { id: true, sport: { select: { key: true } } } }),
    prisma.athlete.findUnique({ where: { id: athleteYId }, select: { id: true, sport: { select: { key: true } } } }),
  ]);
  if (!athleteX || !athleteY || athleteX.sport.key === athleteY.sport.key) {
    notFound();
  }

  const match = await getOrCreateCompareMatch(athleteXId, athleteYId);
  // athleteA/athleteB are stored in a normalized order that may not match the URL's
  // X/Y order — figure out which is which so the page reads back the way the user typed.
  const displayX = match.athleteA.id === athleteXId ? match.athleteA : match.athleteB;
  const displayY = match.athleteA.id === athleteYId ? match.athleteA : match.athleteB;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">Match score</p>
        <p className="mt-2 text-6xl font-bold text-orange-400">{match.matchPercentage}%</p>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white">{match.explanation}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <AthleteProfileCard athlete={displayX} />
        <AthleteProfileCard athlete={displayY} />
      </div>
    </main>
  );
}
