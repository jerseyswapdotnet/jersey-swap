import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const sportKey = searchParams.get("sportKey");
  const excludeSportKey = searchParams.get("excludeSportKey");

  if (q.length === 0) {
    return Response.json({ results: [] });
  }

  const athletes = await prisma.athlete.findMany({
    where: {
      normalizedName: { contains: q },
      ...(sportKey ? { sport: { key: sportKey } } : {}),
      ...(excludeSportKey ? { sport: { key: { not: excludeSportKey } } } : {}),
    },
    include: { sport: true },
    orderBy: { popularityTier: "asc" },
    take: 10,
  });

  return Response.json({
    results: athletes.map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
      sportKey: athlete.sport.key,
      sportName: athlete.sport.name,
      teamOrOrg: athlete.teamOrOrg,
    })),
  });
}
