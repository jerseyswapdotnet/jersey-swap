"use client";

import { useEffect, useState } from "react";
import { ALL_TEAMS } from "@/data/teams";

type FlashingTeamsProps = {
  label?: string;
};

export function FlashingTeams({ label = "Crunching the numbers..." }: FlashingTeamsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ALL_TEAMS.length);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-2xl font-bold text-white transition-opacity">{ALL_TEAMS[index]}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}
