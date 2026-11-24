import { defineMessages } from '../i18n/messages';

export const MESSAGES = {
  'session.loading': 'Sitzung wird geladen',
  'session.gone': 'Diese Sitzung ist abgelaufen oder existiert nicht.',
  'session.goneHome': 'Zur Startseite',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export const t = defineMessages(MESSAGES);
