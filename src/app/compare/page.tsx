import { CompareForm } from "@/components/CompareForm";

export default function ComparePage() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 sm:py-24">
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
          Cross-sport comparison
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          How good of a match are they?
        </h1>
        <p className="mt-4 max-w-xl text-lg text-neutral-400">
          Already have a comparison in mind? Type two athletes from different sports and
          we&rsquo;ll score how close of a match they really are.
        </p>
      </div>

      <div className="mt-12 flex w-full justify-center">
        <CompareForm />
      </div>
    </main>
  );
}
