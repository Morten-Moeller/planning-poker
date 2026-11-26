import { Field, FieldLabel } from '@ui-sdk/react/field';
import { Input } from '@ui-sdk/react/input';
import { SegmentedControl, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from '@ui-sdk/react/select';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import type { IssueFilterQuery, SessionView } from '../api/api';
import { useBackend } from '../api/backend';
import { DEFAULT_PREFERENCES } from '../api/preferences-store';
import type { UpdatedPeriod, WeightFilter } from '../api/preferences-store';
import { AppButton } from '../ui/app-button';
import { TextField } from '../ui/text-field';
import { externalUrl } from './external-link';
import select from './filled-select.module.css';
import { createIssueList } from './issue-list';
import styles from './issue-panel.module.css';
import { t } from './messages';
import type { TextKey } from './messages';
import { SwitchIssueDialog } from './switch-issue-dialog';
import type { SwitchIssueData } from './switch-issue-dialog';

interface Option<T extends string> {
  value: T;
  label: TextKey;
  testId: string;
}

const WEIGHTS: readonly Option<WeightFilter>[] = [
  { value: 'NONE', label: 'issuePanel.weightNone', testId: 'issue-filter-weight-none' },
  { value: 'ANY', label: 'issuePanel.weightAny', testId: 'issue-filter-weight-any' },
  { value: 'ALL', label: 'issuePanel.weightAll', testId: 'issue-filter-weight-all' },
];

const PERIODS: readonly Option<UpdatedPeriod>[] = [
  { value: 'WEEK', label: 'issuePanel.periodWeek', testId: 'issue-filter-period-week' },
  { value: 'MONTH', label: 'issuePanel.periodMonth', testId: 'issue-filter-period-month' },
  { value: 'YEAR', label: 'issuePanel.periodYear', testId: 'issue-filter-period-year' },
  { value: 'ALL', label: 'issuePanel.periodAll', testId: 'issue-filter-period-all' },
];

const IID_PREFIX = '#';
const SYMBOL_CHECK = '✓';
const SYMBOL_ERROR = '⚠';
const SYMBOL_RETRY = '↻';

interface Filters {
  weight: WeightFilter;
  period: UpdatedPeriod;
  search: string | undefined;
}

function queryOf({ weight, period, search }: Filters): IssueFilterQuery {
  return search === undefined ? { weight, period } : { search, weight, period };
}

function isOneOf<T extends string>(options: readonly Option<T>[], value: unknown): value is T {
  return options.some((option) => option.value === value);
}

export function IssuePanel({ session }: { session: SessionView }) {
  const { api, errors, preferences } = useBackend();
  const sessionId = session.sessionId;
  const [list] = useState(() => createIssueList(api, errors, sessionId));
  const { items, nextPage, total, loading, failure, loadFailed } = useSyncExternalStore(
    list.subscribe,
    list.state,
  );
  const [filters, setFilters] = useState<Filters>(() => {
    const saved = preferences.read();
    return { weight: saved.weightFilter, period: saved.periodFilter, search: undefined };
  });
  const [searchText, setSearchText] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const phase = session.phase;
  const activeIid = session.activeIssue?.iid ?? null;
  const defaultIid = activeIid ?? session.preselectedIssueIid ?? null;
  const [choice, setChoice] = useState({ base: defaultIid, iid: defaultIid });
  if (choice.base !== defaultIid) {
    setChoice({ base: defaultIid, iid: defaultIid });
  }
  const selectedIid = choice.base === defaultIid ? choice.iid : defaultIid;
  const selected = items.find((issue) => issue.iid === selectedIid) ?? null;
  const selectedUrl = externalUrl(selected?.webUrl);
  const failed = failure !== null;
  const inLobby = phase === 'LOBBY';
  const releaseDisabled =
    releasing ||
    session.round?.confirming === true ||
    selectedIid === null ||
    selectedIid === activeIid;

  const initial = useRef(filters);
  useEffect(() => {
    list.load(queryOf(initial.current));
    return () => list.stop();
  }, [list]);

  const lastPhase = useRef(phase);
  useEffect(() => {
    const previous = lastPhase.current;
    lastPhase.current = phase;
    if (previous === 'REVEALED' && phase === 'LOBBY') {
      list.load(queryOf(filters));
    }
  }, [list, phase, filters]);

  const apply = (next: Filters) => {
    setFilters(next);
    list.load(queryOf(next));
  };

  const changeWeight = (weight: WeightFilter) => {
    preferences.save({ weightFilter: weight });
    apply({ ...filters, weight });
  };

  const changePeriod = (period: UpdatedPeriod) => {
    preferences.save({ periodFilter: period });
    apply({ ...filters, period });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const text = searchText.trim();
    apply({ ...filters, search: text === '' ? undefined : text });
  };

  const resetFilters = () => {
    const { weightFilter, periodFilter } = DEFAULT_PREFERENCES;
    preferences.save({ weightFilter, periodFilter });
    setSearchText('');
    apply({ weight: weightFilter, period: periodFilter, search: undefined });
  };

  const selectIssue = (issueIid: number) => {
    setReleasing(true);
    api
      .selectIssue(sessionId, { issueIid })
      .catch(() => undefined)
      .finally(() => setReleasing(false));
  };

  const release = () => {
    if (selectedIid === null || releaseDisabled) {
      return;
    }
    if (phase === 'LOBBY' || phase === 'DISCUSSION') {
      selectIssue(selectedIid);
      return;
    }
    setDialogOpen(true);
  };

  const closeDialog = (confirmed: boolean) => {
    setDialogOpen(false);
    if (confirmed && selectedIid !== null && !releaseDisabled) {
      selectIssue(selectedIid);
    }
  };

  const switchData: SwitchIssueData = {
    revealed: phase === 'REVEALED',
    roundNumber: session.round?.number ?? 1,
    issueIid: activeIid ?? 0,
    votes: session.participants.filter((participant) => participant.hasVoted).length,
  };

  const periodItems = PERIODS.map((option) => ({ value: option.value, label: t(option.label) }));

  return (
    <section className={styles.panel} data-testid="issue-panel">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('issuePanel.title')}</h2>
        <span className={styles.project} data-testid="issue-panel-project">
          {session.project === null
            ? t('issuePanel.projectId', { id: session.gitlabProjectId })
            : t('issuePanel.project', { name: session.project.name, id: session.project.id })}
        </span>
      </div>

      <form className={styles.search} onSubmit={submitSearch}>
        <div className={styles.searchField}>
          <TextField
            label={t('issuePanel.searchLabel')}
            value={searchText}
            onChange={setSearchText}
            autoComplete="off"
            data-testid="issue-search-input"
            renderInput={({ onChange, ...input }) => (
              <Input {...input} type="search" onValueChange={(next) => onChange(next)} />
            )}
          />
        </div>
        <AppButton
          variant="outlined"
          type="submit"
          data-testid="issue-search-submit"
          disabled={loading}
        >
          {t('issuePanel.searchSubmit')}
        </AppButton>
      </form>

      <div className={styles.filters}>
        <SegmentedControl
          className={styles.weights}
          aria-label={t('issuePanel.weightFilterLabel')}
          data-testid="issue-filter-weight"
          value={filters.weight}
          onValueChange={(next) => {
            if (isOneOf(WEIGHTS, next) && next !== filters.weight) {
              changeWeight(next);
            }
          }}
        >
          {WEIGHTS.map((option) => (
            <SegmentedControlItem
              key={option.value}
              className={styles.weightOption}
              value={option.value}
              data-testid={option.testId}
            >
              <span className={styles.weightCheck} aria-hidden="true">
                {SYMBOL_CHECK}
              </span>
              {t(option.label)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <Field className={select.field}>
          <div className={select.box}>
            <FieldLabel className={select.label}>{t('issuePanel.periodLabel')}</FieldLabel>
            <Select
              items={periodItems}
              value={filters.period}
              onValueChange={(next) => {
                if (isOneOf(PERIODS, next) && next !== filters.period) {
                  changePeriod(next);
                }
              }}
            >
              <SelectTrigger className={select.trigger} data-testid="issue-filter-period">
                <SelectValue className={select.value} />
                <span className={select.arrow} aria-hidden="true" />
              </SelectTrigger>
              <SelectContent className={select.content} align="start" sideOffset={0}>
                {PERIODS.map((option) => (
                  <SelectItem
                    key={option.value}
                    className={select.item}
                    value={option.value}
                    data-testid={option.testId}
                  >
                    {t(option.label)}
                    <SelectItemIndicator className={select.check} aria-hidden="true" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Field>
      </div>

      {failure !== null && (
        <div className={styles.searchError} role="alert" data-testid="issue-results-error">
          <span className={styles.errorMark} aria-hidden="true">
            {SYMBOL_ERROR}
          </span>
          <div className={styles.errorText}>
            <strong>{t('issuePanel.errorTitle')}</strong>
            <span data-testid="issue-results-error-message">{failure}</span>
          </div>
          <AppButton
            variant="outlined"
            tone="on-error"
            data-testid="issue-results-retry"
            disabled={loading}
            onClick={() => list.retry()}
          >
            <span className="app-symbol" aria-hidden="true">
              {SYMBOL_RETRY}
            </span>{' '}
            {t('issuePanel.retry')}
          </AppButton>
        </div>
      )}

      {items.length > 0 && (
        <ul className={styles.results}>
          {items.map((issue) => {
            const chosen = issue.iid === selectedIid;
            return (
              <li key={issue.iid} className={styles.resultRow}>
                <button
                  type="button"
                  className={chosen ? `${styles.result} ${styles.selected}` : styles.result}
                  data-testid="issue-result"
                  aria-pressed={chosen}
                  onClick={() => setChoice({ base: defaultIid, iid: issue.iid })}
                >
                  <span className={styles.check} aria-hidden="true">
                    {chosen ? SYMBOL_CHECK : ''}
                  </span>{' '}
                  <span className={styles.iid}>
                    {IID_PREFIX}
                    {issue.iid}
                  </span>{' '}
                  <span className={styles.resultTitle}>{issue.title}</span>{' '}
                  <span className={styles.weight} data-testid="issue-result-weight">
                    {issue.weight === null
                      ? t('issuePanel.withoutWeight')
                      : t('issuePanel.weightValue', { weight: issue.weight })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length === 0 && !loading && !loadFailed && (
        <div className={styles.empty} role="status">
          <strong data-testid="issue-results-empty">{t('issuePanel.empty')}</strong>
          <AppButton variant="text" data-testid="issue-filter-reset" onClick={resetFilters}>
            {t('issuePanel.resetFilters')}
          </AppButton>
        </div>
      )}

      <div className={styles.footer}>
        {nextPage !== null && !failed && (
          <AppButton
            variant="outlined"
            data-testid="issue-load-more"
            disabled={loading}
            onClick={() => list.loadMore()}
          >
            {t('issuePanel.loadMore')}
          </AppButton>
        )}
        {items.length > 0 && (
          <span className={styles.count} data-testid="issue-count">
            {total === null || total === 0
              ? t('issuePanel.count', { count: items.length })
              : t('issuePanel.countOfTotal', { shown: items.length, total })}
          </span>
        )}
        <span className={styles.spacer} />
        {selectedIid !== null && (
          <span className={styles.selection} data-testid="issue-preview">
            {t('issuePanel.selected')}{' '}
            <strong className={styles.selectionIid} data-testid="issue-preview-iid">
              {IID_PREFIX}
              {selectedIid}
            </strong>{' '}
            {selected !== null && selectedUrl !== null && (
              <a
                className={styles.selectionLink}
                data-testid="issue-preview-link"
                href={selectedUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span data-testid="issue-preview-title">{selected.title}</span>
              </a>
            )}
          </span>
        )}
        <AppButton
          variant="filled"
          data-testid="issue-release"
          disabled={releaseDisabled}
          onClick={release}
        >
          {inLobby ? t('issuePanel.release') : t('issuePanel.switch')}
        </AppButton>
      </div>
      <SwitchIssueDialog open={dialogOpen} data={switchData} onClose={closeDialog} />
    </section>
  );
}
