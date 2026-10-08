import { test as base, Page } from '@playwright/test';
import path from 'path';
import { ENV } from '../utils/env';
import { GmailService } from '../services/GmailService';
import { AuthService } from '../services/AuthService';

type WorkerFixtures = {
  /** ONE browser page shared by every test in the journey (login state carries over). */
  sharedPage: Page;
  gmail: GmailService;
  auth: AuthService;
};

type TestFixtures = {
  /** Attaches a screenshot to the report whenever a test fails. */
  failureScreenshot: void;
};

const VIDEO_DIR = path.resolve(__dirname, '..', 'videos');

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sharedPage: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        baseURL: ENV.baseURL,
        viewport: { width: 1366, height: 768 },
        recordVideo: ENV.recordVideo
          ? { dir: VIDEO_DIR, size: { width: 1366, height: 768 } }
          : undefined,
      });
      const page = await context.newPage();

      await use(page);

      const video = page.video();
      await context.close();
      if (ENV.recordVideo && video) {
        await video.saveAs(path.join(VIDEO_DIR, 'dmoney-e2e-run.webm')).catch(() => undefined);
        await video.delete().catch(() => undefined); // drop the hash-named duplicate
      }
    },
    { scope: 'worker' },
  ],

  gmail: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext();
      await use(new GmailService(request));
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  auth: [
    async ({ sharedPage, gmail }, use) => {
      await use(new AuthService(sharedPage, gmail));
    },
    { scope: 'worker' },
  ],

  failureScreenshot: [
    async ({ sharedPage }, use, testInfo) => {
      await use();
      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach('failure-screenshot', {
          body: await sharedPage.screenshot().catch(() => Buffer.from('')),
          contentType: 'image/png',
        });
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
