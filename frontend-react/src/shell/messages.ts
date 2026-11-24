import { defineMessages } from '../i18n/messages';

export const MESSAGES = {
  'shell.title': 'Planning Poker',
  'shell.theme.light': 'Helles Design',
  'shell.theme.dark': 'Dunkles Design',
  'error.close': 'Schließen',
  'connection.lost': 'Verbindung zum Server unterbrochen.',
  'connection.retryIn': 'Neuer Versuch in {seconds} s. Deine Karte bleibt erhalten.',
  'connection.connecting': 'Verbindung wird aufgebaut … Deine Karte bleibt erhalten.',
  'connection.reconnect': 'Jetzt verbinden',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export const t = defineMessages(MESSAGES);
