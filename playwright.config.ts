import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * HTML report folder. The npm scripts set REPORT_DIR so the smoke and the
 * regression runs keep SEPARATE reports (handy for the two README screenshots).
 */
const reportDir = process.env.REPORT_DIR ?? 'playwright-report';

export default defineConfig({
  testDir: './tests',

  /* The journey is one long story: 20 dependent tests sharing one browser page. */
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [['list'], ['html', { outputFolder: reportDir, open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://dmoneyportal.roadtocareer.net',
    // Slow the browser down for the demo video: SLOW_MO=300 npm run test:regression:headed
    launchOptions: {
      slowMo: Number(process.env.SLOW_MO ?? 0),
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
