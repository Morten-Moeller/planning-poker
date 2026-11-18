import { routes } from './app.routes';
import { sessionGuard } from './api/session.guard';
import { JoinPage } from './join/join-page';
import { SessionPage } from './session/session-page';
import { StartPage } from './start/start-page';

function route(path: string) {
  const found = routes.find((entry) => entry.path === path);
  if (!found) {
    throw new Error(`no route ${path}`);
  }
  return found;
}

describe('routes', () => {
  it('keeps the start page in the initial bundle', () => {
    expect(route('').component).toBe(StartPage);
  });

  it.each([
    ['session/:id/join', JoinPage],
    ['session/:id', SessionPage],
  ])('loads %s lazily', async (path, page) => {
    const entry = route(path);
    expect(entry.component).toBeUndefined();
    expect(await entry.loadComponent!()).toBe(page);
  });

  it('protects the room with the session guard', () => {
    expect(route('session/:id').canActivate).toEqual([sessionGuard]);
  });
});
