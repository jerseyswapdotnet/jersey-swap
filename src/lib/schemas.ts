import { z } from "zod";
import { SPORT_KEYS } from "@/data/seed-athletes";

// Rare sampling glitches can garble a single field into a run-on sentence or
// stray JSON-like characters while the surrounding JSON still parses and
// type-checks fine (e.g. "Judowas traded to the the Lakers in February 22025.{").
// A real name shouldn't contain digits or punctuation outside ' . - and spaces.
export const PROPER_NAME_REGEX = /^[\p{L}\p{M}.'\- ]+$/u;

const properName = z.string().max(60).regex(PROPER_NAME_REGEX, "must look like a real person's name");

export const AthleteProfileSchema = z.object({
  canonicalName: properName.describe("The athlete's full, correctly capitalized name."),
  teamOrOrg: z
    .string()
    .nullable()
    .describe("Current team/club/org. Null if not applicable (e.g. individual sports)."),
  positionOrWeightClass: z
    .string()
    .nullable()
    .describe("Current position, role, or weight class. Null if not applicable."),
  achievements: z
    .array(z.string())
    .describe("Short punchy accolades/achievements, e.g. '4x NBA Champion'."),
  popularityTier: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("1 = global icon, 5 = niche/lesser known"),
  isActive: z
    .boolean()
    .describe("True if currently still actively competing in this sport, false if retired."),
});
export type AthleteProfile = z.infer<typeof AthleteProfileSchema>;

export const AthleteProfileWithSportSchema = AthleteProfileSchema.extend({
  sportKey: z
    .enum(SPORT_KEYS)
    .describe("Which sport/league this athlete is from."),
});
export type AthleteProfileWithSport = z.infer<typeof AthleteProfileWithSportSchema>;

const CategoryScores = z.object({
  athleticism: z.number().min(0).max(100),
  dominance: z.number().min(0).max(100),
  fame: z.number().min(0).max(100),
  marketability: z.number().min(0).max(100),
  winning: z
    .number()
    .min(0)
    .max(100)
    .describe("How decorated/successful in terms of winning — championships, titles, win rate."),
});
export type CategoryScores = z.infer<typeof CategoryScores>;

export const MatchAndCompareSchema = z.object({
  matchedAthleteName: properName.describe(
    "Full, correctly capitalized name of the single best-matching real athlete in the target sport. Must be a different person from the input athlete.",
  ),
  matchedAthleteProfile: AthleteProfileSchema.omit({ canonicalName: true }).describe(
    "The matched athlete's OWN current profile (their team, position, achievements, etc.) — not the input athlete's.",
  ),
  comparisonSummary: z
    .string()
    .describe("A simple, punchy 2-3 sentence explanation of why this is the right comparison. No AI-sounding hedging or filler — write it like a confident sports-debate take."),
  categoryScores: z.object({
    inputAthlete: CategoryScores,
    matchedAthlete: CategoryScores,
  }),
});
export type MatchAndCompareResult = z.infer<typeof MatchAndCompareSchema>;

export const GuessRatingSchema = z.object({
  score: z.number().int().min(0).max(100).describe("How good the guess is as a cross-sport equivalent, 0-100."),
  feedback: z
    .string()
    .describe("One simple, direct sentence explaining the score — encouraging but honest, no hedging."),
});
export type GuessRating = z.infer<typeof GuessRatingSchema>;

export const CompareMatchSchema = z.object({
  matchPercentage: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("How good a cross-sport equivalent match these two specific athletes are to each other, 0-100."),
  explanation: z
    .string()
    .describe("A simple, punchy 2-3 sentence explanation of the match quality. No AI-sounding hedging or filler."),
});
export type CompareMatchResult = z.infer<typeof CompareMatchSchema>;
