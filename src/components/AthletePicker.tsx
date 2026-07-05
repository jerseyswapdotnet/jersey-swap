"use client";

import { useEffect, useState } from "react";

export type SelectedAthlete = {
  id: string;
  name: string;
  sportKey: string;
  sportName: string;
};

type SearchResult = {
  id: string;
  name: string;
  sportKey: string;
  sportName: string;
  teamOrOrg: string | null;
};

type AthletePickerProps = {
  label: string;
  selected: SelectedAthlete | null;
  onSelect: (athlete: SelectedAthlete) => void;
  onClear: () => void;
  onQueryChange: (query: string) => void;
  sportKeyFilter?: string;
  excludeSportKey?: string;
  noMatchActionLabel?: string;
};

export function AthletePicker({
  label,
  selected,
  onSelect,
  onClear,
  onQueryChange,
  sportKeyFilter,
  excludeSportKey,
  noMatchActionLabel = "Translate",
}: AthletePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    onQueryChange(query);

    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (sportKeyFilter) params.set("sportKey", sportKeyFilter);
        if (excludeSportKey) params.set("excludeSportKey", excludeSportKey);
        const res = await fetch(`/api/athletes/search?${params.toString()}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sportKeyFilter, excludeSportKey]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
          <p className="text-lg font-semibold text-white">{selected.name}</p>
          <p className="text-sm text-neutral-400">{selected.sportName}</p>
        </div>
        <button
          onClick={onClear}
          className="rounded-full px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-700"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">{label}</p>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Any athlete, any sport..."
        className="w-full rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-white placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none"
      />

      {isSearching && <p className="mt-2 text-sm text-neutral-500">Searching...</p>}

      {!isSearching && results.length > 0 && (
        <ul className="mt-2 divide-y divide-neutral-700 overflow-hidden rounded-lg border border-neutral-700">
          {results.map((athlete) => (
            <li key={athlete.id}>
              <button
                onClick={() =>
                  onSelect({
                    id: athlete.id,
                    name: athlete.name,
                    sportKey: athlete.sportKey,
                    sportName: athlete.sportName,
                  })
                }
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-700"
              >
                <span className="text-white">{athlete.name}</span>
                <span className="text-xs text-neutral-400">
                  {athlete.sportName}
                  {athlete.teamOrOrg ? ` · ${athlete.teamOrOrg}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isSearching && hasSearched && results.length === 0 && query.trim().length >= 2 && (
        <p className="mt-3 text-sm text-neutral-500">
          No match yet for &ldquo;{query.trim()}&rdquo; — hit {noMatchActionLabel}{" "}
          and we&rsquo;ll research them.
        </p>
      )}
    </div>
  );
}
