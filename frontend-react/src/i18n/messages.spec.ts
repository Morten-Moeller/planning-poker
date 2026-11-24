import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MESSAGES } from './messages';

const SOURCE_ROOT = join(process.cwd(), 'src');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'i18n' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

export function unusedKeys(keys: readonly string[], sources: readonly string[]): string[] {
  return keys.filter((key) => !sources.some((source) => source.includes(`'${key}'`)));
}

describe('message catalog', () => {
  it('reports a key that no source file uses', () => {
    expect(unusedKeys(['start.title', 'start.unused'], ["t('start.title')"])).toEqual([
      'start.unused',
    ]);
  });

  it('has no key that no source file uses', () => {
    const sources = sourceFiles(SOURCE_ROOT).map((path) => readFileSync(path, 'utf8'));

    expect(unusedKeys(Object.keys(MESSAGES), sources)).toEqual([]);
  });
});
