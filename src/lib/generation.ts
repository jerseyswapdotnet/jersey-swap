import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { Athlete } from "@/generated/prisma/client";
import { anthropic, MODEL } from "./anthropic";
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
    });

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
    });

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
    // verification — only the matched athlete's *profile* (team, position) does, and
    // that's fetched separately (with search) only when the athlete is new to the DB.
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
    });

    const text = extractTextBlock(response.content);
    return MatchAndCompareSchema.parse(JSON.parse(text));
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
    });

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
    });

    const text = extractTextBlock(response.content);
    return CompareMatchSchema.parse(JSON.parse(text));
  });
}
