import type { Athlete, Sport } from "@/generated/prisma/client";
import { initials } from "@/lib/format";

type AthleteProfileCardProps = {
  athlete: Athlete & { sport: Sport };
};

export function AthleteProfileCard({ athlete }: AthleteProfileCardProps) {
  const achievements = athlete.achievements as string[];
  const subtitle = [athlete.teamOrOrg, athlete.positionOrWeightClass].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-orange-600/20 px-2 py-0.5 text-xs font-medium text-orange-400">
            {athlete.sport.name}
          </span>
          <h2 className="mt-2 text-2xl font-bold text-white">{athlete.name}</h2>
          {subtitle && <p className="text-sm text-neutral-400">{subtitle}</p>}
        </div>
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-lg font-bold text-white"
          aria-hidden
        >
          {initials(athlete.name)}
        </div>
      </div>

      {achievements.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-neutral-300">
          {achievements.slice(0, 6).map((achievement) => (
            <li key={achievement} className="flex gap-2">
              <span className="text-orange-400">★</span>
              <span>{achievement}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
