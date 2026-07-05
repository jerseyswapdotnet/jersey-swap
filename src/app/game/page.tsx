export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { GameClient } from "@/components/GameClient";

export default async function GamePage() {
  const [athletes, sports] = await Promise.all([
    prisma.athlete.findMany({
      select: { id: true, name: true, isActive: true, sport: { select: { key: true, name: true } } },
    }),
    prisma.sport.findMany({ select: { key: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <GameClient
        athletes={athletes.map((a) => ({
          id: a.id,
          name: a.name,
          sportKey: a.sport.key,
          sportName: a.sport.name,
          isActive: a.isActive,
        }))}
        sports={sports}
      />
    </main>
  );
}
