import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorNote } from './error-note';

describe('ErrorNote', () => {
  it('is an alert with the warning symbol hidden from screen readers before the content', () => {
    render(
      <ErrorNote data-testid="note">
        <span>Sitzung nicht gefunden</span>
      </ErrorNote>,
    );

    const note = screen.getByRole('alert');
    expect(note.getAttribute('data-testid')).toBe('note');
    const symbol = note.firstElementChild;
    expect(symbol?.textContent).toBe('⚠');
    expect(symbol?.getAttribute('aria-hidden')).toBe('true');
    expect(note.textContent).toBe('⚠Sitzung nicht gefunden');
  });

  it('has no symbol with icon false', () => {
    render(<ErrorNote icon={false}>Ohne Backend</ErrorNote>);

    const note = screen.getByRole('alert');
    expect(note.textContent).toBe('Ohne Backend');
    expect(note.querySelector('[aria-hidden]')).toBeNull();
  });

  it('adds the class of the caller to its own class', () => {
    render(<ErrorNote className="wide">Text</ErrorNote>);

    const classes = screen.getByRole('alert').className.split(' ');
    expect(classes).toHaveLength(2);
    expect(classes[1]).toBe('wide');
  });
});
