import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardHand } from './card-hand';

describe('CardHand', () => {
  let fixture: ComponentFixture<CardHand>;

  async function render(size?: 'small' | 'large'): Promise<HTMLElement> {
    fixture = TestBed.createComponent(CardHand);
    if (size) {
      fixture.componentRef.setInput('size', size);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function cards(host: HTMLElement): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('[data-testid="card-hand-card"]'));
  }

  it('shows the five motifs in a fixed order', async () => {
    const host = await render();

    expect(cards(host).map((card) => card.className.match(/motif-(\d)/)?.[1])).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(
      cards(host).map((card) => getComputedStyle(card).getPropertyValue('--app-card-accent')),
    ).toEqual(['#2f5fd0', '#0a6f8f', '#3a7a39', '#9a2299', '#8a5f00']);
    expect(
      cards(host).map((card) => getComputedStyle(card).getPropertyValue('--app-card-pattern-size')),
    ).toEqual(['auto', '9px 9px', 'auto', 'auto', '12px 12px']);
  });

  it('fans the cards out from -20 to +20 degrees', async () => {
    const host = await render();

    expect(cards(host).map((card) => card.style.getPropertyValue('--card-angle'))).toEqual([
      '-20deg',
      '-10deg',
      '0deg',
      '10deg',
      '20deg',
    ]);
  });

  it('is hidden from assistive technology and carries its size as class', async () => {
    const host = await render('large');

    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('data-testid')).toBe('card-hand');
    expect(host.classList).toContain('large');
  });

  it('is small by default', async () => {
    const host = await render();

    expect(host.classList).toContain('small');
    expect(host.classList).not.toContain('large');
  });
});
