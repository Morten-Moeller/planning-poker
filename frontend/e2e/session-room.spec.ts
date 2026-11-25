import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';

interface Room {
  scrumMaster: Page;
  developer: Page;
}

async function openRoom(page: Page, browser: Browser, issue = '42'): Promise<Room> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill(issue);
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const link = (await page.getByTestId('share-link-developer').textContent()) ?? '';

  const developer = await (await browser.newContext()).newPage();
  await developer.goto(link);
  await developer.getByTestId('join-name').fill('Ben');
  await developer.getByTestId('join-submit').click();
  await expect(developer.getByTestId('session-role')).toHaveText('Entwickler');
  return { scrumMaster: page, developer };
}

function participant(page: Page, name: string): Locator {
  return page
    .getByTestId('participant')
    .filter({ has: page.getByTestId('participant-name').getByText(name, { exact: true }) });
}

function result(page: Page, iid: number): Locator {
  return page.getByTestId('issue-result').filter({ hasText: `#${iid} ` });
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test(
  'both roles see the participants with role and connection state',
  { tag: '@react' },
  async ({ page, browser }) => {
    const { scrumMaster, developer } = await openRoom(page, browser);

    for (const view of [scrumMaster, developer]) {
      await expect(view.getByTestId('participant')).toHaveCount(2);
      await expect(participant(view, 'Anna').getByTestId('participant-role')).toHaveText(
        'Scrum Master',
      );
      await expect(participant(view, 'Anna').getByTestId('participant-status')).toHaveText(
        'verbunden',
      );
      await expect(participant(view, 'Ben').getByTestId('participant-role')).toHaveCount(0);
      await expect(participant(view, 'Ben').getByTestId('participant-status')).toHaveText(
        'verbunden',
      );
    }

    await developer.context().close();

    await expect(participant(scrumMaster, 'Ben').getByTestId('participant-status')).toHaveText(
      'getrennt',
    );
  },
);

test('the scrum master releases an issue and the developer sees it without reload', async ({
  page,
  browser,
}) => {
  const { scrumMaster, developer } = await openRoom(page, browser);

  await expect(scrumMaster.getByTestId('issue-panel')).toBeVisible();
  await expect(scrumMaster.getByTestId('issue-result')).toHaveCount(2);
  await expect(scrumMaster.getByTestId('issue-load-more')).toHaveCount(0);
  await expect(scrumMaster.getByTestId('issue-search-input')).toBeVisible();
  await expect(scrumMaster.getByTestId('issue-search-submit')).toBeVisible();
  await expect(result(scrumMaster, 42)).toHaveAttribute('aria-pressed', 'true');
  const preview = scrumMaster.getByTestId('issue-preview');
  await expect(preview.getByTestId('issue-preview-iid')).toHaveText('#42');
  await expect(preview.getByTestId('issue-preview-title')).toHaveText('Login page');
  await expect(preview.getByTestId('issue-preview-link')).toHaveAttribute(
    'href',
    'https://gitlab.example/group/project/-/issues/42',
  );

  await expect(developer.getByTestId('lobby-waiting')).toBeVisible();
  await expect(developer.getByTestId('active-issue')).toHaveCount(0);
  await expect(developer.getByTestId('issue-panel')).toHaveCount(0);
  await expect(developer.getByTestId('issue-release')).toHaveCount(0);

  await result(scrumMaster, 43).click();
  await expect(preview.getByTestId('issue-preview-iid')).toHaveText('#43');
  await expect(preview.getByTestId('issue-preview-title')).toHaveText('Password reset');

  await scrumMaster.getByTestId('issue-release').click();

  await expect(scrumMaster.getByTestId('session-phase')).toHaveText('Diskussion');
  await expect(developer.getByTestId('lobby-waiting')).toHaveCount(0);
  await expect(developer.getByTestId('discussion-hint')).toBeVisible();
  await expect(developer.getByTestId('card-deck')).toHaveCount(0);
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Password reset');
  await expect(developer.getByTestId('active-issue-description')).toContainText(
    'reset my password',
  );
  const link = developer.getByTestId('active-issue-link');
  await expect(link).toHaveAttribute('href', 'https://gitlab.example/group/project/-/issues/43');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
  await expect(developer.getByTestId('issue-panel')).toHaveCount(0);
  await expect(developer.getByTestId('issue-release')).toHaveCount(0);
});

test('switching the issue while voting asks first and can be cancelled', async ({
  page,
  browser,
}) => {
  const { scrumMaster, developer } = await openRoom(page, browser);
  const release = scrumMaster.getByTestId('issue-release');
  await release.click();
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Login page');
  await startVoting(scrumMaster);

  await expect(release).toHaveText('Issue wechseln');
  await expect(release).toBeDisabled();

  await result(scrumMaster, 43).click();
  await expect(release).toBeEnabled();
  await release.click();
  await expect(scrumMaster.getByTestId('switch-dialog')).toBeVisible();
  await scrumMaster.getByTestId('switch-cancel').click();
  await expect(scrumMaster.getByTestId('switch-dialog')).toHaveCount(0);
  await expect(scrumMaster.getByTestId('active-issue-title')).toHaveText('Login page');
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Login page');

  await release.click();
  await scrumMaster.getByTestId('switch-confirm').click();

  await expect(scrumMaster.getByTestId('active-issue-title')).toHaveText('Password reset');
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Password reset');
  await expect(release).toBeDisabled();
});

test(
  'script content of an issue description does not run',
  { tag: '@react' },
  async ({ page, browser }) => {
    const { scrumMaster, developer } = await openRoom(page, browser, '44');
    await expect(scrumMaster.getByTestId('issue-preview-iid')).toHaveText('#44');

    await scrumMaster.getByTestId('issue-release').click();

    for (const view of [scrumMaster, developer]) {
      const description = view.getByTestId('active-issue-description');
      await expect(view.getByTestId('active-issue-title')).toHaveText('Script check');
      await expect(description.locator('strong')).toHaveText('fett');
      await expect(description.locator('script')).toHaveCount(0);
      await expect(description.locator('[onerror]')).toHaveCount(0);
      expect(
        await view.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned),
      ).toBeUndefined();
    }
  },
);

test(
  'an external image of an issue description sends no request to its host',
  { tag: '@react' },
  async ({ page, browser }) => {
    const { scrumMaster, developer } = await openRoom(page, browser, '44');
    const outcomes: string[] = [];
    const isTracker = (url: string) => new URL(url).hostname === 'tracker.example';
    for (const view of [scrumMaster, developer]) {
      view.on('requestfinished', (request) => {
        if (isTracker(request.url())) {
          outcomes.push('sent');
        }
      });
      view.on('requestfailed', (request) => {
        if (isTracker(request.url())) {
          outcomes.push(request.failure()?.errorText ?? 'unknown');
        }
      });
    }

    await scrumMaster.getByTestId('issue-release').click();

    for (const view of [scrumMaster, developer]) {
      await expect(view.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
        'content',
        "img-src 'self' data:",
      );
      const image = view.getByTestId('active-issue-description').locator('img[alt="Pixel"]');
      await expect(image).toHaveAttribute('src', 'https://tracker.example/pixel.gif');
      await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete)).toBe(true);
    }
    await expect.poll(() => outcomes.length).toBe(2);
    expect(outcomes).toEqual(['csp', 'csp']);
  },
);

test(
  'the issue number in the head of the active issue is as large as the title, grey and not bold',
  { tag: '@react' },
  async ({ page, browser }) => {
    const { scrumMaster, developer } = await openRoom(page, browser);
    await scrumMaster.getByTestId('issue-release').click();
    await expect(developer.getByTestId('active-issue-iid')).toHaveText('#42');

    const styles = await developer.getByTestId('active-issue').evaluate((node) => {
      const iid = getComputedStyle(node.querySelector('[data-testid="active-issue-iid"]')!);
      const title = getComputedStyle(node.querySelector('h2')!);
      const probe = document.createElement('span');
      probe.style.color = 'var(--app-on-surface-muted)';
      node.appendChild(probe);
      const muted = getComputedStyle(probe).color;
      probe.remove();
      return {
        iidSize: iid.fontSize,
        titleSize: title.fontSize,
        iidLineHeight: iid.lineHeight,
        titleLineHeight: title.lineHeight,
        iidWeight: iid.fontWeight,
        iidColor: iid.color,
        iidFont: iid.fontFamily,
        muted,
      };
    });
    expect(styles.iidSize).toBe(styles.titleSize);
    expect(styles.iidLineHeight).toBe(styles.titleLineHeight);
    expect(styles.iidWeight).toBe('400');
    expect(styles.iidColor).toBe(styles.muted);
    expect(styles.iidFont).toContain('IBM Plex Mono');
  },
);
