export const MESSAGES = {
  'shell.title': 'Planning Poker',
  'shell.theme.light': 'Helles Design',
  'shell.theme.dark': 'Dunkles Design',
  'start.title': 'Issues gemeinsam schätzen',
  'start.lead':
    'Der Scrum Master erstellt die Sitzung und teilt den Link. Das Team tritt mit Namen bei und schätzt verdeckt.',
  'start.backendReachable': 'Backend erreichbar',
  'start.backendUnreachable': 'Backend nicht erreichbar',
  'start.backendChecking': 'Backend wird geprüft …',
  'start.backendDownHint': 'Ohne Backend lassen sich keine Sitzungen erstellen oder betreten.',
  'start.backendRetry': 'Erneut prüfen',
  'error.VALIDATION_ERROR': 'Die Eingabe ist ungültig.',
  'error.INVALID_CARD': 'Diese Karte gibt es nicht.',
  'error.UNAUTHORIZED': 'Der Zugang zur Sitzung ist nicht mehr gültig.',
  'error.FORBIDDEN_ROLE': 'Diese Aktion ist für Ihre Rolle nicht erlaubt.',
  'error.INVITE_INVALID': 'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.',
  'error.PROJECT_NOT_ALLOWED': 'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.',
  'error.SESSION_NOT_FOUND': 'Die Sitzung wurde nicht gefunden oder ist abgelaufen.',
  'error.ISSUE_NOT_FOUND': 'Das Issue wurde im GitLab-Projekt nicht gefunden.',
  'error.PROJECT_NOT_FOUND': 'Das GitLab-Projekt wurde nicht gefunden.',
  'error.NAME_TAKEN': 'Der Name ist in dieser Sitzung schon vergeben.',
  'error.INVALID_STATE': 'Die Aktion passt nicht zum aktuellen Stand der Sitzung.',
  'error.LIMIT_REACHED': 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.',
  'error.GITLAB_ACCESS_DENIED':
    'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
  'error.GITLAB_ERROR': 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
  'error.unknown': 'Es ist ein Fehler aufgetreten.',
  'error.close': 'Schließen',
  'connection.lost': 'Verbindung zum Server unterbrochen.',
  'connection.retryIn': 'Neuer Versuch in {seconds} s. Deine Karte bleibt erhalten.',
  'connection.connecting': 'Verbindung wird aufgebaut … Deine Karte bleibt erhalten.',
  'connection.reconnect': 'Jetzt verbinden',
  'session.loading': 'Sitzung wird geladen',
  'session.gone': 'Diese Sitzung ist abgelaufen oder existiert nicht.',
  'session.goneHome': 'Zur Startseite',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function t(key: MessageKey, values: Readonly<Record<string, string | number>> = {}): string {
  return Object.entries(values).reduce<string>(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    MESSAGES[key],
  );
}
