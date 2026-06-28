type ComparisonSummaryProps = {
  summary: string;
};

export function ComparisonSummary({ summary }: ComparisonSummaryProps) {
  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/40 p-6">
      <p className="text-lg leading-relaxed text-white">{summary}</p>
    </div>
  );
}
