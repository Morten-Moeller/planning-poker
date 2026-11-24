import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PickerField } from './picker-field';
import type { PickerFieldProps, PickerOption } from './picker-field';
import { installPopupAnimations } from './testing/popup-animations';

const PROJECTS: readonly PickerOption[] = [
  { value: '1234', content: <span>Planning Poker Test</span> },
  { value: '77', content: <span>Webshop</span> },
];

function Picker(props: Partial<PickerFieldProps> & { initial?: string }) {
  const { initial = '', onChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <PickerField
      label="GitLab-Projekt"
      hint="Name, Pfad oder ID."
      options={[]}
      emptyText={null}
      data-testid="picker"
      errorTestId="picker-error"
      optionTestId="picker-option"
      emptyTestId="picker-empty"
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

describe('PickerField', () => {
  beforeAll(() => {
    installPopupAnimations();
  });

  it('is a combobox with the name of the label, the hint and the look of the text field', async () => {
    render(<Picker />);

    const input = screen.getByRole('combobox', { name: 'GitLab-Projekt' });
    expect(input.getAttribute('data-testid')).toBe('picker');
    expect(input.getAttribute('data-slot')).toBe('autocomplete-input');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.closest('[data-slot="field"]')).not.toBeNull();
    await waitFor(() => expect(describedBy(input)).toBe('Name, Pfad oder ID.'));
  });

  it('shows the error in place of the hint and marks the input invalid', async () => {
    render(<Picker error="Bitte die GitLab-Projekt-ID eingeben" />);

    const input = screen.getByTestId('picker');
    expect(screen.getByTestId('picker-error').textContent).toBe(
      'Bitte die GitLab-Projekt-ID eingeben',
    );
    await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
    expect(screen.queryByText('Name, Pfad oder ID.')).toBeNull();
  });

  it('opens the options with the focus and writes the value of the chosen one into the field', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    render(<Picker options={PROJECTS} onFocus={onFocus} />);
    const input = screen.getByTestId<HTMLInputElement>('picker');
    expect(screen.queryAllByTestId('picker-option')).toHaveLength(0);

    await user.click(input);

    const options = await screen.findAllByTestId('picker-option');
    expect(options.map((option) => option.textContent)).toEqual(['Planning Poker Test', 'Webshop']);
    expect(options[0]?.getAttribute('role')).toBe('option');
    expect(onFocus).toHaveBeenCalledTimes(1);

    await user.click(options[0] as HTMLElement);

    expect(input.value).toBe('1234');
    await waitFor(() => expect(screen.queryAllByTestId('picker-option')).toHaveLength(0));
  });

  it('keeps every option while the user types and reports each change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Picker options={PROJECTS} onChange={onChange} />);
    const input = screen.getByTestId<HTMLInputElement>('picker');

    await user.type(input, 'xy');

    expect(onChange.mock.calls).toEqual([['x'], ['xy']]);
    expect(input.value).toBe('xy');
    expect(await screen.findAllByTestId('picker-option')).toHaveLength(2);
  });

  it('chooses the highlighted option with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Picker options={PROJECTS} />);
    const input = screen.getByTestId<HTMLInputElement>('picker');

    await user.click(input);
    await screen.findAllByTestId('picker-option');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(input.value).toBe('77');
  });

  it('shows the empty text as a disabled option that a click does not choose', async () => {
    const user = userEvent.setup();
    render(<Picker emptyText="Keine Projekte gefunden" initial="kein Treffer" />);
    const input = screen.getByTestId<HTMLInputElement>('picker');

    await user.click(input);

    const empty = await screen.findByTestId('picker-empty');
    expect(empty.textContent).toBe('Keine Projekte gefunden');
    expect(empty.getAttribute('aria-disabled')).toBe('true');

    await user.click(empty);

    expect(input.value).toBe('kein Treffer');
  });

  it('shows no empty text while there are options', async () => {
    const user = userEvent.setup();
    render(<Picker options={PROJECTS} emptyText="Keine Projekte gefunden" />);

    await user.click(screen.getByTestId('picker'));

    await screen.findAllByTestId('picker-option');
    expect(screen.queryByTestId('picker-empty')).toBeNull();
  });

  it('reports the blur of the input', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(<Picker onBlur={onBlur} />);

    await user.click(screen.getByTestId('picker'));
    await user.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
