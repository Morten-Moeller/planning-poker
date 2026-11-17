import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Card } from './cards';

export type GlyphCard = Extract<Card, '?' | 'COFFEE'>;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SOURCES: Record<GlyphCard, string> = {
  '?': 'question-mark.svg',
  COFFEE: 'coffee-break.svg',
};
const REMOVED_ELEMENTS =
  'metadata, script, style, foreignObject, title, desc, a, use, image, set, animate, animateMotion, animateTransform';
const REMOVED_ATTRIBUTES = ['role', 'aria-label', 'aria-labelledby', 'aria-describedby'];

export function isGlyphCard(card: Card): card is GlyphCard {
  return card === '?' || card === 'COFFEE';
}

export function cleanGlyph(source: string, parser: DOMParser, serializer: XMLSerializer): string {
  const svg = parser.parseFromString(source, 'image/svg+xml').documentElement;
  if (svg.localName !== 'svg' || svg.namespaceURI !== SVG_NAMESPACE) {
    return '';
  }
  svg.querySelectorAll(REMOVED_ELEMENTS).forEach((node) => node.remove());
  for (const node of [svg, ...Array.from(svg.querySelectorAll('*'))]) {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name.endsWith('href') || name === 'style') {
        node.removeAttribute(attribute.name);
      }
    }
  }
  REMOVED_ATTRIBUTES.forEach((name) => svg.removeAttribute(name));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  return serializer.serializeToString(svg);
}

@Injectable({ providedIn: 'root' })
export class CardGlyphs {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly glyphs = signal<Partial<Record<GlyphCard, SafeHtml>>>({});
  private requested = false;

  glyph(card: GlyphCard): SafeHtml | null {
    this.load();
    return this.glyphs()[card] ?? null;
  }

  private load(): void {
    const window = this.window;
    if (this.requested || window === null || typeof window.fetch !== 'function') {
      return;
    }
    this.requested = true;
    const parser = new window.DOMParser();
    const serializer = new window.XMLSerializer();
    for (const card of Object.keys(SOURCES) as GlyphCard[]) {
      window
        .fetch(SOURCES[card])
        .then((response) => (response.ok ? response.text() : ''))
        .then((source) => cleanGlyph(source, parser, serializer))
        .then((clean) => {
          if (clean !== '') {
            this.glyphs.update((glyphs) => ({
              ...glyphs,
              [card]: this.sanitizer.bypassSecurityTrustHtml(clean),
            }));
          }
        })
        .catch(() => undefined);
    }
  }
}
