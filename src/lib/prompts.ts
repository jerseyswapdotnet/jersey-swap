import type { AthleteProfile } from "./schemas";
import { SEED_SPORTS } from "@/data/seed-athletes";

export function buildProfilePrompt(name: string, sportName: string): string {
  return `You are building an athlete profile for a website that compares athletes across different sports. Accuracy and currency matter a lot here — teams and rosters change via trades, free agency, and retirements.

Athlete name (as searched): ${name}
Sport/league: ${sportName}

The name above may be misspelled or mistyped — figure out who the user most likely means (the most famous real athlete in this sport whose name is closest to what was typed) and use their correct, correctly-spelled canonicalName, not the raw input.

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

The name above may be misspelled or mistyped — figure out who the user most likely means and use their correct, correctly-spelled canonicalName, not the raw input.

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

Find the single best-matching real athlete (active or retired) in ${targetSportName} — this MUST be a different person from the input athlete, never the same person even if they're unusually versatile — and provide:
- matchedAthleteName: the name fans and media commonly use for them, not a full legal name
- matchedAthleteProfile: their OWN current teamOrOrg, positionOrWeightClass, achievements, popularityTier (1-5), and isActive — using what you already know, no research needed
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
  return `You're judging a round of a casual guessing game. A player was shown an athlete and asked "who is their equivalent in ${targetSportName}?" with a time limit, then submitted a guess.

Athlete shown:
${formatProfileForPrompt(inputName, inputSportName, inputProfile)}

Player's guess: ${userGuessName}

Our system's top pick: ${ourBestMatchName} — but the player does NOT need to match this to score well.

Score the guess generously. Consider ALL of these angles — any one of them is enough reason to give a high score:
- Similar tier of greatness within their sport (e.g. both all-time greats, both current stars, both role players)
- Comparable playing style, statistical role, or position
- Similar peak dominance, winning, or championship pedigree
- Similar era, cultural footprint, or fame level
- Any other reasonable logic a sports fan might use to make this connection

Score guide: 90-100 = excellent match (same caliber, style, and era); 70-89 = solid reasonable comparison; 50-69 = has merit, not the first choice; 30-49 = a stretch but defensible; below 30 = genuinely off-base. Lean toward the higher end of whatever range fits — this is a casual game and the player put in the effort.

Give a score 0-100 and ONE short sentence of warm, direct feedback. Only mention ${ourBestMatchName} if it genuinely helps explain the score.`;
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

Rate how good a cross-sport equivalent match these two athletes are. Consider ALL of the following — being strong on even a few of these dimensions makes for a legitimate comparison:
- Similar tier of greatness relative to others in their sport (e.g. both all-time greats, both current stars, both role players)
- Comparable playing style, court/field role, or position archetype
- Similar peak dominance and how they compare to their sport's best ever
- Similar era, fame level, or cultural footprint
- Similar winning/championship pedigree
- Any other dimension a knowledgeable sports fan would naturally use to draw the connection

Score guide: 85-100 = iconic match, clearly comparable on multiple dimensions; 65-84 = strong comparison, same tier with meaningful parallels; 45-64 = reasonable with some merit; 25-44 = a stretch; below 25 = genuinely different caliber or style. When in doubt, be generous — users are proposing comparisons they believe in. Two all-time greats from any two sports should score at least 65 just on shared tier alone.

Give:
- matchPercentage: 0-100
- explanation: 2-3 punchy sentences justifying the score, confident and direct, no hedging or filler.`;
}
