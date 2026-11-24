import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defineMessages } from './messages';
import type { Catalog } from './messages';

const SOURCE_ROOT = join(process.cwd(), 'src');
const CATALOG_FILE = 'messages.ts';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    const isSource = /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name);
    return isSource && entry.name !== CATALOG_FILE ? [path] : [];
  });
}

function isCatalog(value: unknown): value is Catalog {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function catalogsOf(modules: Readonly<Record<string, unknown>>): Record<string, Catalog> {
  return Object.fromEntries(
    Object.entries(modules).map(([path, module]) => {
      const catalog = isCatalog(module) ? module['MESSAGES'] : undefined;
      if (!isCatalog(catalog)) {
        throw new Error(`${path} exports no catalog MESSAGES`);
      }
      return [path, catalog];
    }),
  );
}

function unusedKeys(catalogs: Readonly<Record<string, Catalog>>, sources: readonly string[]) {
  return Object.values(catalogs)
    .flatMap((catalog) => Object.keys(catalog))
    .filter((key) => !sources.some((source) => source.includes(`'${key}'`)));
}

function duplicateKeys(catalogs: Readonly<Record<string, Catalog>>): string[] {
  const keys = Object.values(catalogs).flatMap((catalog) => Object.keys(catalog));
  return [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
}

const modules = import.meta.glob<unknown>('../**/messages.ts', { eager: true });

describe('defineMessages', () => {
  const t = defineMessages({
    'sample.plain': 'Backend erreichbar',
    'sample.value': 'Neuer Versuch in {seconds} s. Runde {round}, noch {seconds} s.',
    'sample.minutes': { one: 'zuletzt vor 1 Minute', other: 'zuletzt vor {count} Minuten' },
  });

  it('returns the text of a key', () => {
    expect(t('sample.plain')).toBe('Backend erreichbar');
  });

  it('replaces every place of a value', () => {
    expect(t('sample.value', { seconds: 4, round: 'zwei' })).toBe(
      'Neuer Versuch in 4 s. Runde zwei, noch 4 s.',
    );
  });

  it.each([
    { count: 0, text: 'zuletzt vor 0 Minuten' },
    { count: 1, text: 'zuletzt vor 1 Minute' },
    { count: 2, text: 'zuletzt vor 2 Minuten' },
  ])('takes the form for the count $count', ({ count, text }) => {
    expect(t('sample.minutes', { count })).toBe(text);
  });
});

describe('catalog checks', () => {
  const catalogs = {
    'a/messages.ts': { 'a.used': 'A', 'a.unused': 'B', 'both.key': 'C' },
    'b/messages.ts': { 'b.plural': { one: 'D', other: 'E' }, 'both.key': 'F' },
  };

  it('reports a key that no source uses', () => {
    const sources = ["t('a.used')", "t('b.plural', { count })", "t('both.key')"];

    expect(unusedKeys(catalogs, sources)).toEqual(['a.unused']);
  });

  it('reports a key that two catalogs have', () => {
    expect(duplicateKeys(catalogs)).toEqual(['both.key']);
  });

  it.each([
    { name: 'no export MESSAGES', module: { t: () => '' } },
    { name: 'an export MESSAGES that is no object', module: { MESSAGES: 'text' } },
  ])('rejects a catalog file with $name', ({ module }) => {
    expect(() => catalogsOf({ '../x/messages.ts': module })).toThrow(
      '../x/messages.ts exports no catalog MESSAGES',
    );
  });
});

describe('catalogs of the application', () => {
  it('finds the catalog of every feature folder that has one', () => {
    expect(Object.keys(modules).sort()).toEqual(
      expect.arrayContaining([
        '../session/messages.ts',
        '../shell/messages.ts',
        '../start/messages.ts',
        './messages.ts',
      ]),
    );
  });

  it('has no unused key and no key in two catalogs', () => {
    const catalogs = catalogsOf(modules);
    const sources = sourceFiles(SOURCE_ROOT).map((path) => readFileSync(path, 'utf8'));

    expect(unusedKeys(catalogs, sources)).toEqual([]);
    expect(duplicateKeys(catalogs)).toEqual([]);
  });
});
