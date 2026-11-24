import { defineMessages } from '../i18n/messages';

export const MESSAGES = {
  'join.nameTitle': 'Mit welchem Namen?',
  'join.roleHint': 'Du trittst als Entwickler bei. Der Name ist für alle sichtbar.',
  'join.viewerHint': 'Du trittst als Zuschauer bei. Du siehst die Runde, schätzt aber nicht mit.',
  'join.inviteMissing': 'Zum Beitreten brauchst du einen Einladungslink vom Scrum Master.',
  'join.inviteInvalid': 'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.',
  'join.notFoundTitle': 'Sitzung nicht gefunden',
  'join.notFoundText': 'Der Link ist abgelaufen oder falsch.',
  'join.notFoundHome': 'Zur Startseite',
  'join.name': 'Name',
  'join.nameHint': 'Höchstens 30 Zeichen',
  'join.nameRequired': 'Bitte einen Namen eingeben',
  'join.nameTooLong': 'Der Name darf höchstens 30 Zeichen haben',
  'join.join': 'Beitreten',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export const t = defineMessages(MESSAGES);
