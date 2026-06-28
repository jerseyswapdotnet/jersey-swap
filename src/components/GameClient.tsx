"use client";

import { useEffect, useRef, useState } from "react";
import { SpinningReel } from "./SpinningReel";
import { AthletePicker, type SelectedAthlete } from "./AthletePicker";
import { FlashingTeams } from "./FlashingTeams";
import { getOrCreateAthleteInSport } from "@/actions/athlete-actions";
import { getOrCreateTranslation } from "@/actions/translation-actions";
import { rateUserGuess } from "@/actions/game-actions";

type GameAthlete = { id: string; name: string; sportKey: string; sportName: string; isActive: boolean };
type GameSport = { key: string; name: string };
type RateResult = {
  rating: { score: number; feedback: string };
  officialAnswerName: string;
  officialComparisonSummary: string;
};

type Phase = "setup" | "spinning-athlete" | "spinning-sport" | "ready" | "guessing" | "rating" | "result";
type EraMode = "current" | "all-time";

const GUESS_SECONDS = 45;
const MIN_SPORTS = 2;

export function GameClient({ athletes, sports }: { athletes: GameAthlete[]; sports: GameSport[] }) {
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set(sports.map((s) => s.key)));
  const [eraMode, setEraMode] = useState<EraMode>("current");
  const [phase, setPhase] = useState<Phase>("setup");
  const [spinToken, setSpinToken] = useState(0);
  const [sportSpinToken, setSportSpinToken] = useState(0);
  const [spunAthlete, setSpunAthlete] = useState<GameAthlete | null>(null);
  const [spunSportKey, setSpunSportKey] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(GUESS_SECONDS);
  const [guessAthlete, setGuessAthlete] = useState<SelectedAthlete | null>(null);
  const [guessQuery, setGuessQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RateResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefetchedFor = useRef<string | null>(null);

  // The wheel pool respects the Current/All-Time toggle, but the guess/answer search
  // never does — a guess can always be any era, regardless of what mode spun the athlete.
  const athletePool = athletes.filter(
    (a) => selectedSports.has(a.sportKey) && (eraMode === "all-time" || a.isActive),
  );
  const targetSportName = sports.find((s) => s.key === spunSportKey)?.name;
  const canSpin = athletePool.length > 0 && selectedSports.size >= MIN_SPORTS;

  function toggleSport(key: string) {
    setSelectedSports((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startSpin() {
    if (!canSpin) return;
    setResult(null);
    setError(null);
    setGuessAthlete(null);
    setGuessQuery("");
    const choice = athletePool[Math.floor(Math.random() * athletePool.length)];
    setSpunAthlete(choice);
    setPhase("spinning-athlete");
    setSpinToken((t) => t + 1);
  }

  function onAthleteSettle() {
    if (!spunAthlete) return;
    // Target sport comes from the same filter the athlete pool used, minus the
    // athlete's own sport — with the 2-sport minimum this is always non-empty.
    const sportPool = sports.filter((s) => selectedSports.has(s.key) && s.key !== spunAthlete.sportKey);
    const choice = sportPool[Math.floor(Math.random() * sportPool.length)];
    setSpunSportKey(choice.key);
    setPhase("spinning-sport");
    setSportSpinToken((t) => t + 1);
  }

  function onSportSettle() {
    setPhase("ready");
  }

  // Warm the comparison cache as soon as both wheels land, overlapping the slow AI
  // call with the time the user spends reading the prompt and typing their guess —
  // by the time they submit, getOrCreateTranslation inside rateUserGuess usually
  // just hits the cache instead of waiting on a fresh generation.
  useEffect(() => {
    if (phase !== "ready" || !spunAthlete || !spunSportKey) return;
    const key = `${spunAthlete.id}:${spunSportKey}`;
    if (prefetchedFor.current === key) return;
    prefetchedFor.current = key;
    getOrCreateTranslation(spunAthlete.id, spunSportKey).catch(() => {});
  }, [phase, spunAthlete, spunSportKey]);

  function startGuessing() {
    setTimeLeft(GUESS_SECONDS);
    setPhase("guessing");
  }

  useEffect(() => {
    if (phase !== "guessing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "guessing" && timeLeft === 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  async function handleSubmit() {
    if (!spunAthlete || !spunSportKey) return;
    if (!guessAthlete && guessQuery.trim().length < 2) {
      setResult({
        rating: { score: 0, feedback: "Time's up — no guess submitted." },
        officialAnswerName: "",
        officialComparisonSummary: "",
      });
      setPhase("result");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPhase("rating");
    try {
      let guessId = guessAthlete?.id;
      if (!guessId) {
        const resolved = await getOrCreateAthleteInSport(guessQuery.trim(), spunSportKey);
        guessId = resolved.id;
      }
      const data = await rateUserGuess(spunAthlete.id, spunSportKey, guessId);
      setResult(data);
      setPhase("result");
    } catch {
      setError("Couldn't score that guess — try submitting again.");
      setPhase("guessing");
    } finally {
      setIsSubmitting(false);
    }
  }

  function playAgain() {
    setPhase("setup");
    setSpunAthlete(null);
    setSpunSportKey(null);
    setResult(null);
    prefetchedFor.current = null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">Game mode</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Guess the equivalent</h1>
      </div>

      {phase === "setup" && (
        <>
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">Athletes on the wheel:</p>
            <div className="flex gap-2">
              {(["current", "all-time"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setEraMode(mode)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    eraMode === mode
                      ? "border-orange-500 bg-orange-600/20 text-orange-400"
                      : "border-neutral-600 text-neutral-400 hover:border-neutral-400"
                  }`}
                >
                  {mode === "current" ? "Current" : "All Time"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {eraMode === "current"
                ? "Only active players land on the wheel. Your guess can still be anyone, any era."
                : "Any player, current or retired, can land on the wheel."}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">Sports:</p>
            <div className="flex flex-wrap gap-2">
              {sports.map((s) => (
                <button
                  key={s.key}
                  onClick={() => toggleSport(s.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    selectedSports.has(s.key)
                      ? "border-orange-500 bg-orange-600/20 text-orange-400"
                      : "border-neutral-600 text-neutral-400 hover:border-neutral-400"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            {selectedSports.size < MIN_SPORTS && (
              <p className="mt-2 text-sm text-amber-400">Pick at least {MIN_SPORTS} sports to play.</p>
            )}
            {selectedSports.size >= MIN_SPORTS && athletePool.length === 0 && (
              <p className="mt-2 text-sm text-amber-400">
                No {eraMode === "current" ? "active" : ""} athletes in the selected sports yet.
              </p>
            )}
          </div>
          <button
            onClick={startSpin}
            disabled={!canSpin}
            className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            Spin
          </button>
        </>
      )}

      {(phase === "spinning-athlete" || phase === "spinning-sport" || phase === "ready") && (
        <div className="flex flex-col gap-4">
          <SpinningReel
            pool={athletePool.map((a) => ({ key: a.id, label: a.name, sublabel: a.sportName }))}
            landOn={
              spunAthlete ? { key: spunAthlete.id, label: spunAthlete.name, sublabel: spunAthlete.sportName } : null
            }
            spinToken={spinToken}
            onSettle={onAthleteSettle}
            placeholder="Spinning for an athlete..."
          />
          {(phase === "spinning-sport" || phase === "ready") && (
            <SpinningReel
              pool={sports.filter((s) => selectedSports.has(s.key)).map((s) => ({ key: s.key, label: s.name }))}
              landOn={spunSportKey ? { key: spunSportKey, label: targetSportName ?? "" } : null}
              spinToken={sportSpinToken}
              onSettle={onSportSettle}
              placeholder="Spinning for a target sport..."
            />
          )}
          {phase === "ready" && spunAthlete && (
            <div className="text-center">
              <p className="text-lg text-white">
                Who&rsquo;s the <span className="font-bold text-orange-400">{targetSportName}</span> equivalent of{" "}
                <span className="font-bold text-orange-400">{spunAthlete.name}</span>?
              </p>
              <button
                onClick={startGuessing}
                className="mt-4 w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-500"
              >
                Start guessing — {GUESS_SECONDS}s
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "guessing" && spunAthlete && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-lg text-white">
              {spunAthlete.name} <span className="text-neutral-500">→</span> {targetSportName}
            </p>
            <p className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}>{timeLeft}s</p>
          </div>
          <AthletePicker
            label={`Your guess (${targetSportName})`}
            selected={guessAthlete}
            onSelect={setGuessAthlete}
            onClear={() => setGuessAthlete(null)}
            onQueryChange={setGuessQuery}
            sportKeyFilter={spunSportKey ?? undefined}
            noMatchActionLabel="Submit guess"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!guessAthlete && guessQuery.trim().length < 2)}
            className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            Submit guess
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {phase === "rating" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <FlashingTeams label="Scoring your guess..." />
        </div>
      )}

      {phase === "result" && result && spunAthlete && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm uppercase tracking-widest text-neutral-400">Your score</p>
          <p className="text-6xl font-bold text-orange-400">{result.rating.score}</p>
          <p className="text-lg text-white">{result.rating.feedback}</p>
          {result.officialAnswerName && (
            <div className="w-full rounded-xl border border-neutral-700 bg-neutral-800/60 p-4 text-left">
              <p className="text-xs uppercase tracking-wide text-neutral-400">Our pick was</p>
              <p className="text-xl font-bold text-white">{result.officialAnswerName}</p>
              <p className="mt-1 text-sm text-neutral-400">{result.officialComparisonSummary}</p>
            </div>
          )}
          <button
            onClick={playAgain}
            className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-500"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
