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
  'start.create.title': 'Sitzung erstellen',
  'start.create.subtitle': 'Für den Scrum Master',
  'start.create.name': 'Dein Name',
  'start.create.nameRequired': 'Bitte einen Namen eingeben',
  'start.create.nameTooLong': 'Der Name darf höchstens 30 Zeichen haben',
  'start.create.project': 'GitLab-Projekt',
  'start.create.projectHint': 'Name, Pfad oder ID. Eingabe von Hand möglich.',
  'start.create.projectRequired': 'Bitte die GitLab-Projekt-ID eingeben',
  'start.create.projectNoResults': 'Keine Projekte gefunden',
  'start.create.issue': 'Issue (optional)',
  'start.create.issueHint': 'Optional: Issue, mit dem die Sitzung startet',
  'start.create.issueInvalid': 'Bitte eine Issue-Nummer ab 1 eingeben',
  'start.create.issueNoResults': 'Keine Issues gefunden',
  'start.create.submit': 'Sitzung erstellen',
  'start.create.submitWithoutBackend': 'Sitzung erstellen (Backend fehlt)',
  'start.recent.title': 'Letzte Sitzungen',
  'start.recent.noIssue': 'Kein Issue aktiv',
  'start.recent.role.SCRUM_MASTER': 'Scrum Master',
  'start.recent.role.DEVELOPER': 'Entwickler',
  'start.recent.role.VIEWER': 'Zuschauer',
  'start.recent.lastUsedMinutes': {
    one: 'zuletzt vor 1 Minute',
    other: 'zuletzt vor {count} Minuten',
  },
  'start.recent.lastUsedHours': {
    one: 'zuletzt vor 1 Stunde',
    other: 'zuletzt vor {count} Stunden',
  },
  'start.recent.lastUsedDays': { one: 'zuletzt vor 1 Tag', other: 'zuletzt vor {count} Tagen' },
  'start.recent.remove': 'Aus Liste entfernen',
} as const;

export type MessageKey = keyof typeof MESSAGES;
export type TextKey = {
  [K in MessageKey]: (typeof MESSAGES)[K] extends string ? K : never;
}[MessageKey];

export const t = defineMessages(MESSAGES);
