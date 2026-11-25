import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

function parsed(text: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = renderMarkdown(text);
  return host;
}

describe('renderMarkdown', () => {
  it('turns markdown into HTML', () => {
    const host = parsed('# Titel\n\nEin **fetter** Text.\n\n- eins\n- zwei');

    expect(host.querySelector('h1')?.textContent).toBe('Titel');
    expect(host.querySelector('strong')?.textContent).toBe('fetter');
    expect(host.querySelectorAll('li')).toHaveLength(2);
  });

  it('removes script elements', () => {
    const host = parsed('**fett**\n\n<script>window.__pwned = true</script>');

    expect(host.querySelector('strong')?.textContent).toBe('fett');
    expect(host.querySelector('script')).toBeNull();
    expect(host.innerHTML).not.toContain('__pwned');
  });

  it('removes event handler attributes', () => {
    const host = parsed('<img src="x" onerror="window.__pwned = true" alt="Bild">');

    expect(host.querySelector('img')).not.toBeNull();
    expect(host.querySelector('[onerror]')).toBeNull();
  });

  it.each([
    '[Klick](javascript:alert(1))',
    '<a href="javascript:alert(1)">Klick</a>',
    '<a href="JaVaScRiPt:alert(1)">Klick</a>',
  ])('removes a script address from the link %s', (text) => {
    const host = parsed(text);

    for (const link of host.querySelectorAll('a')) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^\s*javascript:/i);
    }
  });

  it('removes frames, forms, controls and styles', () => {
    const host = parsed(
      '<iframe src="https://tracker.example"></iframe><form action="https://tracker.example"><input name="password"><button>Senden</button></form><style>body{display:none}</style><p style="position:fixed">Text</p><svg><circle r="4"></circle></svg>',
    );

    for (const tag of ['iframe', 'form', 'input', 'button', 'style', 'svg']) {
      expect(host.querySelector(tag), tag).toBeNull();
    }
    expect(host.querySelector('[style]')).toBeNull();
    expect(host.querySelector('p')?.textContent).toBe('Text');
  });

  it('keeps the text of a task list without its checkbox', () => {
    const host = parsed('- [ ] form\n- [x] validation');

    expect(host.querySelector('input')).toBeNull();
    expect([...host.querySelectorAll('li')].map((item) => item.textContent.trim())).toEqual([
      'form',
      'validation',
    ]);
  });

  it('keeps the address of an image', () => {
    const host = parsed('![Pixel](https://tracker.example/pixel.gif)');

    const image = host.querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://tracker.example/pixel.gif');
    expect(image?.getAttribute('alt')).toBe('Pixel');
  });

  it('gives an empty text for an empty description', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
