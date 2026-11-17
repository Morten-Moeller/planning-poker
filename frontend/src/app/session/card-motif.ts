export const MOTIF_COUNT = 5;

export const LOBBY_MOTIF = 0;

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function fnv1a(text: string): number {
  let hash = FNV_OFFSET;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return Math.abs(hash);
}

export function motifFor(sessionId: string, issueIid: number, round: number): number {
  let motif = LOBBY_MOTIF;
  let previous: number | null = null;
  for (let number = 1; number <= round; number++) {
    motif = fnv1a(`${sessionId}:${issueIid}:${number}`) % MOTIF_COUNT;
    if (motif === previous) {
      motif = (motif + 1) % MOTIF_COUNT;
    }
    previous = motif;
  }
  return motif;
}
