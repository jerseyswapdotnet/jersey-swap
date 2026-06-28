"use client";

import { useEffect, useState } from "react";

const TEAMS = [
  "Los Angeles Lakers",
  "Dallas Cowboys",
  "New York Yankees",
  "Montreal Canadiens",
  "FC Barcelona",
  "Boston Celtics",
  "Kansas City Chiefs",
  "Real Madrid",
  "Golden State Warriors",
  "Green Bay Packers",
  "Boston Red Sox",
  "Manchester United",
  "Edmonton Oilers",
  "Chicago Bulls",
  "Pittsburgh Steelers",
  "Liverpool FC",
  "Toronto Maple Leafs",
  "San Antonio Spurs",
  "New England Patriots",
  "Los Angeles Dodgers",
];

type FlashingTeamsProps = {
  label?: string;
};

export function FlashingTeams({ label = "Crunching the numbers..." }: FlashingTeamsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % TEAMS.length);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-2xl font-bold text-white transition-opacity">{TEAMS[index]}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}
