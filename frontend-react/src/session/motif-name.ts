import { t } from './messages';
import type { TextKey } from './messages';

const NAMES: readonly TextKey[] = [
  'motif.grid',
  'motif.dots',
  'motif.lines',
  'motif.rings',
  'motif.steps',
];

export function motifName(motif: number): string {
  return t(NAMES[motif] ?? 'motif.grid');
}
