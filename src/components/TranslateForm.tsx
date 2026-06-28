"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AthletePicker, type SelectedAthlete } from "./AthletePicker";
import { TargetSportSelect } from "./TargetSportSelect";
import { getOrCreateAthleteByName } from "@/actions/athlete-actions";

const SUGGESTIONS: Array<{ label: string; name: string; targetSportKey: string }> = [
  { label: "Lamine Yamal → NBA", name: "Lamine Yamal", targetSportKey: "nba" },
  { label: "Tom Brady → Soccer", name: "Tom Brady", targetSportKey: "soccer" },
  { label: "Tiger Woods → UFC", name: "Tiger Woods", targetSportKey: "ufc" },
  { label: "Serena Williams → NFL", name: "Serena Williams", targetSportKey: "nfl" },
];

export function TranslateForm() {
  const router = useRouter();
  const [athlete, setAthlete] = useState<SelectedAthlete | null>(null);
  const [query, setQuery] = useState("");
  const [targetSportKey, setTargetSportKey] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);

  const canTranslate =
    (athlete !== null || query.trim().length >= 2) &&
    targetSportKey !== null &&
    targetSportKey !== athlete?.sportKey;
  const busy = isResolving || loadingSuggestion !== null;

  function handleSelectAthlete(selected: SelectedAthlete) {
    setAthlete(selected);
    // An already-chosen target sport might now equal the athlete's own sport.
    if (targetSportKey === selected.sportKey) setTargetSportKey(null);
  }

  async function handleTranslate() {
    if (!targetSportKey || busy) return;
    if (!athlete && query.trim().length < 2) return;

    setError(null);
    try {
      let athleteId = athlete?.id;
      if (!athleteId) {
        setIsResolving(true);
        const resolved = await getOrCreateAthleteByName(query.trim());
        athleteId = resolved.id;
      }
      router.push(`/translate/${athleteId}/${targetSportKey}`);
    } catch {
      setError(`Couldn't find or research "${query.trim()}". Try a different spelling.`);
      setIsResolving(false);
    }
  }

  async function handleSuggestion(suggestion: (typeof SUGGESTIONS)[number]) {
    setLoadingSuggestion(suggestion.label);
    setError(null);
    try {
      const resolved = await getOrCreateAthleteByName(suggestion.name);
      router.push(`/translate/${resolved.id}/${suggestion.targetSportKey}`);
    } catch {
      setError("Couldn't set that one up right now. Try again or search manually below.");
      setLoadingSuggestion(null);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-col gap-4">
        <AthletePicker
          label="Athlete"
          selected={athlete}
          onSelect={handleSelectAthlete}
          onClear={() => setAthlete(null)}
          onQueryChange={setQuery}
        />
        <TargetSportSelect
          selected={targetSportKey}
          onSelect={setTargetSportKey}
          excludeSportKey={athlete?.sportKey}
        />
      </div>

      <button
        onClick={handleTranslate}
        disabled={!canTranslate || busy}
        className="mt-6 w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
      >
        {isResolving ? "Researching..." : "Translate"}
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
