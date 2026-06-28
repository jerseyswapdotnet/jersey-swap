"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h2 className="text-xl font-semibold text-white">Couldn&rsquo;t score that comparison</h2>
      <p className="mt-2 max-w-md text-neutral-400">
        Something went wrong while comparing them. This can happen if the two athletes are
        from the same sport, or the AI response didn&rsquo;t come back as expected.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-orange-600 px-5 py-2 font-medium text-white hover:bg-orange-500"
      >
        Try again
      </button>
    </main>
  );
}
