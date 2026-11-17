export function prefersReducedMotion(document: Document): boolean {
  return document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
