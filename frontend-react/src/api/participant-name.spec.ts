import { describe, expect, it } from 'vitest';
import { NAME_MAX_LENGTH, participantNameError } from './participant-name';

describe('participantNameError', () => {
  it.each([
    { name: 'an empty name', value: '', error: 'required' },
    { name: 'a name of spaces', value: '   ', error: 'required' },
    { name: 'a name of a tab and a line break', value: '\t\n', error: 'required' },
    { name: 'a name of one letter', value: 'A', error: null },
    { name: 'a name with spaces around it', value: '  Anna  ', error: null },
    { name: 'a name of 30 characters', value: 'a'.repeat(NAME_MAX_LENGTH), error: null },
    { name: 'a name of 31 characters', value: 'a'.repeat(NAME_MAX_LENGTH + 1), error: 'tooLong' },
    { name: 'a name of 29 letters and 2 spaces', value: ` ${'a'.repeat(29)} `, error: 'tooLong' },
  ])('reports $error for $name', ({ value, error }) => {
    expect(participantNameError(value)).toBe(error);
  });
});
