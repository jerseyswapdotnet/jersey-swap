import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { Athlete } from "@/generated/prisma/client";
import { anthropic, MODEL } from "./anthropic";
import { normalizeAthleteName } from "./normalize";
import {
  buildAutoDetectProfilePrompt,
  buildCompareMatchPrompt,
  buildMatchAndComparePrompt,
  buildProfilePrompt,
  buildRateGuessPrompt,
} from "./prompts";
import {
  AthleteProfileSchema,
  AthleteProfileWithSportSchema,
  CompareMatchSchema,
  GuessRatingSchema,
  MatchAndCompareSchema,
  type AthleteProfile,
  type AthleteProfileWithSport,
  type CompareMatchResult,
  type GuessRating,
  type MatchAndCompareResult,
} from "./schemas";

const WEB_SEARCH_TOOL = {
  type: "web_search_20260209" as const,
  name: "web_search" as const,
  max_uses: 2,
};

// Per-attempt timeouts on the underlying HTTP call, separate from withRetries'
// attempt count. These are a "don't hang forever" backstop, not the thing that
// enforces the user-facing speed bar — withDeadline below does that. Keep these
// generous: too tight and a normal-but-slightly-slow call gets killed mid-flight
// and counted as a failure. Measured directly: a real web-search-backed profile
// lookup (generateAthleteProfileAutoDetect) took ~20s end to end, so a 20s cap
// was clipping legitimate in-flight calls — 25s leaves real headroom above the
// observed case instead of racing it.
const SEARCH_CALL_TIMEOUT_MS = 25_000;
const FAST_CALL_TIMEOUT_MS = 12_000;

// Users disengage well before a minute — this is a hard backstop on top of
// withRetries so a slow/hung chain of attempts can never leave someone staring
// at a spinner indefinitely. Wrap the top-level export of every user-facing
// server action with this; on expiry the in-flight call is abandoned (not
// cancelled) but the caller gets a fast, clear failure instead of an open wait.
export async function withDeadline<T>(
  promise: Promise<T>,
  ms = 24_000,
  message = "That's taking too long — try again.",
): Promise<T> {
  let timer!: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

function extractTextBlock(content: Anthropic.ContentBlock[]): string {
  // Use the LAST text block, not the first: when web_search runs, Claude can emit
  // an early narration block (e.g. "Let me look that up...") before the tool call,
  // followed by the final structured-output text block once results come back.
  const textBlock = content.findLast((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("Model response did not include a text block with the expected output.");
  }
  return textBlock.text;
}

// Rare sampling glitches can produce a garbled/unparseable response even with
// output_config.format set and stop_reason "end_turn" (not a token-budget issue).
// Retry the whole call a few times before giving up, same as the SDK already
// does one layer down for transient HTTP errors.
export async function withRetries<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function generateAthleteProfile(
  name: string,
  sportName: string,
): Promise<AthleteProfile> {
  return withRetries(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: [WEB_SEARCH_TOOL],
      messages: [{ role: "user", content: buildProfilePrompt(name, sportName) }],
      output_config: { format: zodOutputFormat(AthleteProfileSchema) },
    }, { timeout: SEARCH_CALL_TIMEOUT_MS });

    const text = extractTextBlock(response.content);
    return AthleteProfileSchema.parse(JSON.parse(text));
  });
}

export async function generateAthleteProfileAutoDetect(
  name: string,
): Promise<AthleteProfileWithSport> {
  return withRetries(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: [WEB_SEARCH_TOOL],
      messages: [{ role: "user", content: buildAutoDetectProfilePrompt(name) }],
      output_config: { format: zodOutputFormat(AthleteProfileWithSportSchema) },
    }, { timeout: SEARCH_CALL_TIMEOUT_MS });

    const text = extractTextBlock(response.content);
    return AthleteProfileWithSportSchema.parse(JSON.parse(text));
  });
}

export function athleteCreateData(
  profile: AthleteProfile,
  normalizedName: string,
  sportId: string,
  source: "seeded" | "on_demand",
) {
  return {
    name: profile.canonicalName,
    normalizedName,
    sportId,
    teamOrOrg: profile.teamOrOrg,
    positionOrWeightClass: profile.positionOrWeightClass,
    achievements: profile.achievements,
    popularityTier: profile.popularityTier,
    isActive: profile.isActive,
    source,
    generationModel: MODEL,
  };
}

export function profileFromAthlete(athlete: Athlete): AthleteProfile {
  return {
    canonicalName: athlete.name,
    teamOrOrg: athlete.teamOrOrg,
    positionOrWeightClass: athlete.positionOrWeightClass,
    achievements: athlete.achievements as string[],
    popularityTier: athlete.popularityTier,
    isActive: athlete.isActive,
  };
}

export async function findEquivalentAndCompare(
  inputName: string,
  inputSportName: string,
  inputProfile: AthleteProfile,
  targetSportName: string,
): Promise<MatchAndCompareResult> {
  return withRetries(async () => {
    // No web_search here on purpose: this call is on the hot path of every translate
    // and game-mode request, and its match/score/summary output doesn't need live
    // verification. The matched athlete's profile is requested in this SAME call
    // (matchedAthleteProfile) rather than fetched with a second search-backed call —
    // that second round-trip used to be the main source of the 5s-vs-60s latency
    // swings, since it only fired (and only got slow) when the match was new to the DB.
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(MatchAndCompareSchema),
      },
      messages: [
        {
          role: "user",
          content: buildMatchAndComparePrompt(inputName, inputSportName, inputProfile, targetSportName),
        },
      ],
    }, { timeout: FAST_CALL_TIMEOUT_MS });

    const text = extractTextBlock(response.content);
    const result = MatchAndCompareSchema.parse(JSON.parse(text));

    // Rare sampling glitch: the model occasionally echoes the input athlete's own
    // name back as matchedAthleteName (e.g. translating Kobe Bryant into the NFL
    // once came back with "Kobe Bryant" as the NFL match, even though the prose
    // summary was clearly about Tom Brady). A translation can never validly match
    // someone to themselves, so treat this as a failed attempt and let withRetries
    // re-roll it rather than persisting a same-name cross-sport "match."
    if (normalizeAthleteName(result.matchedAthleteName) === normalizeAthleteName(inputName)) {
      throw new Error(`Model echoed the input athlete (${inputName}) back as its own match — retrying.`);
    }

    return result;
  });
}

export async function rateGuess(
  inputName: string,
  inputSportName: string,
  inputProfile: AthleteProfile,
  targetSportName: string,
  userGuessName: string,
  ourBestMatchName: string,
): Promise<GuessRating> {
  return withRetries(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(GuessRatingSchema),
      },
      messages: [
        {
          role: "user",
          content: buildRateGuessPrompt(
            inputName,
            inputSportName,
            inputProfile,
            targetSportName,
            userGuessName,
            ourBestMatchName,
          ),
        },
      ],
    }, { timeout: FAST_CALL_TIMEOUT_MS });

    const text = extractTextBlock(response.content);
    return GuessRatingSchema.parse(JSON.parse(text));
  });
}

export async function compareAthletes(
  nameA: string,
  sportA: string,
  profileA: AthleteProfile,
  nameB: string,
  sportB: string,
  profileB: AthleteProfile,
): Promise<CompareMatchResult> {
  return withRetries(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(CompareMatchSchema),
      },
      messages: [
        {
          role: "user",
          content: buildCompareMatchPrompt(nameA, sportA, profileA, nameB, sportB, profileB),
        },
      ],
    }, { timeout: FAST_CALL_TIMEOUT_MS });

    const text = extractTextBlock(response.content);
    return CompareMatchSchema.parse(JSON.parse(text));
  });
}
