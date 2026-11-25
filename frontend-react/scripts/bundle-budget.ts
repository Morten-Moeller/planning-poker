import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ManifestChunk {
  file: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
}

export type Manifest = Record<string, ManifestChunk>;

export type BudgetLevel = 'ok' | 'warning' | 'error';

export interface BudgetResult {
  level: BudgetLevel;
  bytes: number;
  files: string[];
  message: string;
}

export const WARNING_BYTES = 500_000;
export const ERROR_BYTES = 1_000_000;

const BYTES_PER_KB = 1000;
const DIST = 'dist';
const MANIFEST = '.vite/manifest.json';

export function initialFiles(manifest: Manifest): string[] {
  const files = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string) => {
    const chunk = manifest[key];
    if (chunk === undefined || seen.has(key)) {
      return;
    }
    seen.add(key);
    files.add(chunk.file);
    (chunk.css ?? []).forEach((file) => files.add(file));
    (chunk.imports ?? []).forEach(visit);
  };
  Object.keys(manifest)
    .filter((key) => manifest[key]?.isEntry === true)
    .forEach(visit);
  return [...files].sort();
}

function kiloBytes(bytes: number): string {
  return `${(bytes / BYTES_PER_KB).toFixed(1)} kB`;
}

export function checkBudget(manifest: Manifest, sizeOf: (file: string) => number): BudgetResult {
  const files = initialFiles(manifest);
  const bytes = files.reduce((sum, file) => sum + sizeOf(file), 0);
  if (files.length === 0) {
    return { level: 'error', bytes, files, message: 'bundle budget: the manifest has no entry' };
  }
  if (bytes > ERROR_BYTES) {
    return {
      level: 'error',
      bytes,
      files,
      message: `bundle budget: the initial load is ${kiloBytes(bytes)}, the limit is ${kiloBytes(ERROR_BYTES)}`,
    };
  }
  if (bytes > WARNING_BYTES) {
    return {
      level: 'warning',
      bytes,
      files,
      message: `bundle budget: the initial load is ${kiloBytes(bytes)}, the warning limit is ${kiloBytes(WARNING_BYTES)} and the limit is ${kiloBytes(ERROR_BYTES)}`,
    };
  }
  return {
    level: 'ok',
    bytes,
    files,
    message: `bundle budget: the initial load is ${kiloBytes(bytes)} of ${kiloBytes(ERROR_BYTES)}`,
  };
}

export function run(root: string): BudgetResult {
  const manifest = JSON.parse(readFileSync(join(root, DIST, MANIFEST), 'utf8')) as Manifest;
  return checkBudget(manifest, (file) => statSync(join(root, DIST, file)).size);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run(process.cwd());
  const print = result.level === 'ok' ? console.log : console.error;
  print(result.message);
  process.exitCode = result.level === 'error' ? 1 : 0;
}
