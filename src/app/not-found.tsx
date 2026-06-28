import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h2 className="text-xl font-semibold text-white">Athlete not found</h2>
      <p className="mt-2 max-w-md text-neutral-400">
        That link doesn&rsquo;t point to an athlete or sport we know about.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-orange-600 px-5 py-2 font-medium text-white hover:bg-orange-500"
      >
        Back to search
      </Link>
    </main>
  );
}
