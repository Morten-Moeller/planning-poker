import { describe, expect, it } from 'vitest';
import { MOTIF_COUNT, fnv1a, motifFor } from './card-motif';

const SESSION_ID = 'K7P2QX9M';
const ROUNDS = Array.from({ length: 50 }, (_, index) => index + 1);

describe('motifFor', () => {
  it('hashes with FNV-1a like the design', () => {
    expect(fnv1a('')).toBe(2166136261);
    expect(fnv1a('a')).toBe(Math.abs(Math.imul(2166136261 ^ 97, 16777619)));
  });

  it.each([
    { sessionId: SESSION_ID, iid: 42, motifs: [0, 4, 3, 0, 4, 3, 2, 3] },
    { sessionId: SESSION_ID, iid: 43, motifs: [0, 3, 2, 0, 4, 2, 1, 3] },
    { sessionId: 'ABCDEFGH', iid: 7, motifs: [0, 1, 2, 0, 1, 2, 3, 2] },
  ])(
    'returns the motifs of the Angular frontend for issue $iid of $sessionId',
    ({ sessionId, iid, motifs }) => {
      expect(motifs.map((_, index) => motifFor(sessionId, iid, index + 1))).toEqual(motifs);
    },
  );

  it.each(ROUNDS)('returns a motif from 0 to 4 in round %i', (round) => {
    const motif = motifFor(SESSION_ID, 42, round);

    expect(Number.isInteger(motif)).toBe(true);
    expect(motif).toBeGreaterThanOrEqual(0);
    expect(motif).toBeLessThan(MOTIF_COUNT);
  });

  it.each(ROUNDS)('never repeats the motif of round %i in the next round', (round) => {
    expect(motifFor(SESSION_ID, 42, round + 1)).not.toBe(motifFor(SESSION_ID, 42, round));
  });

  it('takes the next motif when the hash gives the motif of the previous round', () => {
    const round = ROUNDS.find(
      (number) =>
        fnv1a(`${SESSION_ID}:42:${number + 1}`) % MOTIF_COUNT === motifFor(SESSION_ID, 42, number),
    );

    expect(round).toBeDefined();
    expect(motifFor(SESSION_ID, 42, (round ?? 0) + 1)).toBe(
      (motifFor(SESSION_ID, 42, round ?? 0) + 1) % MOTIF_COUNT,
    );
  });

  it('takes the hash of the first round, which has no previous round', () => {
    expect(motifFor(SESSION_ID, 42, 1)).toBe(fnv1a(`${SESSION_ID}:42:1`) % MOTIF_COUNT);
  });

  it('differs between issues of the same session', () => {
    const motifs = new Set([42, 43, 44, 45, 46].map((iid) => motifFor(SESSION_ID, iid, 1)));

    expect(motifs.size).toBeGreaterThan(1);
  });

  it('returns the lobby motif without a round', () => {
    expect(motifFor(SESSION_ID, 42, 0)).toBe(0);
  });
});
