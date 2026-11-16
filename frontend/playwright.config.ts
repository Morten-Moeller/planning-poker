import { defineConfig, devices } from '@playwright/test';

const backendPort = process.env['BACKEND_PORT'] ?? '8080';
const frontendPort = process.env['FRONTEND_PORT'] ?? '4200';
const javaHome = process.env['JAVA_HOME'];
const java = javaHome ? `${javaHome}/bin/java` : 'java';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `./mvnw -q -DskipTests package && ${java} -Dquarkus.profile=e2e -Dquarkus.http.port=${backendPort} -jar target/quarkus-app/quarkus-run.jar`,
      cwd: '../backend',
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: !process.env['CI'],
      timeout: 300_000,
    },
    {
      command: `pnpm exec ng serve --port ${frontendPort}`,
      env: { BACKEND_PORT: backendPort },
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
  ],
});
