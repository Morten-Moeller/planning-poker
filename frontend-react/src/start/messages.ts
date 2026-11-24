import { defineMessages } from '../i18n/messages';

export const MESSAGES = {
  'start.title': 'Issues gemeinsam schätzen',
  'start.lead':
    'Der Scrum Master erstellt die Sitzung und teilt den Link. Das Team tritt mit Namen bei und schätzt verdeckt.',
  'start.backendReachable': 'Backend erreichbar',
  'start.backendUnreachable': 'Backend nicht erreichbar',
  'start.backendChecking': 'Backend wird geprüft …',
  'start.backendDownHint': 'Ohne Backend lassen sich keine Sitzungen erstellen oder betreten.',
  'start.backendRetry': 'Erneut prüfen',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export const t = defineMessages(MESSAGES);
