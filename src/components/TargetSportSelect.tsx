"use client";

import { SEED_SPORTS } from "@/data/seed-athletes";

type TargetSportSelectProps = {
  selected: string | null;
  onSelect: (sportKey: string) => void;
  excludeSportKey?: string | null;
};

export function TargetSportSelect({ selected, onSelect, excludeSportKey }: TargetSportSelectProps) {
  const options = SEED_SPORTS.filter((sport) => sport.key !== excludeSportKey);

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">Translate into</p>
      <div className="flex flex-wrap gap-2">
        {options.map((sport) => (
          <button
            key={sport.key}
            onClick={() => onSelect(sport.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              selected === sport.key
                ? "border-orange-500 bg-orange-600/20 text-orange-400"
                : "border-neutral-600 text-neutral-200 hover:border-orange-500 hover:text-orange-400"
            }`}
          >
            {sport.name}
          </button>
        ))}
      </div>
    </div>
  );
}
