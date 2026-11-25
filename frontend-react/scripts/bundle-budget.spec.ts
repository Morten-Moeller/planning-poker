import { describe, expect, it } from 'vitest';
import { ERROR_BYTES, WARNING_BYTES, checkBudget, initialFiles } from './bundle-budget';
import type { Manifest } from './bundle-budget';

const MANIFEST: Manifest = {
  'index.html': {
    file: 'assets/index.js',
    isEntry: true,
    imports: ['_shared.js', '_runtime.js'],
    css: ['assets/index.css'],
  },
  '_shared.js': { file: 'assets/shared.js', imports: ['_runtime.js'], css: ['assets/shared.css'] },
  '_runtime.js': { file: 'assets/runtime.js' },
  'src/session/session-page.tsx': {
    file: 'assets/session-page.js',
    imports: ['_shared.js'],
    css: ['assets/session-page.css'],
  },
  'src/join/join-page.tsx': { file: 'assets/join-page.js', imports: ['_runtime.js'] },
};

const INITIAL = [
  'assets/index.css',
  'assets/index.js',
  'assets/runtime.js',
  'assets/shared.css',
  'assets/shared.js',
];

function sizes(perFile: number, lazy = 0): (file: string) => number {
  return (file) => (INITIAL.includes(file) ? perFile : lazy);
}

describe('initialFiles', () => {
  it('collects the entry with its static imports and their styles, each once', () => {
    expect(initialFiles(MANIFEST)).toEqual(INITIAL);
  });

  it('leaves out the chunks of the lazy pages', () => {
    const files = initialFiles(MANIFEST);

    expect(files).not.toContain('assets/session-page.js');
    expect(files).not.toContain('assets/session-page.css');
    expect(files).not.toContain('assets/join-page.js');
  });

  it('ends on an import cycle', () => {
    const cycle: Manifest = {
      'index.html': { file: 'a.js', isEntry: true, imports: ['_b.js'] },
      '_b.js': { file: 'b.js', imports: ['index.html'] },
    };

    expect(initialFiles(cycle)).toEqual(['a.js', 'b.js']);
  });
});

describe('checkBudget', () => {
  it('passes below the warning limit and names the size', () => {
    const result = checkBudget(MANIFEST, sizes(90_000, 5_000_000));

    expect(result.level).toBe('ok');
    expect(result.bytes).toBe(450_000);
    expect(result.message).toBe('bundle budget: the initial load is 450.0 kB of 1000.0 kB');
  });

  it('passes at the warning limit', () => {
    expect(checkBudget(MANIFEST, sizes(WARNING_BYTES / 5)).level).toBe('ok');
  });

  it('warns above the warning limit and names both limits', () => {
    const result = checkBudget(MANIFEST, sizes(120_000));

    expect(result.level).toBe('warning');
    expect(result.message).toBe(
      'bundle budget: the initial load is 600.0 kB, the warning limit is 500.0 kB and the limit is 1000.0 kB',
    );
  });

  it('warns at the limit and fails above it', () => {
    expect(checkBudget(MANIFEST, sizes(ERROR_BYTES / 5)).level).toBe('warning');

    const result = checkBudget(MANIFEST, sizes(ERROR_BYTES / 5 + 1));

    expect(result.level).toBe('error');
    expect(result.message).toBe(
      'bundle budget: the initial load is 1000.0 kB, the limit is 1000.0 kB',
    );
  });

  it('does not count the lazy chunks', () => {
    expect(checkBudget(MANIFEST, sizes(10_000, 9_000_000)).level).toBe('ok');
  });

  it('fails for a manifest without an entry', () => {
    const result = checkBudget({ '_a.js': { file: 'a.js' } }, () => 1);

    expect(result.level).toBe('error');
    expect(result.message).toBe('bundle budget: the manifest has no entry');
  });
});
