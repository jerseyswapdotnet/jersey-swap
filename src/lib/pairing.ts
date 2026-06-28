export function normalizedPairIds(idX: string, idY: string): [string, string] {
  return idX < idY ? [idX, idY] : [idY, idX];
}
