import { useMemo, useState } from 'react';
import type { SessionView } from '../api/api';
import styles from './active-issue.module.css';
import { externalUrl } from './external-link';
import { renderMarkdown } from './markdown';
import { t } from './messages';
import { useNarrow } from './use-narrow';

export type IssueView = NonNullable<SessionView['activeIssue']>;

const DESCRIPTION_ID = 'active-issue-description';
const IID_PREFIX = '#';
const SYMBOL_OPEN = '↗';
const SYMBOL_EXPAND = '▾';
const SYMBOL_COLLAPSE = '▴';

export function ActiveIssue({ issue, phase }: { issue: IssueView; phase: SessionView['phase'] }) {
  const narrow = useNarrow();
  const html = useMemo(() => renderMarkdown(issue.description), [issue.description]);
  const view = `${issue.iid}:${phase}`;
  const [expansion, setExpansion] = useState({ view, expanded: false });
  if (expansion.view !== view) {
    setExpansion({ view, expanded: false });
  }
  const url = externalUrl(issue.webUrl);
  const collapsible = issue.description.trim() !== '' && (phase === 'REVEALED' || narrow);
  const collapsed = collapsible && !(expansion.view === view && expansion.expanded);

  return (
    <section className={styles.activeIssue} data-testid="active-issue">
      <div className={styles.head}>
        <span className={styles.iid} data-testid="active-issue-iid">
          {IID_PREFIX}
          {issue.iid}
        </span>
        <h2 className={styles.title} data-testid="active-issue-title">
          {issue.title}
        </h2>
        {url !== null && (
          <a
            className={styles.link}
            data-testid="active-issue-link"
            href={url}
            target="_blank"
            rel="noopener"
          >
            {t('activeIssue.openInGitLab')}{' '}
            <span className="app-symbol" aria-hidden="true">
              {SYMBOL_OPEN}
            </span>
          </a>
        )}
      </div>
      <div className={collapsed ? `${styles.frame} ${styles.collapsed}` : styles.frame}>
        <div
          className={styles.description}
          id={DESCRIPTION_ID}
          data-testid="active-issue-description"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {collapsed && (
        <button
          type="button"
          className={styles.expand}
          data-testid="active-issue-expand"
          aria-controls={DESCRIPTION_ID}
          aria-expanded="false"
          onClick={() => setExpansion({ view, expanded: true })}
        >
          <span className="app-symbol" aria-hidden="true">
            {SYMBOL_EXPAND}
          </span>{' '}
          {t('activeIssue.expand')}
        </button>
      )}
      {collapsible && !collapsed && (
        <button
          type="button"
          className={styles.expand}
          data-testid="active-issue-collapse"
          aria-controls={DESCRIPTION_ID}
          aria-expanded="true"
          onClick={() => setExpansion({ view, expanded: false })}
        >
          <span className="app-symbol" aria-hidden="true">
            {SYMBOL_COLLAPSE}
          </span>{' '}
          {t('activeIssue.collapse')}
        </button>
      )}
    </section>
  );
}
