import type { AthleteProfile } from "./schemas";
import { SEED_SPORTS } from "@/data/seed-athletes";

export function buildProfilePrompt(name: string, sportName: string): string {
  return `You are building an athlete profile for a website that compares athletes across different sports. Accuracy and currency matter a lot here — teams and rosters change via trades, free agency, and retirements.

Athlete name (as searched): ${name}
Sport/league: ${sportName}

You MUST call the web_search tool at least once before answering, even for athletes you feel certain about — this is mandatory, not optional. Your training data has a cutoff and famous athletes are exactly the ones most likely to have changed teams since then via a trade, free agency move, or transfer (this has bitten this exact use case before — e.g. confidently reporting a player's old team after a high-profile trade). Search for their CURRENT team/org and position specifically, using a query that includes words like "current team 2026" or "latest trade". If the name is ambiguous, assume the most famous athlete by that name in this sport. Search efficiently and don't narrate your search process in text — go straight from searching to the final structured profile.

Generate a structured profile:
- canonicalName: the name fans and media commonly use for them (e.g. "Lamine Yamal", not a full legal name like "Lamine Yamal Nasraoui Ebana"), correctly capitalized
- teamOrOrg: current team/club/org (use null if retired with no current org, or not applicable for individual sports)
- positionOrWeightClass: current position/role/weight class (null if not applicable)
- achievements: a handful of short, punchy accolades (e.g. "4x NBA Champion", "2024 PGA Championship winner")
- popularityTier: 1 (global household-name icon) through 5 (knowledgeable fans only), strictly between 1 and 5 inclusive
- isActive: true if they are still currently competing in this sport, false if retired`;
}

export function buildAutoDetectProfilePrompt(name: string): string {
  const sportList = SEED_SPORTS.map((s) => `${s.key} (${s.name})`).join(", ");
  return `You are building an athlete profile for a website that compares athletes across different sports. Accuracy and currency matter a lot here — teams and rosters change via trades, free agency, and retirements.

Athlete name (as searched): ${name}

You MUST call the web_search tool at least once before answering, even for athletes you feel certain about — this is mandatory, not optional. Your training data has a cutoff and famous athletes are exactly the ones most likely to have changed teams since then via a trade, free agency move, or transfer. First identify who this athlete is and which sport they play, then search for their CURRENT team/org and position specifically, using a query that includes words like "current team 2026" or "latest trade". If the name is ambiguous, assume the most famous athlete by that name. Search efficiently and don't narrate your search process in text — go straight from searching to the final structured profile.

The sport MUST be one of these exact keys: ${sportList}

Generate a structured profile:
- sportKey: which of the sports above they belong to
- canonicalName: the name fans and media commonly use for them (e.g. "Lamine Yamal", not a full legal name like "Lamine Yamal Nasraoui Ebana"), correctly capitalized
- teamOrOrg: current team/club/org (use null if retired with no current org, or not applicable for individual sports)
- positionOrWeightClass: current position/role/weight class (null if not applicable)
- achievements: a handful of short, punchy accolades
- popularityTier: 1 (global household-name icon) through 5 (knowledgeable fans only), strictly between 1 and 5 inclusive
- isActive: true if they are still currently competing in this sport, false if retired`;
}

function formatProfileForPrompt(name: string, sportName: string, profile: AthleteProfile): string {
  return `${name} (${sportName}, ${profile.isActive ? "active" : "retired"})
- Team/Org: ${profile.teamOrOrg ?? "unknown"}
- Position/Weight class: ${profile.positionOrWeightClass ?? "unknown"}
- Achievements: ${profile.achievements.join("; ")}
- Popularity tier: ${profile.popularityTier} (1=global icon, 5=niche)`;
}

export function buildMatchAndComparePrompt(
  inputName: string,
  inputSportName: string,
  inputProfile: AthleteProfile,
  targetSportName: string,
): string {
  return `You are the engine behind a website where users put in an athlete's name and pick a sport, and get back the single best-matching equivalent athlete in that sport — e.g. "Lamine Yamal, translated into the NBA" might come back as Shai Gilgeous-Alexander.

Speed matters a lot here — users are waiting live. Pick your answer quickly and decisively: don't research, don't second-guess, just use what you already know. Think briefly about playing style, statistical production relative to peers, peak dominance, fame, and cultural footprint, then commit to the single best answer. Your WRITTEN ANSWER must be simple and short: a confident, punchy 2-3 sentence take, not a hedging essay. No filler like "it's worth noting" or "while comparisons are inherently subjective" — just make the case plainly, the way a sports debate show would.

Input athlete:
${formatProfileForPrompt(inputName, inputSportName, inputProfile)}

Target sport: ${targetSportName}

Find the single best-matching real athlete (active or retired) in ${targetSportName} and provide:
- matchedAthleteName: the name fans and media commonly use for them, not a full legal name
- comparisonSummary: 2-3 punchy sentences on why this is the match
- categoryScores: for BOTH the input athlete and the matched athlete, score 0-100 on:
  - athleticism
  - dominance (peak competitive dominance in their own sport)
  - fame (global recognition)
  - marketability (sponsorships, crossover appeal)
  - winning (how decorated/successful — championships, titles, win rate)
  Use the full range across different athletes rather than clustering everyone near 80-90.`;
}

export function buildRateGuessPrompt(
  inputName: string,
  inputSportName: string,
  inputProfile: AthleteProfile,
  targetSportName: string,
  userGuessName: string,
  ourBestMatchName: string,
): string {
  return `You're judging a round of a guessing game. A player was shown an athlete and asked "who is their equivalent in ${targetSportName}?" with a time limit, then submitted a guess.

Athlete shown:
${formatProfileForPrompt(inputName, inputSportName, inputProfile)}

Player's guess: ${userGuessName}

For reference, our own system's top pick for this comparison is ${ourBestMatchName} — but the player's guess does NOT need to match that exactly to score well. Judge their guess on its own merits as a genuine cross-sport comparison: playing style, statistical role, peak dominance, fame. A different but well-reasoned answer can still score highly.

Give a score 0-100 for how good the guess is, and one simple, direct sentence of feedback explaining why (mention ${ourBestMatchName} only if it helps explain the score). Be honest but not harsh — this is a casual game.`;
}

export function buildCompareMatchPrompt(
  nameA: string,
  sportA: string,
  profileA: AthleteProfile,
  nameB: string,
  sportB: string,
  profileB: AthleteProfile,
): string {
  return `You are the engine behind a website where users propose their OWN cross-sport athlete comparison and want to know how good a match it is.

Speed matters — answer quickly and decisively using what you already know, no research needed.

Athlete A:
${formatProfileForPrompt(nameA, sportA, profileA)}

Athlete B:
${formatProfileForPrompt(nameB, sportB, profileB)}

Rate how good a cross-sport equivalent match these two specific athletes are to EACH OTHER — playing style, statistical role, peak dominance, fame, cultural footprint. Give:
- matchPercentage: 0-100. Use the full range — a genuinely great match should score high (80+), a weak or mismatched pairing should score low. Don't cluster everyone near 70-80.
- explanation: 2-3 punchy sentences justifying the score, confident and direct, no hedging or filler.`;
}
