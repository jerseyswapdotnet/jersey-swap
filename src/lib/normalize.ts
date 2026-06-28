// Diacritic-insensitive so "Doncic" and "Dončić" resolve to the same athlete —
// the model isn't always consistent about including accents in canonicalName,
// and most users won't type them either.
export function normalizeAthleteName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
