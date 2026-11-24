import { defineConfig, devices } from '@playwright/test';

const backendPort = process.env['BACKEND_PORT'] ?? '8080';
const frontendPort = process.env['FRONTEND_PORT'] ?? '4200';
const gitlabDoublePort = process.env['GITLAB_DOUBLE_PORT'] ?? '8089';
const javaHome = process.env['JAVA_HOME'];
const java = javaHome ? `${javaHome}/bin/java` : 'java';
const gitlabDoubleJar = '../backend/target/gitlab-double/wiremock-standalone.jar';
const react = process.env['E2E_FRONTEND'] === 'react';
const frontendServer = react
  ? `pnpm -C ../frontend-react exec vite --port ${frontendPort} --strictPort`
  : `pnpm exec ng serve --port ${frontendPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  grep: react ? /@react/ : undefined,
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `${java} -jar ${gitlabDoubleJar} --port ${gitlabDoublePort} --bind-address 127.0.0.1 --root-dir e2e/gitlab-double --disable-banner`,
      url: `http://localhost:${gitlabDoublePort}/__admin/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `./mvnw -q -DskipTests package && ${java} -Dquarkus.profile=e2e -Dquarkus.http.port=${backendPort} -Dplanningpoker.gitlab.base-url=http://localhost:${gitlabDoublePort} -jar target/quarkus-app/quarkus-run.jar`,
      cwd: '../backend',
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
    {
      command: frontendServer,
      env: { BACKEND_PORT: backendPort },
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
