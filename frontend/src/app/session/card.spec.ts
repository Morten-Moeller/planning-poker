import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardState, PokerCard } from './card';
import { CardGlyphs } from './card-glyphs';
import { Card } from './cards';

const GLYPH_SOURCE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Pause">
  <metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></metadata>
  <script>alert(1)</script>
  <g onclick="alert(2)"><path d="M0 0h10" fill="var(--poker-body, #503079)"/></g>
</svg>`;

describe('PokerCard', () => {
  let fixture: ComponentFixture<PokerCard>;

  afterEach(() => {
    fixture.destroy();
  });

  async function render(inputs: {
    card?: Card | null;
    state?: CardState;
    outlier?: boolean;
    size?: 'deck' | 'seat';
  }): Promise<HTMLElement> {
    fixture = TestBed.createComponent(PokerCard);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function face(root: HTMLElement): HTMLElement {
    return root.querySelector<HTMLElement>('.card')!;
  }

  it.each([
    ['5', 'Karte 5'],
    ['?', 'Karte Unklar'],
    ['COFFEE', 'Karte Kaffeepause'],
  ] as const)('names the card %s as %s', async (card, label) => {
    const root = await render({ card });

    expect(face(root).getAttribute('aria-label')).toBe(label);
  });

  it('marks the chosen card as pressed with the text GEWÄHLT', async () => {
    const root = await render({ card: '5', state: 'chosen' });

    expect(face(root).tagName).toBe('BUTTON');
    expect(face(root).getAttribute('aria-pressed')).toBe('true');
    expect(face(root).getAttribute('aria-disabled')).toBeNull();
    expect(face(root).textContent?.replace(/\s+/g, ' ').trim()).toBe('✓ GEWÄHLT5');
  });

  it('marks an open card as not pressed', async () => {
    const root = await render({ card: '8', state: 'open' });

    expect(face(root).getAttribute('aria-pressed')).toBe('false');
    expect(face(root).getAttribute('aria-disabled')).toBeNull();
  });

  it('marks a locked card as disabled and emits no pick', async () => {
    const root = await render({ card: '8', state: 'locked' });
    const picked: Card[] = [];
    fixture.componentInstance.picked.subscribe((card) => picked.push(card));

    face(root).click();

    expect(face(root).getAttribute('aria-disabled')).toBe('true');
    expect(picked).toEqual([]);
  });

  it('emits the card of an open card on click', async () => {
    const root = await render({ card: '13', state: 'open' });
    const picked: Card[] = [];
    fixture.componentInstance.picked.subscribe((card) => picked.push(card));

    face(root).click();

    expect(picked).toEqual(['13']);
  });

  it('shows the outlier label on a revealed card', async () => {
    const root = await render({ card: '13', state: 'revealed', outlier: true, size: 'seat' });

    expect(root.querySelector('[data-testid="result-vote-outlier"]')?.textContent?.trim()).toBe(
      'Ausreißer',
    );
    expect(face(root).classList).toContain('outlier');
    expect(face(root).getAttribute('role')).toBe('img');
  });

  it.each(['hidden', 'pending'] as const)('shows no value on a %s card', async (state) => {
    const root = await render({ card: '13', state, size: 'seat' });

    expect(face(root).textContent).not.toContain('13');
    expect(face(root).tagName).toBe('DIV');
  });

  it('renders the glyph of the coffee card hidden for assistive technology and without metadata', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(GLYPH_SOURCE, { status: 200 })));
    Object.defineProperty(document.defaultView!, 'fetch', { value: fetch, configurable: true });
    const glyphs = TestBed.inject(CardGlyphs);
    glyphs.glyph('COFFEE');
    await vi.waitFor(() => expect(glyphs.glyph('COFFEE')).not.toBeNull());
    Reflect.deleteProperty(document.defaultView!, 'fetch');

    const root = await render({ card: 'COFFEE', state: 'open' });

    const glyph = root.querySelector<HTMLElement>('.glyph')!;
    const svg = glyph.querySelector('svg')!;
    expect(fetch).toHaveBeenCalledWith('coffee-break.svg');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.getAttribute('aria-label')).toBeNull();
    expect(svg.querySelector('metadata')).toBeNull();
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.querySelector('[onclick]')).toBeNull();
    expect(svg.querySelector('path')?.getAttribute('fill')).toBe('var(--poker-body, #503079)');
    expect(face(root).getAttribute('aria-label')).toBe('Karte Kaffeepause');
  });
});
