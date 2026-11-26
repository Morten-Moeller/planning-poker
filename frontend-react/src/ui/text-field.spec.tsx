import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldControl } from '@ui-sdk/react/field';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './text-field';
import type { TextFieldProps } from './text-field';

function Controlled(props: Partial<TextFieldProps> & { initial?: string }) {
  const { initial = '', onChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <TextField
      label="Dein Name"
      data-testid="name-input"
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function describedBy(input: HTMLElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join('|');
}

describe('TextField', () => {
  it('has no size mark without size and the mark compact with size compact', () => {
    const { unmount } = render(<Controlled />);
    expect(screen.getByRole('textbox').hasAttribute('data-size')).toBe(false);
    unmount();

    render(<Controlled size="compact" />);
    expect(screen.getByRole('textbox').getAttribute('data-size')).toBe('compact');
  });

  it('gives the input the accessible name of the label and the parts of the UI SDK', () => {
    render(<Controlled />);

    const input = screen.getByRole('textbox', { name: 'Dein Name' });
    expect(input.getAttribute('data-testid')).toBe('name-input');
    expect(input.getAttribute('data-slot')).toBe('input');
    expect(input.closest('[data-slot="field"]')).not.toBeNull();
    expect(screen.getByText('Dein Name').getAttribute('data-slot')).toBe('field-label');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('describes the input with the hint', async () => {
    render(<Controlled hint="So sehen dich die anderen." />);

    const input = screen.getByTestId('name-input');
    await waitFor(() => expect(describedBy(input)).toBe('So sehen dich die anderen.'));
    expect(screen.getByText('So sehen dich die anderen.').getAttribute('data-slot')).toBe(
      'field-description',
    );
  });

  it('shows the error in place of the hint, marks the input invalid and starts with the symbol', async () => {
    const view = render(
      <TextField
        label="Dein Name"
        data-testid="name-input"
        errorTestId="name-error"
        hint="So sehen dich die anderen."
        value=""
        onChange={() => undefined}
      />,
    );
    const input = screen.getByTestId('name-input');
    await waitFor(() => expect(describedBy(input)).toBe('So sehen dich die anderen.'));
    expect(screen.queryByTestId('name-error')).toBeNull();

    view.rerender(
      <TextField
        label="Dein Name"
        data-testid="name-input"
        errorTestId="name-error"
        hint="So sehen dich die anderen."
        error="Bitte einen Namen eingeben."
        value=""
        onChange={() => undefined}
      />,
    );

    const errorText = screen.getByTestId('name-error');
    expect(errorText.textContent).toBe('Bitte einen Namen eingeben.');
    const error = errorText.parentElement as HTMLElement;
    await waitFor(() => expect(describedBy(input)).toBe('⚠ Bitte einen Namen eingeben.'));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('data-slot')).toBe('field-error');
    expect(error.textContent).toBe('⚠ Bitte einen Namen eingeben.');
    const symbol = error.firstElementChild;
    expect(symbol?.tagName).toBe('SPAN');
    expect(symbol?.textContent).toBe('⚠');
    expect(symbol?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByText('So sehen dich die anderen.')).toBeNull();
  });

  it('reports each change as a string and shows the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="A" onChange={onChange} />);
    const input = screen.getByTestId<HTMLInputElement>('name-input');

    expect(input.value).toBe('A');

    await user.type(input, 'da');

    expect(onChange.mock.calls).toEqual([['Ad'], ['Ada']]);
    expect(input.value).toBe('Ada');
  });

  it('passes name, autoComplete, inputMode, maxLength and onBlur to the input', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <Controlled
        name="sessionId"
        autoComplete="off"
        inputMode="numeric"
        maxLength={3}
        onBlur={onBlur}
      />,
    );
    const input = screen.getByTestId<HTMLInputElement>('name-input');

    expect(input.getAttribute('name')).toBe('sessionId');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.maxLength).toBe(3);

    await user.type(input, '12345');
    await user.tab();

    expect(input.value).toBe('123');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('renders the input of the caller with the class, the value and the props of the field', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <Controlled
        initial="A"
        hint="So sehen dich die anderen."
        name="participant"
        autoComplete="off"
        inputMode="text"
        maxLength={5}
        onBlur={onBlur}
        renderInput={(input) => (
          <FieldControl
            className={input.className}
            value={input.value}
            onChange={(event) => input.onChange(event.currentTarget.value)}
            onBlur={input.onBlur}
            name={input.name}
            autoComplete={input.autoComplete}
            inputMode={input.inputMode}
            maxLength={input.maxLength}
            data-testid={input['data-testid']}
          />
        )}
      />,
    );
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Dein Name' });

    expect(input.getAttribute('data-slot')).toBe('field-control');
    expect(input.getAttribute('data-testid')).toBe('name-input');
    expect(input.className).not.toBe('');
    expect(input.value).toBe('A');
    expect(input.getAttribute('name')).toBe('participant');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('inputmode')).toBe('text');
    expect(input.maxLength).toBe(5);
    expect(document.querySelector('[data-slot="input"]')).toBeNull();
    await waitFor(() => expect(describedBy(input)).toBe('So sehen dich die anderen.'));

    await user.type(input, 'da');
    await user.tab();

    expect(input.value).toBe('Ada');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('marks the input of the caller invalid and describes it with the error', async () => {
    render(
      <Controlled
        error="Bitte einen Namen eingeben."
        errorTestId="name-error"
        renderInput={(input) => (
          <FieldControl
            className={input.className}
            value={input.value}
            onChange={(event) => input.onChange(event.currentTarget.value)}
            data-testid={input['data-testid']}
          />
        )}
      />,
    );
    const input = screen.getByTestId('name-input');

    await waitFor(() => expect(describedBy(input)).toBe('⚠ Bitte einen Namen eingeben.'));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('name-error').textContent).toBe('Bitte einen Namen eingeben.');
  });

  it('takes no input when it is disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled disabled onChange={onChange} />);
    const input = screen.getByTestId<HTMLInputElement>('name-input');

    expect(input.disabled).toBe(true);
    expect(input.hasAttribute('data-disabled')).toBe(true);

    await user.type(input, 'Ada');

    expect(onChange).not.toHaveBeenCalled();
  });
});
