import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartPage } from './start-page';

describe('StartPage', () => {
  let fixture: ComponentFixture<StartPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(StartPage);
    http = TestBed.inject(HttpTestingController);
    fixture.autoDetectChanges();
  });

  afterEach(() => http.verify());

  function statusText(): string {
    return (
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="health-status"]')
        ?.textContent ?? ''
    ).trim();
  }

  it('shows that the backend is reachable when it answers UP', async () => {
    http.expectOne('/api/health').flush({ status: 'UP' });
    await fixture.whenStable();

    expect(statusText()).toBe('Backend erreichbar');
  });

  it('shows that the backend is unreachable when the request fails', async () => {
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(statusText()).toBe('Backend nicht erreichbar');
  });
});
