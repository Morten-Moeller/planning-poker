import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import { createThemeStore } from './theme-store';

function renderShell(systemDark: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: systemDark, addEventListener: () => undefined }));
  const theme = createThemeStore(window);
  theme.start();
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell theme={theme} />}>
          <Route index element={<p>Seite</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId('theme-toggle');
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the title as a link to the start page and the page in the main area', () => {
    renderShell(false);

    const home = screen.getByTestId('toolbar-home');
    expect(home.textContent).toBe('Planning Poker');
    expect(home.getAttribute('href')).toBe('/');
    expect(screen.getByRole('main').textContent).toBe('Seite');
  });

  it.each([
    { systemDark: false, label: 'Dunkles Design', symbol: '🌙', pressed: 'false' },
    { systemDark: true, label: 'Helles Design', symbol: '☀️', pressed: 'true' },
  ])(
    'labels the toggle $label with a system scheme with dark $systemDark',
    ({ systemDark, label, symbol, pressed }) => {
      const toggle = renderShell(systemDark);

      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.getAttribute('data-slot')).toBe('toggle');
      expect(toggle.getAttribute('aria-label')).toBe(label);
      expect(toggle.getAttribute('aria-pressed')).toBe(pressed);
      expect(toggle.textContent).toBe(symbol);
      const span = toggle.querySelector('.app-symbol');
      expect(span?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('switches label, symbol, aria-pressed and data-theme with a click and back with the keyboard', async () => {
    const user = userEvent.setup();
    const toggle = renderShell(false);

    await user.click(toggle);

    expect(toggle.getAttribute('aria-label')).toBe('Helles Design');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toBe('☀️');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    toggle.focus();
    await user.keyboard('{Enter}');

    expect(toggle.getAttribute('aria-label')).toBe('Dunkles Design');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
