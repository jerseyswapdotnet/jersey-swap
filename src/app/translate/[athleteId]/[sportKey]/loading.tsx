import { FlashingTeams } from "@/components/FlashingTeams";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <FlashingTeams label="Finding their equivalent..." />
    </main>
  );
}
