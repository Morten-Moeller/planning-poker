export const NAME_MAX_LENGTH = 30;

export type ParticipantNameError = 'required' | 'tooLong';

export function participantNameError(name: string): ParticipantNameError | null {
  if (!/\S/.test(name)) {
    return 'required';
  }
  return name.length > NAME_MAX_LENGTH ? 'tooLong' : null;
}
