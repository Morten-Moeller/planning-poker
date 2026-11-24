import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppButton } from './app-button';

describe('AppButton', () => {
  it.each(['filled', 'outlined', 'text'] as const)(
    'renders the button of the UI SDK in the variant %s with the tone default',
    (variant) => {
      render(<AppButton variant={variant}>Speichern</AppButton>);

      const button = screen.getByRole('button', { name: 'Speichern' });
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('data-slot')).toBe('button');
      expect(button.getAttribute('data-variant')).toBe(variant);
      expect(button.getAttribute('data-tone')).toBe('default');
      expect(button.getAttribute('type')).toBe('button');
    },
  );

  it('sets the tone on-error', () => {
    render(
      <AppButton variant="outlined" tone="on-error">
        Erneut prüfen
      </AppButton>,
    );

    expect(screen.getByRole('button').getAttribute('data-tone')).toBe('on-error');
  });

  it('passes data-testid, type, aria attributes and onClick to the element', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <AppButton
        variant="filled"
        type="submit"
        data-testid="create-submit"
        aria-label="Sitzung erstellen"
        aria-describedby="create-hint"
        onClick={onClick}
      >
        Erstellen
      </AppButton>,
    );

    const button = screen.getByTestId('create-submit');
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.getAttribute('aria-label')).toBe('Sitzung erstellen');
    expect(button.getAttribute('aria-describedby')).toBe('create-hint');

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('takes no click and has data-disabled when it is disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <AppButton variant="text" disabled onClick={onClick}>
        Schließen
      </AppButton>,
    );

    const button = screen.getByRole<HTMLButtonElement>('button');
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('data-disabled')).toBe(true);

    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('is a link with render and an anchor', () => {
    render(
      <AppButton
        variant="outlined"
        data-testid="docs-link"
        render={(props) => (
          <a {...props} href="/docs">
            {props.children}
          </a>
        )}
      >
        Dokumentation
      </AppButton>,
    );

    const link = screen.getByRole('link', { name: 'Dokumentation' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/docs');
    expect(link.getAttribute('data-slot')).toBe('button');
    expect(link.getAttribute('data-variant')).toBe('outlined');
    expect(link.getAttribute('data-testid')).toBe('docs-link');
  });

  it('is a link with render and a router link', () => {
    render(
      <MemoryRouter>
        <AppButton variant="text" render={<Link to="/session/abc" />}>
          Öffnen
        </AppButton>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Öffnen' });
    expect(link.getAttribute('href')).toBe('/session/abc');
    expect(link.getAttribute('data-variant')).toBe('text');
  });

  it('is pending until the promise of onClick ends and takes no second click', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => undefined;
    const onClick = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <AppButton variant="filled" onClick={onClick}>
        Beitreten
      </AppButton>,
    );
    const button = screen.getByRole('button', { name: 'Beitreten' });
    const spinner = button.querySelector('[data-show="pending"]');

    expect(button.hasAttribute('data-pending')).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');

    await user.click(button);

    expect(button.hasAttribute('data-pending')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);

    finish();

    await waitFor(() => expect(button.hasAttribute('data-pending')).toBe(false));
    expect(button.hasAttribute('aria-busy')).toBe(false);

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
