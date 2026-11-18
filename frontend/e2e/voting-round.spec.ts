import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';
const CARD_IDS = [
  'card-0',
  'card-1',
  'card-2',
  'card-3',
  'card-5',
  'card-8',
  'card-13',
  'card-21',
  'card-34',
  'card-?',
  'card-COFFEE',
];

interface Snapshot {
  phase: string;
  round: { myVote: string | null; votes: unknown[] | null } | null;
}

interface View {
  page: Page;
  snapshots: Snapshot[];
  chosen: Set<string>;
}

function watch(page: Page): View {
  const view: View = { page, snapshots: [], chosen: new Set() };
  page.on('websocket', (socket) => {
    socket.on('framereceived', ({ payload }) => {
      const message = JSON.parse(payload.toString()) as { type: string; payload?: Snapshot };
      if (message.type === 'session.state' && message.payload !== undefined) {
        view.snapshots.push(message.payload);
      }
    });
  });
  return view;
}

async function createSession(page: Page): Promise<{ scrumMaster: View; link: string }> {
  const scrumMaster = watch(page);
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const link = (await page.getByTestId('share-link').textContent()) ?? '';
  return { scrumMaster, link };
}

async function join(
  browser: Browser,
  link: string,
  name: string,
  viewport?: { width: number; height: number },
): Promise<View> {
  const view = watch(await (await browser.newContext({ viewport })).newPage());
  await view.page.goto(link);
  await view.page.getByTestId('join-name').fill(name);
  await view.page.getByTestId('join-submit').click();
  await expect(view.page.getByTestId('session-role')).toHaveText('Entwickler');
  return view;
}

async function release(scrumMaster: View, developers: View[]): Promise<void> {
  await expect(scrumMaster.page.getByTestId('participant')).toHaveCount(developers.length + 1);
  await scrumMaster.page.getByTestId('issue-release').click();
  await startVoting(scrumMaster.page);
  for (const view of [scrumMaster, ...developers]) {
    await expect(view.page.getByTestId('session-phase')).toHaveText('Runde läuft');
  }
}

function card(view: View, value: string): Locator {
  return view.page.getByTestId('card-deck').getByTestId(`card-${value}`);
}

async function choose(view: View, value: string): Promise<void> {
  view.chosen.add(value);
  await card(view, value).click();
  await expect(card(view, value)).toHaveAttribute('aria-pressed', 'true');
}

function voteStatus(view: View, name: string): Locator {
  return view.page
    .getByTestId('participant')
    .filter({ has: view.page.getByTestId('participant-name').getByText(name, { exact: true }) })
    .getByTestId('participant-vote-status');
}

function expectNoForeignCards(views: View[]): void {
  for (const view of views) {
    const hidden = view.snapshots.filter((snapshot) => snapshot.phase !== 'REVEALED');
    expect(hidden.length).toBeGreaterThan(0);
    for (const snapshot of hidden) {
      expect(snapshot.round?.votes ?? null).toBeNull();
      const myVote = snapshot.round?.myVote ?? null;
      if (myVote !== null) {
        expect([...view.chosen]).toContain(myVote);
      }
    }
  }
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test('a developer chooses and changes a hidden card and the scrum master reveals early', async ({
  page,
  browser,
}) => {
  const { scrumMaster, link } = await createSession(page);
  const ben = await join(browser, link, 'Ben');
  const cem = await join(browser, link, 'Cem');
  await release(scrumMaster, [ben, cem]);

  const cards = ben.page.getByTestId('card-deck').locator('button');
  await expect(cards).toHaveCount(11);
  expect(await cards.evaluateAll((nodes) => nodes.map((node) => node.dataset['testid']))).toEqual(
    CARD_IDS,
  );
  await expect(card(ben, 'COFFEE')).toHaveAccessibleName('Karte Kaffeepause');
  await expect(scrumMaster.page.getByTestId('card-deck')).toHaveCount(0);
  await expect(scrumMaster.page.getByTestId('round-reveal')).toBeVisible();
  for (const developer of [ben, cem]) {
    await expect(developer.page.getByTestId('card-deck')).toBeVisible();
    await expect(developer.page.getByTestId('round-reveal')).toHaveCount(0);
  }

  await choose(ben, '5');
  await choose(ben, '8');
  await expect(cards.and(ben.page.locator('[aria-pressed="true"]'))).toHaveCount(1);
  await expect(card(ben, '5')).toHaveAttribute('aria-pressed', 'false');

  await card(ben, '8').focus();
  await ben.page.keyboard.press('Tab');
  await expect(card(ben, '13')).toBeFocused();
  ben.chosen.add('13');
  await ben.page.keyboard.press('Enter');
  await expect(card(ben, '13')).toHaveAttribute('aria-pressed', 'true');
  await expect(card(ben, '8')).toHaveAttribute('aria-pressed', 'false');
  await ben.page.keyboard.press('Tab');
  await expect(card(ben, '21')).toBeFocused();
  ben.chosen.add('21');
  await ben.page.keyboard.press(' ');
  await expect(card(ben, '21')).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.and(ben.page.locator('[aria-pressed="true"]'))).toHaveCount(1);

  await expect(scrumMaster.page.getByTestId('vote-counter')).toContainText('1 von 2');
  await expect(scrumMaster.page.getByTestId('all-voted-hint')).toHaveCount(0);
  const reveal = scrumMaster.page.getByTestId('round-reveal');
  await expect(reveal).toBeEnabled();
  expectNoForeignCards([scrumMaster, ben, cem]);

  await reveal.click();

  for (const view of [scrumMaster, ben, cem]) {
    await expect(view.page.getByTestId('session-phase')).toHaveText('Runde aufgelöst');
    await expect(view.page.getByTestId('card-deck')).toHaveCount(0);
  }
});

test('the others see the vote status and the counter but never the card', async ({
  page,
  browser,
}) => {
  const { scrumMaster, link } = await createSession(page);
  const ben = await join(browser, link, 'Ben');
  const cem = await join(browser, link, 'Cem');
  await release(scrumMaster, [ben, cem]);

  for (const view of [scrumMaster, ben, cem]) {
    await expect(view.page.getByTestId('vote-counter')).toContainText('0 von 2');
    await expect(voteStatus(view, 'Ben')).toHaveText('Ausstehend');
    await expect(voteStatus(view, 'Cem')).toHaveText('Ausstehend');
    await expect(voteStatus(view, 'Anna')).toHaveCount(0);
  }
  await expect(scrumMaster.page.getByTestId('all-voted-hint')).toHaveCount(0);

  await choose(ben, '5');

  for (const view of [scrumMaster, cem]) {
    await expect(voteStatus(view, 'Ben')).toHaveText('Hat geschätzt');
    await expect(voteStatus(view, 'Cem')).toHaveText('Ausstehend');
    await expect(view.page.getByTestId('vote-counter')).toContainText('1 von 2');
  }
  await expect(scrumMaster.page.getByTestId('all-voted-hint')).toHaveCount(0);

  await choose(cem, 'COFFEE');

  await expect(scrumMaster.page.getByTestId('all-voted-hint')).toBeVisible();
  await expect(scrumMaster.page.getByTestId('all-voted-hint')).toHaveAttribute('role', 'status');
  await expect(scrumMaster.page.getByTestId('vote-counter')).toContainText('2 von 2');
  for (const developer of [ben, cem]) {
    await expect(developer.page.getByTestId('vote-counter')).toContainText('2 von 2');
    await expect(developer.page.getByTestId('all-voted-hint')).toHaveCount(0);
  }
  expectNoForeignCards([scrumMaster, ben, cem]);

  await scrumMaster.page.getByTestId('round-reveal').click();

  for (const view of [scrumMaster, ben, cem]) {
    await expect(view.page.getByTestId('session-phase')).toHaveText('Runde aufgelöst');
    await expect(view.page.getByTestId('card-deck')).toHaveCount(0);
  }
});

test('a disconnected developer without a vote does not block the hint', async ({
  page,
  browser,
}) => {
  const { scrumMaster, link } = await createSession(page);
  const ben = await join(browser, link, 'Ben');
  const cem = await join(browser, link, 'Cem');
  const dan = await join(browser, link, 'Dan');
  await release(scrumMaster, [ben, cem, dan]);

  await choose(ben, '3');
  await choose(cem, '?');

  await expect(scrumMaster.page.getByTestId('vote-counter')).toContainText('2 von 3');
  await expect(scrumMaster.page.getByTestId('all-voted-hint')).toHaveCount(0);

  await dan.page.context().close();

  await expect(scrumMaster.page.getByTestId('vote-counter')).toContainText('2 von 2');
  await expect(scrumMaster.page.getByTestId('all-voted-hint')).toBeVisible();
  expectNoForeignCards([scrumMaster, ben, cem]);
});

function seat(view: View, name: string): Locator {
  return view.page
    .getByTestId('seat-table')
    .getByRole('listitem')
    .filter({ has: view.page.getByText(name, { exact: true }) });
}

test('a developer chooses a card with the keyboard and the table shows it hidden until the reveal', async ({
  page,
  browser,
}) => {
  const { scrumMaster, link } = await createSession(page);
  const ben = await join(browser, link, 'Ben');
  const cem = await join(browser, link, 'Cem');
  await release(scrumMaster, [ben, cem]);

  await expect(seat(scrumMaster, 'Ben').getByTestId('seat-status')).toHaveText('ausstehend');
  await card(ben, '5').focus();
  await ben.page.keyboard.press('ArrowRight');
  await expect(card(ben, '8')).toBeFocused();
  ben.chosen.add('8');
  await ben.page.keyboard.press('Enter');
  await expect(card(ben, '8')).toHaveAttribute('aria-pressed', 'true');

  for (const view of [scrumMaster, cem]) {
    await expect(view.page.getByTestId('seat-table')).toContainText('AM TISCH · VERDECKT');
    await expect(seat(view, 'Ben').getByTestId('seat-status')).toHaveText('✓ geschätzt');
    await expect(seat(view, 'Ben').getByTestId('seat-card')).toHaveAccessibleName('Karte verdeckt');
    await expect(view.page.getByTestId('seat-table')).not.toContainText('8');
  }
  await choose(cem, '13');
  expectNoForeignCards([scrumMaster, ben, cem]);

  await scrumMaster.page.getByTestId('round-reveal').click();

  for (const view of [scrumMaster, ben, cem]) {
    await expect(view.page.getByTestId('session-phase')).toHaveText('Runde aufgelöst');
    await expect(view.page.getByTestId('seat-table')).toContainText('AUFGEDECKT');
    await expect(view.page.getByTestId('result-vote-name')).toHaveText(['Ben', 'Cem']);
    await expect(view.page.getByTestId('result-vote-card')).toHaveText(['8', '13']);
  }
});

test('the card deck is one row of cards of at least 44 px and no horizontal page scrolling at 375 px', async ({
  page,
  browser,
}) => {
  const { scrumMaster, link } = await createSession(page);
  const ben = await join(browser, link, 'Ben', { width: 375, height: 800 });
  await release(scrumMaster, [ben]);

  const group = ben.page.getByTestId('card-deck').getByRole('group', { name: 'Deine Karte' });
  await expect(group).toBeVisible();
  const columns = await group.evaluate(
    (node) => getComputedStyle(node).gridTemplateColumns.split(' ').length,
  );
  expect(columns).toBe(11);
  const boxes = await ben.page
    .getByTestId('card-deck')
    .locator('button')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect));
  expect(boxes).toHaveLength(11);
  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(box.top - boxes[0].top)).toBeLessThanOrEqual(0.5);
  }
  expect(
    await ben.page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('the card deck is at most 1000 px wide, centred and has portrait cards at 1920 px', async ({
  page,
  browser,
}) => {
  const { scrumMaster, link } = await createSession(page);
  const ben = await join(browser, link, 'Ben', { width: 1920, height: 1080 });
  await scrumMaster.page.getByTestId('issue-release').click();

  for (const id of ['card-deck-locked', 'card-deck']) {
    if (id === 'card-deck') {
      await startVoting(scrumMaster.page);
    }
    const deck = ben.page.getByTestId(id);
    await expect(deck).toBeVisible();
    const { deckBox, parentBox } = await deck.evaluate((node) => ({
      deckBox: node.getBoundingClientRect().toJSON() as DOMRect,
      parentBox: (node.parentElement as HTMLElement).getBoundingClientRect().toJSON() as DOMRect,
    }));
    expect(deckBox.width).toBeLessThanOrEqual(1000);
    expect(parentBox.right - parentBox.left).toBeGreaterThan(1000);
    expect(
      Math.abs(deckBox.left - parentBox.left - (parentBox.right - deckBox.right)),
    ).toBeLessThanOrEqual(1);
    const cards = await deck
      .locator('.card')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect),
      );
    expect(cards).toHaveLength(11);
    for (const box of cards) {
      expect(box.height).toBeGreaterThan(box.width);
    }
  }
});

interface SeatBox {
  cardTop: number;
  cardHeight: number;
  nameTop: number;
}

async function seatBoxes(view: View): Promise<SeatBox[]> {
  return view.page
    .getByTestId('seat-table')
    .locator('li')
    .evaluateAll((seats) =>
      seats.map((seat) => {
        const card = seat.querySelector('.card')!.getBoundingClientRect();
        const name = seat.querySelector('.name')!.getBoundingClientRect();
        return { cardTop: card.top, cardHeight: card.height, nameTop: name.top };
      }),
    );
}

function expectAligned(boxes: SeatBox[]): void {
  expect(boxes).toHaveLength(2);
  const [first, second] = boxes;
  expect(Math.abs(first.cardTop - second.cardTop)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(first.cardHeight - second.cardHeight)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(first.nameTop - second.nameTop)).toBeLessThanOrEqual(0.5);
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 375, height: 800 },
]) {
  test(`the seats at the table stay aligned with a developer without a vote at ${viewport.width} px`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize(viewport);
    const { scrumMaster, link } = await createSession(page);
    const ben = await join(browser, link, 'Ben');
    const cem = await join(browser, link, 'Cem');
    await release(scrumMaster, [ben, cem]);
    await choose(ben, '21');

    const table = scrumMaster.page.getByTestId('seat-table');
    await expect(table.getByTestId('seat-status')).toHaveText(['✓ geschätzt', 'ausstehend']);
    await expect(table.getByTestId('seat-card').nth(1)).toHaveText('…');
    expectAligned(await seatBoxes(scrumMaster));

    await scrumMaster.page.getByTestId('round-reveal').click();
    await expect(scrumMaster.page.getByTestId('session-phase')).toHaveText('Runde aufgelöst');
    await expect(table.getByTestId('result-vote-card')).toHaveText('21');
    await expect(table.getByTestId('seat-card')).toHaveText('–');
    await expect(table.getByTestId('seat-status')).toHaveText('nicht geschätzt');
    await table.evaluate((node) =>
      Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)),
    );
    expectAligned(await seatBoxes(scrumMaster));
  });
}
