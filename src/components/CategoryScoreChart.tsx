type Scores = {
  athleticism: number;
  dominance: number;
  fame: number;
  marketability: number;
  winning: number;
};

type CategoryScoreChartProps = {
  athleteAName: string;
  athleteBName: string;
  scores: { athleteA: Scores; athleteB: Scores };
};

const CATEGORIES: Array<{ key: keyof Scores; label: string }> = [
  { key: "athleticism", label: "Athleticism" },
  { key: "dominance", label: "Dominance" },
  { key: "fame", label: "Fame" },
  { key: "marketability", label: "Marketability" },
  { key: "winning", label: "Winning" },
];

export function CategoryScoreChart({ athleteAName, athleteBName, scores }: CategoryScoreChartProps) {
  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/40 p-6">
      <div className="mb-4 flex justify-between text-sm font-medium">
        <span className="text-orange-400">{athleteAName}</span>
        <span className="text-blue-400">{athleteBName}</span>
      </div>
      <div className="space-y-4">
        {CATEGORIES.map(({ key, label }) => {
          const a = scores.athleteA[key];
          const b = scores.athleteB[key];
          return (
            <div key={key}>
              <p className="mb-1 text-center text-xs uppercase tracking-wide text-neutral-500">
                {label}
              </p>
              <div className="flex items-center gap-2">
                <span className="w-8 text-right text-xs text-neutral-400">{Math.round(a)}</span>
                <div className="flex h-2 flex-1 flex-row-reverse overflow-hidden rounded-full bg-neutral-700">
                  <div className="bg-orange-500" style={{ width: `${a}%` }} />
                </div>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-neutral-700">
                  <div className="bg-blue-500" style={{ width: `${b}%` }} />
                </div>
                <span className="w-8 text-xs text-neutral-400">{Math.round(b)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
