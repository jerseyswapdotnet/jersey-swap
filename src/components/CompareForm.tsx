"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AthletePicker, type SelectedAthlete } from "./AthletePicker";
import { getOrCreateAthleteByName } from "@/actions/athlete-actions";

const SUGGESTIONS: Array<{ label: string; nameX: string; nameY: string }> = [
  { label: "Erling Haaland vs Mikko Rantanen", nameX: "Erling Haaland", nameY: "Mikko Rantanen" },
  { label: "Lionel Messi vs Tiger Woods", nameX: "Lionel Messi", nameY: "Tiger Woods" },
  { label: "Patrick Mahomes vs LeBron James", nameX: "Patrick Mahomes", nameY: "LeBron James" },
];

export function CompareForm() {
  const router = useRouter();
  const [athleteX, setAthleteX] = useState<SelectedAthlete | null>(null);
  const [queryX, setQueryX] = useState("");
  const [athleteY, setAthleteY] = useState<SelectedAthlete | null>(null);
  const [queryY, setQueryY] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sameSport = athleteX !== null && athleteY !== null && athleteX.sportKey === athleteY.sportKey;
  const canCompare =
    (athleteX !== null || queryX.trim().length >= 2) &&
    (athleteY !== null || queryY.trim().length >= 2) &&
    !sameSport;
  const busy = isResolving || loadingSuggestion !== null;

  function handleSelectX(selected: SelectedAthlete) {
    setAthleteX(selected);
    if (athleteY?.sportKey === selected.sportKey) setAthleteY(null);
  }

  function handleSelectY(selected: SelectedAthlete) {
    setAthleteY(selected);
    if (athleteX?.sportKey === selected.sportKey) setAthleteX(null);
  }

  async function handleCompare() {
    if (!canCompare || busy) return;
    setError(null);
    setIsResolving(true);
    try {
      const idX = athleteX?.id ?? (await getOrCreateAthleteByName(queryX.trim())).id;
      const idY = athleteY?.id ?? (await getOrCreateAthleteByName(queryY.trim())).id;
      router.push(`/compare/${idX}/${idY}`);
    } catch {
      setError("Couldn't find or research one of those athletes. Try a different spelling.");
      setIsResolving(false);
    }
  }

  async function handleSuggestion(suggestion: (typeof SUGGESTIONS)[number]) {
    setLoadingSuggestion(suggestion.label);
    setError(null);
    try {
      const [resolvedX, resolvedY] = await Promise.all([
        getOrCreateAthleteByName(suggestion.nameX),
        getOrCreateAthleteByName(suggestion.nameY),
      ]);
      router.push(`/compare/${resolvedX.id}/${resolvedY.id}`);
    } catch {
      setError("Couldn't set that one up right now. Try again or search manually below.");
      setLoadingSuggestion(null);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-col gap-4">
        <AthletePicker
          label="First athlete"
          selected={athleteX}
          onSelect={handleSelectX}
          onClear={() => setAthleteX(null)}
          onQueryChange={setQueryX}
          noMatchActionLabel="Compare"
        />
        <AthletePicker
          label="Second athlete"
          selected={athleteY}
          onSelect={handleSelectY}
          onClear={() => setAthleteY(null)}
          onQueryChange={setQueryY}
          excludeSportKey={athleteX?.sportKey}
          noMatchActionLabel="Compare"
        />
      </div>
      {sameSport && <p className="mt-2 text-sm text-amber-400">Pick athletes from two different sports.</p>}

      <button
        onClick={handleCompare}
        disabled={!canCompare || busy}
        className="mt-6 w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
      >
        {isResolving ? "Researching..." : "Compare"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-8">
        <p className="mb-2 text-sm text-neutral-400">Or try one:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s)}
              disabled={busy}
              className="rounded-full border border-neutral-700 bg-neutral-800/60 px-3 py-1.5 text-sm text-neutral-200 hover:border-orange-500 hover:text-orange-400 disabled:opacity-50"
            >
              {loadingSuggestion === s.label ? "Loading..." : s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
