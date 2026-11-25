const SCHEMES: ReadonlySet<string> = new Set(['http:', 'https:']);

export function externalUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return SCHEMES.has(new URL(value).protocol) ? value : null;
  } catch {
    return null;
  }
}
