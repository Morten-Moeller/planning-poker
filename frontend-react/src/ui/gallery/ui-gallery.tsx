import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@ui-sdk/react/autocomplete';
import { useState, useSyncExternalStore } from 'react';
import type { ThemeStore } from '../../shell/theme-store';
import { AppButton } from '../app-button';
import type { AppButtonTone, AppButtonVariant } from '../app-button';
import { CardHand } from '../card-hand';
import { ErrorNote } from '../error-note';
import { TextField } from '../text-field';
import styles from './ui-gallery.module.css';

const TEXT = {
  title: 'Bausteine',
  themeDark: 'Dunkles Design',
  themeLight: 'Helles Design',
  buttons: 'Buttons',
  textFields: 'Textfeld',
  cardHands: 'Kartenhand',
  errorNotes: 'Fehlerhinweis',
  noteWithIcon: 'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.',
  noteWithoutIcon: 'Ohne Backend lassen sich keine Sitzungen erstellen oder betreten.',
  action: 'Aktion',
  disabled: 'Gesperrt',
  pending: 'Wartend (3 s)',
  link: 'Link',
  small: 'small',
  large: 'large',
} as const;

const SUGGESTIONS: readonly string[] = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper'];
const SYMBOL_DARK = '☀️';
const SYMBOL_LIGHT = '🌙';
const VARIANTS: readonly AppButtonVariant[] = ['filled', 'outlined', 'text'];
const TONES: readonly AppButtonTone[] = ['default', 'on-error'];
const PENDING_MS = 3000;

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, PENDING_MS));
}

function ButtonRow({ variant, tone }: { variant: AppButtonVariant; tone: AppButtonTone }) {
  const id = `${variant}-${tone}`;
  return (
    <div
      className={tone === 'on-error' ? `${styles.row} ${styles.onError}` : styles.row}
      data-testid={`gallery-buttons-${id}`}
    >
      <span className={styles.caption}>{id}</span>
      <AppButton variant={variant} tone={tone} data-testid={`gallery-button-${id}`}>
        {TEXT.action}
      </AppButton>
      <AppButton
        variant={variant}
        tone={tone}
        disabled
        data-testid={`gallery-button-${id}-disabled`}
      >
        {TEXT.disabled}
      </AppButton>
      <AppButton
        variant={variant}
        tone={tone}
        onClick={wait}
        data-testid={`gallery-button-${id}-pending`}
      >
        {TEXT.pending}
      </AppButton>
      <AppButton
        variant={variant}
        tone={tone}
        data-testid={`gallery-button-${id}-link`}
        render={(props) => (
          <a {...props} href="#ui-gallery">
            {props.children}
          </a>
        )}
      >
        {TEXT.link}
      </AppButton>
    </div>
  );
}

function TextFields() {
  const [empty, setEmpty] = useState('');
  const [filled, setFilled] = useState('Ada Lovelace');
  const [withHint, setWithHint] = useState('');
  const [withError, setWithError] = useState('');
  const [disabled, setDisabled] = useState('Ada Lovelace');
  const [ownInput, setOwnInput] = useState('');

  return (
    <div className={styles.fields}>
      <TextField label="Leer" value={empty} onChange={setEmpty} data-testid="gallery-field-empty" />
      <TextField
        label="Gefüllt"
        value={filled}
        onChange={setFilled}
        data-testid="gallery-field-filled"
      />
      <TextField
        label="Mit Hinweis"
        hint="So sehen dich die anderen in der Sitzung."
        value={withHint}
        onChange={setWithHint}
        data-testid="gallery-field-hint"
      />
      <TextField
        label="Mit Fehler"
        hint="So sehen dich die anderen in der Sitzung."
        error="Bitte einen Namen eingeben."
        value={withError}
        onChange={setWithError}
        data-testid="gallery-field-error"
        errorTestId="gallery-field-error-text"
      />
      <TextField
        label="Gesperrt"
        hint="Das Feld nimmt keine Eingabe an."
        value={disabled}
        onChange={setDisabled}
        disabled
        data-testid="gallery-field-disabled"
      />
      <TextField
        label="Eigene Eingabe (Autocomplete)"
        hint="Das Feature ersetzt die Eingabe über renderInput."
        value={ownInput}
        onChange={setOwnInput}
        data-testid="gallery-field-own-input"
        renderInput={(input) => (
          <Autocomplete value={input.value} onValueChange={(next) => input.onChange(next)}>
            <AutocompleteInput className={input.className} data-testid={input['data-testid']} />
            <AutocompleteContent className={styles.suggestions}>
              <AutocompleteList>
                {SUGGESTIONS.map((suggestion) => (
                  <AutocompleteItem
                    key={suggestion}
                    className={styles.suggestion}
                    value={suggestion}
                  >
                    {suggestion}
                  </AutocompleteItem>
                ))}
              </AutocompleteList>
            </AutocompleteContent>
          </Autocomplete>
        )}
      />
    </div>
  );
}

export function UiGallery({ theme }: { theme: ThemeStore }) {
  const dark = useSyncExternalStore(theme.subscribe, theme.dark);

  return (
    <main className={styles.gallery} id="ui-gallery" data-testid="ui-gallery">
      <header className={styles.head}>
        <h1 className={styles.title}>{TEXT.title}</h1>
        <AppButton variant="outlined" data-testid="theme-toggle" onClick={() => theme.toggle()}>
          <span className="app-symbol" aria-hidden="true">
            {dark ? SYMBOL_DARK : SYMBOL_LIGHT}
          </span>
          {dark ? TEXT.themeLight : TEXT.themeDark}
        </AppButton>
      </header>
      <section className={styles.section}>
        <h2 className={styles.heading}>{TEXT.buttons}</h2>
        {TONES.map((tone) =>
          VARIANTS.map((variant) => (
            <ButtonRow key={`${variant}-${tone}`} variant={variant} tone={tone} />
          )),
        )}
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>{TEXT.textFields}</h2>
        <TextFields />
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>{TEXT.errorNotes}</h2>
        <div className={styles.fields}>
          <ErrorNote data-testid="gallery-note-icon">
            <span>{TEXT.noteWithIcon}</span>
          </ErrorNote>
          <ErrorNote icon={false} data-testid="gallery-note-plain">
            <span>{TEXT.noteWithoutIcon}</span>
          </ErrorNote>
        </div>
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>{TEXT.cardHands}</h2>
        <div className={styles.hands}>
          <div className={styles.hand}>
            <CardHand />
            <span className={styles.caption}>{TEXT.small}</span>
          </div>
          <div className={styles.hand}>
            <CardHand size="large" />
            <span className={styles.caption}>{TEXT.large}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
