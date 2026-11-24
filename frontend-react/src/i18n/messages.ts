export interface PluralMessage {
  readonly one: string;
  readonly other: string;
}

export type Message = string | PluralMessage;
export type Catalog = Readonly<Record<string, Message>>;
export type MessageValues = Readonly<Record<string, string | number>>;
export type PluralValues = MessageValues & { readonly count: number };

type PluralKey<C extends Catalog> = {
  [K in keyof C]: C[K] extends PluralMessage ? K : never;
}[keyof C];
type PlainKey<C extends Catalog> = Exclude<keyof C, PluralKey<C>>;

export interface Translate<C extends Catalog> {
  (key: PlainKey<C>, values?: MessageValues): string;
  (key: PluralKey<C>, values: PluralValues): string;
}

function textOf(message: Message, values: MessageValues): string {
  if (typeof message === 'string') {
    return message;
  }
  return values['count'] === 1 ? message.one : message.other;
}

export function defineMessages<const C extends Catalog>(catalog: C): Translate<C> {
  return (key: keyof C, values: MessageValues = {}) =>
    Object.entries(values).reduce<string>(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      textOf(catalog[key] as Message, values),
    );
}

export const MESSAGES = {
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
} as const;

export type MessageKey = keyof typeof MESSAGES;

export const t = defineMessages(MESSAGES);
